import { AnnotationData, ApiJson, TiptapNode, TiptapJson } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';

const { structuralAnnotationConfigs, isZeroPoint } = useGuidelinesStore();

export default class StandoffConverter {
  private annotations: Map<string, AnnotationData> = new Map();
  private structuralAnnotations: Map<string, AnnotationData> = new Map();
  private standoffJson: ApiJson;
  private tiptapJson: TiptapJson | null = null;
  private structuralAnnotationTypes: Set<string>;

  constructor(newStandoffJson: ApiJson) {
    this.standoffJson = newStandoffJson;
    this.structuralAnnotationTypes = new Set(structuralAnnotationConfigs.map(c => c.type));
    this.convertStandoffToTipTap();
  }

  public getData(): {
    annotations: Map<string, AnnotationData>;
    structuralAnnotations: Map<string, AnnotationData>;
    tipTapJson: TiptapJson;
  } {
    return {
      annotations: this.annotations,
      structuralAnnotations: this.structuralAnnotations,
      tipTapJson: this.tiptapJson as TiptapJson,
    };
  }

  private createAnnotationUuidMaps(): void {
    for (const a of this.standoffJson.annotations) {
      if (this.structuralAnnotationTypes.has(a.properties.type)) {
        this.structuralAnnotations.set(a.properties.uuid, a);
      } else {
        this.annotations.set(a.properties.uuid, a);
      }
    }
  }

  // Returns the immediate structural children of `annotation` within `allStructural`.
  // Hard breaks are excluded — they are inline nodes handled in createLeafContent.
  private findDirectChildren(
    annotation: AnnotationData,
    allStructural: AnnotationData[],
  ): AnnotationData[] {
    const { uuid, startIndex, endIndex } = annotation.properties;

    const contained = allStructural.filter(
      a =>
        a.properties.uuid !== uuid &&
        a.properties.type !== 'hardBreak' &&
        a.properties.startIndex >= startIndex &&
        a.properties.endIndex <= endIndex,
    );

    return contained
      .filter(
        child =>
          !contained.some(
            b =>
              b.properties.uuid !== child.properties.uuid &&
              b.properties.startIndex <= child.properties.startIndex &&
              b.properties.endIndex >= child.properties.endIndex,
          ),
      )
      .sort((a, b) => a.properties.startIndex - b.properties.startIndex);
  }

  private createTextNode(startIndex: number, endIndex: number): TiptapNode[] {
    const text = this.standoffJson.text.slice(startIndex, endIndex + 1);
    return text ? [{ type: 'text', text }] : [];
  }

  // Builds the inline content of a leaf structural node, interleaving text with
  // zero-point atom nodes and hard breaks, all sorted by position.
  private createLeafContent(startIndex: number, endIndex: number): TiptapNode[] {
    type InlineEntry = { pos: number; node: TiptapNode };

    const inRange = (a: AnnotationData) =>
      a.properties.startIndex >= startIndex && a.properties.startIndex <= endIndex;

    const zeroPointEntries: InlineEntry[] = [...this.annotations.values()]
      .filter(a => isZeroPoint(a) && inRange(a))
      .map(a => ({
        pos: a.properties.startIndex,
        node: {
          type: 'zeroPointAnnotation',
          attrs: { uuid: a.properties.uuid, annotationData: a },
        },
      }));

    const hardBreakEntries: InlineEntry[] = [...this.structuralAnnotations.values()]
      .filter(a => a.properties.type === 'hardBreak' && inRange(a))
      .map(a => ({
        pos: a.properties.startIndex,
        node: { type: 'hardBreak', attrs: { uuid: a.properties.uuid } },
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
    annotation: AnnotationData,
    allStructural: AnnotationData[],
  ): TiptapNode {
    const directChildren = this.findDirectChildren(annotation, allStructural);
    const { startIndex, endIndex } = annotation.properties;

    const content: TiptapNode[] =
      directChildren.length === 0
        ? this.createLeafContent(startIndex, endIndex)
        : directChildren.map(child => this.buildStructuralNode(child, allStructural));

    return {
      type: annotation.properties.type,
      // Spread all annotation properties so the save path can reconstruct them from node.attrs
      attrs: {
        ...annotation.properties,
        annotationType: annotation.properties.type,
      },
      content,
    };
  }

  public convertStandoffToTipTap(): void {
    this.createAnnotationUuidMaps();

    const allStructural: AnnotationData[] = [...this.structuralAnnotations.values()];

    // Root annotations: not contained by any other structural annotation
    const roots: AnnotationData[] = allStructural
      .filter(
        a =>
          !allStructural.some(
            b =>
              b.properties.uuid !== a.properties.uuid &&
              b.properties.startIndex <= a.properties.startIndex &&
              b.properties.endIndex >= a.properties.endIndex,
          ),
      )
      .sort((a, b) => a.properties.startIndex - b.properties.startIndex);

    this.tiptapJson = {
      type: 'doc',
      content: roots.map(root => this.buildStructuralNode(root, allStructural)),
    };
  }
}
