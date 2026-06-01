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

// Maps each container type to the structural node types it may DIRECTLY contain.
// Absent types are leaf nodes (paragraph, heading) that hold only inline content.
// Should be moved to a configuration or guidelines later.
const STRUCTURAL_CHILDREN: Record<string, string[]> = {
  doc: ['paragraph', 'heading', 'table', 'bulletList', 'orderedList'],
  table: ['tableRow'],
  tableRow: ['tableHeader', 'tableCell'],
  tableCell: ['paragraph', 'heading'],
  tableHeader: ['paragraph', 'heading'],
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  listItem: ['paragraph', 'heading', 'bulletList', 'orderedList'],
} as const;

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

  // Returns the immediate structural children of the given parent range whose types
  // are explicitly allowed by STRUCTURAL_CHILDREN for this parent type.
  // Type-aware filtering avoids co-equal-range ambiguity (e.g. tableCell and paragraph
  // sharing identical startIndex/endIndex at different nesting levels).
  private findDirectChildren(
    parentType: string,
    startIndex: number,
    endIndex: number,
    allStructural: NodeStatusObject<AnnotationNode>[],
  ): NodeStatusObject<AnnotationNode>[] {
    const allowedTypes = STRUCTURAL_CHILDREN[parentType] ?? [];
    if (allowedTypes.length === 0) return [];

    const candidates = allStructural.filter(
      a =>
        allowedTypes.includes(a.node.data.type) &&
        a.node.data.startIndex >= startIndex &&
        a.node.data.endIndex <= endIndex,
    );

    return candidates
      .filter(
        child =>
          !candidates.some(
            b =>
              b.node.data.uuid !== child.node.data.uuid &&
              b.node.data.startIndex <= child.node.data.startIndex &&
              b.node.data.endIndex >= child.node.data.endIndex,
          ),
      )
      .sort((a, b) => a.node.data.startIndex - b.node.data.startIndex);
  }

  private createTextNode(startIndex: number, endIndex: number): TiptapNode[] {
    const text: string = this.standoffJson.text.slice(startIndex, endIndex + 1);

    return text ? [{ type: 'text', text }] : [];
  }

  /**
   * Builds the inline content of a leaf structural node, interleaving text with
   * zero-point atom nodes and hard breaks, all sorted by position.
   *
   * @param {number} startIndex
   * @param {number} endIndex
   * @returns {TipTapNode[]}
   */
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
          attrs: { uuid: a.node.data.uuid, annotationData: a.node, type: a.node.data.type },
        },
      }));

    const hardBreakEntries: InlineEntry[] = [...this.structuralAnnotations.values()]
      .filter(a => a.node.data.type === 'hardBreak' && inRange(a))
      .map(a => ({
        pos: a.node.data.startIndex,
        node: { type: 'hardBreak', attrs: { uuid: a.node.data.uuid, type: a.node.data.type } },
      }));

    const inlineNodes = [...zeroPointEntries, ...hardBreakEntries].sort((a, b) => a.pos - b.pos);

    if (inlineNodes.length === 0) {
      return this.createTextNode(startIndex, endIndex);
    }

    const nodes: TiptapNode[] = [];
    let cursor = startIndex;

    for (const { pos, node } of inlineNodes) {
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

  private hasText(startIndex: number, endIndex: number): boolean {
    return this.standoffJson.text.slice(startIndex, endIndex + 1).trim().length > 0;
  }

  private syntheticParagraph(
    startIndex: number,
    endIndex: number,
    content: TiptapNode[],
  ): TiptapNode {
    // TODO: Should the annotation also be added to the annotations map?
    return {
      type: 'paragraph',
      attrs: {
        type: 'paragraph',
        uuid: crypto.randomUUID(),
        startIndex,
        endIndex,
      },
      content,
    };
  }

  private buildStructuralNode(
    annotation: NodeStatusObject<AnnotationNode>,
    allStructural: NodeStatusObject<AnnotationNode>[],
  ): TiptapNode {
    const { startIndex, endIndex } = annotation.node.data;
    const allowedChildTypes: string[] = STRUCTURAL_CHILDREN[annotation.node.data.type] ?? [];

    if (allowedChildTypes.length === 0) {
      return {
        type: annotation.node.data.type,
        attrs: { ...annotation.node.data },
        content: this.createLeafContent(startIndex, endIndex),
      };
    }

    const directChildren = this.findDirectChildren(
      annotation.node.data.type,
      startIndex,
      endIndex,
      allStructural,
    );

    const content: TiptapNode[] = [];
    let cursor: number = startIndex;

    for (const child of directChildren) {
      const gapEnd: number = child.node.data.startIndex - 1;

      // Close gaps (un-annotated slices) by adding synthetic paragraph nodes.
      if (cursor <= gapEnd && this.hasText(cursor, gapEnd)) {
        content.push(
          this.syntheticParagraph(cursor, gapEnd, this.createLeafContent(cursor, gapEnd)),
        );
      }

      content.push(this.buildStructuralNode(child, allStructural));

      cursor = child.node.data.endIndex + 1;
    }

    if (cursor <= endIndex && this.hasText(cursor, endIndex)) {
      content.push(
        this.syntheticParagraph(cursor, endIndex, this.createLeafContent(cursor, endIndex)),
      );
    }

    // Tiptap requires container nodes to have at least one block child
    if (content.length === 0) {
      content.push(this.syntheticParagraph(startIndex, endIndex, []));
    }

    return {
      type: annotation.node.data.type,
      attrs: { ...annotation.node.data },
      content,
    };
  }

  private findTopLevelAnnotations(
    annotations: NodeStatusObject<AnnotationNode>[],
  ): NodeStatusObject<AnnotationNode>[] {
    const topLevelAnnos: NodeStatusObject<AnnotationNode>[] = annotations
      .filter(
        a =>
          !annotations.some(
            b =>
              b.node.data.uuid !== a.node.data.uuid &&
              b.node.data.startIndex <= a.node.data.startIndex &&
              b.node.data.endIndex >= a.node.data.endIndex,
          ),
      )
      .sort((a, b) => a.node.data.startIndex - b.node.data.startIndex);

    return topLevelAnnos;
  }

  public convertStandoffToTipTap(): void {
    this.createAnnotationUuidMaps();

    const allStructural: NodeStatusObject<AnnotationNode>[] = [
      ...this.structuralAnnotations.values(),
    ];

    // Top-level annotations: not contained by any other structural annotation
    const topLevelAnnos: NodeStatusObject<AnnotationNode>[] =
      this.findTopLevelAnnotations(allStructural);

    const docContent: TiptapNode[] = [];
    let cursor = 0;

    for (const node of topLevelAnnos) {
      const gapEnd: number = node.node.data.startIndex - 1;

      // Close gaps (un-annotated slices) by adding synthetic paragraph nodes.
      if (cursor <= gapEnd && this.hasText(cursor, gapEnd)) {
        docContent.push(
          this.syntheticParagraph(cursor, gapEnd, this.createLeafContent(cursor, gapEnd)),
        );
      }

      docContent.push(this.buildStructuralNode(node, allStructural));

      cursor = node.node.data.endIndex + 1;
    }

    const textEnd: number = this.standoffJson.text.length - 1;

    // If text remains after the last structural annotation has closed
    if (cursor <= textEnd && this.hasText(cursor, textEnd)) {
      docContent.push(
        this.syntheticParagraph(cursor, textEnd, this.createLeafContent(cursor, textEnd)),
      );
    }

    this.tiptapJson = { type: 'doc', content: docContent };
  }
}
