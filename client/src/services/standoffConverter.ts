import {
  ApiJson,
  TiptapNode,
  TiptapJson,
  NodeDto,
  NodeStatusObject,
  AnnotationNode,
} from '../models/types';
import { useGuidelinesStore, BUILTIN_STRUCTURAL_TYPES_SET } from '../store/guidelines';

const { getStructuralAnnotationConfigs, structuralChildrenMap, isZeroPoint } = useGuidelinesStore();

export default class StandoffConverter {
  private annotations: Map<string, NodeStatusObject<AnnotationNode>> = new Map();
  private structuralAnnotations: Map<string, NodeStatusObject<AnnotationNode>> = new Map();
  private standoffJson: ApiJson;
  private tiptapJson: TiptapJson | null = null;
  private structuralAnnotationTypes: Set<string>;
  // Tracks which annotation UUIDs have already been claimed as direct children at some level
  // of the tree. Once claimed, an annotation cannot be re-claimed at a different level.
  private usedUuids: Set<string> = new Set();

  constructor(newStandoffJson: ApiJson) {
    this.standoffJson = newStandoffJson;
    // Build the set of structural types from the merged config (built-ins + project-defined).
    this.structuralAnnotationTypes = new Set(getStructuralAnnotationConfigs().map(c => c.type));
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

  // Leaf text blocks that are implicitly allowed inside any container (i.e. any type that has
  // a non-empty "contains" list), without needing to be listed explicitly in that list.
  // This prevents users from having to add "paragraph" to every custom block's contains array.
  private static readonly IMPLICIT_LEAF_TYPES = new Set(['paragraph', 'heading', 'hardBreak']);

  private isContainer(type: string): boolean {
    return (structuralChildrenMap.value[type] ?? []).length > 0;
  }

  // Returns the immediate structural children of the given parent range.
  //
  // Candidate selection:
  //   - Must be an allowed type (explicit contains list + implicit leaf types)
  //   - Must not already be claimed at another level (usedUuids)
  //
  // Direct-child resolution for co-equal indices (the hard case):
  //   1. Implicit leaf types (paragraph, heading, hardBreak) are suppressed whenever an
  //      explicit candidate covers the same range — they are assumed to be inside that
  //      explicit container, not a sibling.
  //   2. Among explicit candidates, a candidate is not direct if another candidate
  //      explicitly lists it in its own "contains" (making it a grandchild).
  //   3. Strict index containment (one candidate wraps another) is always unambiguous.
  private findDirectChildren(
    parentType: string,
    startIndex: number,
    endIndex: number,
    allStructural: NodeStatusObject<AnnotationNode>[],
  ): NodeStatusObject<AnnotationNode>[] {
    const explicitTypes: string[] = structuralChildrenMap.value[parentType] ?? [];
    if (explicitTypes.length === 0) return [];

    const allowedTypes = new Set([...explicitTypes, ...StandoffConverter.IMPLICIT_LEAF_TYPES]);

    // Exclude already-claimed annotations so each annotation ends up at exactly one level.
    const candidates = allStructural.filter(
      a =>
        !this.usedUuids.has(a.node.data.uuid) &&
        allowedTypes.has(a.node.data.type) &&
        a.node.data.startIndex >= startIndex &&
        a.node.data.endIndex <= endIndex,
    );

    if (candidates.length === 0) return [];

    // Which candidate types are explicit (listed in parentType.contains)?
    const explicitCandidateTypes = new Set(
      candidates.filter(c => explicitTypes.includes(c.node.data.type)).map(c => c.node.data.type),
    );

    const filtered = candidates
      .filter(child => {
        // Rule 1: implicit leaf suppression.
        // If any explicit candidate covers the same range, the implicit leaf is a descendant
        // of that explicit node — not a direct child of the current parent.
        if (StandoffConverter.IMPLICIT_LEAF_TYPES.has(child.node.data.type)) {
          const coveredByExplicit = candidates.some(
            b =>
              b.node.data.uuid !== child.node.data.uuid &&
              explicitCandidateTypes.has(b.node.data.type) &&
              b.node.data.startIndex <= child.node.data.startIndex &&
              b.node.data.endIndex >= child.node.data.endIndex,
          );
          if (coveredByExplicit) return false;
        }

        // Rule 2 & 3: keep only annotations that are not "inside" another candidate,
        // either by strict index wrapping or by explicit type-hierarchy containment.
        return !candidates.some(
          b =>
            b.node.data.uuid !== child.node.data.uuid &&
            b.node.data.startIndex <= child.node.data.startIndex &&
            b.node.data.endIndex >= child.node.data.endIndex &&
            (b.node.data.startIndex < child.node.data.startIndex ||
              b.node.data.endIndex > child.node.data.endIndex ||
              (structuralChildrenMap.value[b.node.data.type] ?? []).includes(child.node.data.type)),
        );
      })
      .sort((a, b) => a.node.data.startIndex - b.node.data.startIndex);

    console.log(parentType, filtered);

    return filtered;
  }

  private createTextNode(startIndex: number, endIndex: number): TiptapNode[] {
    const text: string = this.standoffJson.text.slice(startIndex, endIndex + 1);

    return text ? [{ type: 'text', text }] : [];
  }

  /**
   * Builds the inline content of a leaf structural node, interleaving text with
   * zero-point atom nodes and hard breaks, all sorted by position.
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
        node: {
          type: 'hardBreak',
          attrs: {
            uuid: a.node.data.uuid,
            _type: a.node.data.type,
            _annotationData: { ...a.node.data },
          },
        },
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
    const uuid = crypto.randomUUID();
    return {
      type: 'paragraph',
      attrs: {
        uuid,
        _annotationData: { type: 'paragraph', uuid, startIndex, endIndex },
        _type: 'paragraph',
      },
      content,
    };
  }

  private buildStructuralNode(
    annotation: NodeStatusObject<AnnotationNode>,
    allStructural: NodeStatusObject<AnnotationNode>[],
  ): TiptapNode {
    const { startIndex, endIndex, type } = annotation.node.data;

    // Determine tiptap node type: use native type for built-ins, 'customBlock' for all others.
    const tiptapType: string = BUILTIN_STRUCTURAL_TYPES_SET.has(type) ? type : 'customBlock';

    // Build attrs: uuid at top level (for UniqueID extension) + all neo4j data in _annotationData.
    const attrs: Record<string, any> = {
      uuid: annotation.node.data.uuid,
      _annotationData: { ...annotation.node.data },
      _type: annotation.node.data.type,
    };

    // Propagate tiptap-native attrs that the native extensions require directly on the node.
    if (type === 'heading') {
      attrs.level = annotation.node.data.level ?? 1;
    }
    if (type === 'tableCell' || type === 'tableHeader') {
      attrs.colspan = annotation.node.data.colspan ?? 1;
      attrs.rowspan = annotation.node.data.rowspan ?? 1;
    }

    const allowedChildTypes: string[] = structuralChildrenMap.value[type] ?? [];

    if (allowedChildTypes.length === 0) {
      return {
        type: tiptapType,
        attrs,
        content: this.createLeafContent(startIndex, endIndex),
      };
    }

    const directChildren = this.findDirectChildren(type, startIndex, endIndex, allStructural);
    directChildren.forEach(c => this.usedUuids.add(c.node.data.uuid));

    const content: TiptapNode[] = [];
    let cursor: number = startIndex;

    for (const child of directChildren) {
      const gapEnd: number = child.node.data.startIndex - 1;

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

    // Tiptap requires container nodes to have at least one block child.
    if (content.length === 0) {
      content.push(this.syntheticParagraph(startIndex, endIndex, []));
    }

    return {
      type: tiptapType,
      attrs,
      content,
    };
  }

  // Finds top-level structural annotations — those not contained by any other structural
  // annotation that recognises this annotation's type as a child.
  //
  // Two containment criteria are checked:
  //   1. Explicit: a.type is listed in b.contains (via structuralChildrenMap).
  //   2. Implicit: b is a container (has any contains entries) and a is a standard leaf
  //      text block (paragraph, heading, hardBreak). This handles co-equal-index cases
  //      such as closer [0,10] / paragraph [0,10] where paragraph is not in closer.contains
  //      but is obviously a child.
  private findTopLevelAnnotations(
    annotations: NodeStatusObject<AnnotationNode>[],
  ): NodeStatusObject<AnnotationNode>[] {
    const topLevelAnnotations: NodeStatusObject<AnnotationNode>[] = annotations
      .filter(
        a =>
          !annotations.some(
            b =>
              b.node.data.uuid !== a.node.data.uuid &&
              b.node.data.startIndex <= a.node.data.startIndex &&
              b.node.data.endIndex >= a.node.data.endIndex &&
              ((structuralChildrenMap.value[b.node.data.type] ?? []).includes(a.node.data.type) ||
                (this.isContainer(b.node.data.type) &&
                  StandoffConverter.IMPLICIT_LEAF_TYPES.has(a.node.data.type))),
          ),
      )
      .toSorted((a, b) => a.node.data.startIndex - b.node.data.startIndex);

    console.log(
      'Top level: ',
      topLevelAnnotations.map(n => [
        n.node.data.type,
        n.node.data.startIndex,
        n.node.data.endIndex,
      ]),
    );

    return topLevelAnnotations;
  }

  public convertStandoffToTipTap(): void {
    this.createAnnotationUuidMaps();

    const allStructural: NodeStatusObject<AnnotationNode>[] = [
      ...this.structuralAnnotations.values(),
    ];

    console.log('Text length: ', this.standoffJson.text.length);
    console.log(
      'Structural annotations: ',
      allStructural
        .toSorted((a, b) => a.node.data.startIndex - b.node.data.startIndex)
        .map(n => [n.node.data.type, n.node.data.startIndex, n.node.data.endIndex]),
    );

    const topLevelAnnos: NodeStatusObject<AnnotationNode>[] =
      this.findTopLevelAnnotations(allStructural);

    // Claim all top-level annotations so they cannot also be claimed as grandchildren
    // when buildStructuralNode recursively searches for children.
    topLevelAnnos.forEach(a => this.usedUuids.add(a.node.data.uuid));

    const docContent: TiptapNode[] = [];
    let cursor = 0;

    for (const node of topLevelAnnos) {
      const gapEnd: number = node.node.data.startIndex - 1;

      if (cursor <= gapEnd && this.hasText(cursor, gapEnd)) {
        docContent.push(
          this.syntheticParagraph(cursor, gapEnd, this.createLeafContent(cursor, gapEnd)),
        );
      }

      docContent.push(this.buildStructuralNode(node, allStructural));

      cursor = node.node.data.endIndex + 1;
    }

    const textEnd: number = this.standoffJson.text.length - 1;

    if (cursor <= textEnd && this.hasText(cursor, textEnd)) {
      docContent.push(
        this.syntheticParagraph(cursor, textEnd, this.createLeafContent(cursor, textEnd)),
      );
    }

    console.log('final: ', docContent);

    this.tiptapJson = { type: 'doc', content: docContent };
  }
}
