import {
  ApiJson,
  TiptapNode,
  TiptapJson,
  NodeDto,
  NodeStatusObject,
  AnnotationNode,
} from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';

const { structuralAnnotationConfigs, isZeroPoint } = useGuidelinesStore();

export default class StandoffConverter {
  private annotations: Map<string, NodeStatusObject<AnnotationNode>> = new Map();
  private structuralAnnotations: Map<string, NodeStatusObject<AnnotationNode>> = new Map();
  private standoffJson: ApiJson;
  private tiptapJson: TiptapJson | null = null;
  private structuralAnnotationTypes: Set<string>;

  constructor(newStandoffJson: ApiJson) {
    this.standoffJson = newStandoffJson;
    this.structuralAnnotationTypes = new Set(structuralAnnotationConfigs.map(c => c.type));
    this.convertStandoffToTipTap();
  }

  public getData(): {
    annotations: Map<string, NodeStatusObject<AnnotationNode>>;
    structuralAnnotations: Map<string, NodeStatusObject<AnnotationNode>>;
    tipTapJson: TiptapJson;
  } {
    return {
      annotations: this.annotations,
      structuralAnnotations: this.structuralAnnotations,
      tipTapJson: this.tiptapJson as TiptapJson,
    };
  }

  private createNodeStatusObjectFromRawData(rawNode: NodeDto): NodeStatusObject<AnnotationNode> {
    return {
      node: rawNode.node as AnnotationNode,
      connectedNodes: rawNode.connectedNodes.map(n => this.createNodeStatusObjectFromRawData(n)),
      meta: {
        status: 'unchanged',
      },
    };
  }

  private createAnnotationUuidMaps(): void {
    const annotationStatusObjects: NodeStatusObject<AnnotationNode>[] =
      this.standoffJson.annotations.map(a => this.createNodeStatusObjectFromRawData(a));

    for (const a of annotationStatusObjects) {
      if (this.structuralAnnotationTypes.has(a.node.data.type)) {
        this.structuralAnnotations.set(a.node.data.uuid, a);
      } else {
        this.annotations.set(a.node.data.uuid, a);
      }
    }
  }

  // Returns the immediate structural children of `annotation` within `allStructural`.
  // Hard breaks are excluded — they are inline nodes handled in createLeafContent.
  private findDirectChildren(
    annotation: NodeStatusObject<AnnotationNode>,
    allStructural: NodeStatusObject<AnnotationNode>[],
  ): NodeStatusObject<AnnotationNode>[] {
    const { uuid, startIndex, endIndex } = annotation.node.data;

    const contained = allStructural.filter(
      a =>
        a.node.data.uuid !== uuid &&
        a.node.data.type !== 'hardBreak' &&
        a.node.data.startIndex >= startIndex &&
        a.node.data.endIndex <= endIndex,
    );

    return contained
      .filter(
        child =>
          !contained.some(
            b =>
              b.node.data.uuid !== child.node.data.uuid &&
              b.node.data.startIndex <= child.node.data.startIndex &&
              b.node.data.endIndex >= child.node.data.endIndex,
          ),
      )
      .sort((a, b) => a.node.data.startIndex - b.node.data.startIndex);
  }

  private createTextNode(startIndex: number, endIndex: number): TiptapNode[] {
    const text = this.standoffJson.text.slice(startIndex, endIndex + 1);
    return text ? [{ type: 'text', text }] : [];
  }

  // Builds the inline content of a leaf structural node, interleaving text with
  // zero-point atom nodes and hard breaks, all sorted by position.
  private createLeafContent(startIndex: number, endIndex: number): TiptapNode[] {
    type InlineEntry = { pos: number; node: TiptapNode };

    const inRange = (a: NodeStatusObject<AnnotationNode>) =>
      a.node.data.startIndex >= startIndex && a.node.data.startIndex <= endIndex;

    const zeroPointEntries: InlineEntry[] = [...this.annotations.values()]
      .filter(a => isZeroPoint(a.node) && inRange(a))
      .map(a => ({
        pos: a.node.data.startIndex,
        node: {
          type: 'zeroPointAnnotation',
          attrs: { uuid: a.node.data.uuid, annotationData: a.node },
        },
      }));

    const hardBreakEntries: InlineEntry[] = [...this.structuralAnnotations.values()]
      .filter(a => a.node.data.type === 'hardBreak' && inRange(a))
      .map(a => ({
        pos: a.node.data.startIndex,
        node: { type: 'hardBreak', attrs: { uuid: a.node.data.uuid } },
      }));

    const inlineNodes = [...zeroPointEntries, ...hardBreakEntries].sort((a, b) => a.pos - b.pos);

    if (inlineNodes.length === 0) {
      return this.createTextNode(startIndex, endIndex);
    }

    const nodes: TiptapNode[] = [];
    let cursor = startIndex;

    for (const { pos, node } of inlineNodes) {
      // Text up to and including the character at pos (inline node sits after this character)
      if (cursor <= pos) {
        nodes.push(...this.createTextNode(cursor, pos));
      }
      nodes.push(node);
      cursor = pos + 1;
    }

    if (cursor <= endIndex) {
      nodes.push(...this.createTextNode(cursor, endIndex));
    }

    return nodes;
  }

  private buildStructuralNode(
    annotation: NodeStatusObject<AnnotationNode>,
    allStructural: NodeStatusObject<AnnotationNode>[],
  ): TiptapNode {
    const directChildren = this.findDirectChildren(annotation, allStructural);
    const { startIndex, endIndex } = annotation.node.data;

    const content: TiptapNode[] =
      directChildren.length === 0
        ? this.createLeafContent(startIndex, endIndex)
        : directChildren.map(child => this.buildStructuralNode(child, allStructural));

    return {
      type: annotation.node.data.type,
      // Spread all annotation properties so the save path can reconstruct them from node.attrs
      attrs: {
        ...annotation.node.data,
        annotationType: annotation.node.data.type,
      },
      content,
    };
  }

  public convertStandoffToTipTap(): void {
    this.createAnnotationUuidMaps();

    const allStructural: NodeStatusObject<AnnotationNode>[] = [
      ...this.structuralAnnotations.values(),
    ];

    // Root annotations: not contained by any other structural annotation
    const roots: NodeStatusObject<AnnotationNode>[] = allStructural
      .filter(
        a =>
          !allStructural.some(
            b =>
              b.node.data.uuid !== a.node.data.uuid &&
              b.node.data.startIndex <= a.node.data.startIndex &&
              b.node.data.endIndex >= a.node.data.endIndex,
          ),
      )
      .sort((a, b) => a.node.data.startIndex - b.node.data.startIndex);

    this.tiptapJson = {
      type: 'doc',
      content: roots.map(root => this.buildStructuralNode(root, allStructural)),
    };
  }
}
