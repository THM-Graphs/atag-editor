import { computed, readonly, ref } from 'vue';
import { useTiptapStore } from '../store/tiptap';
import { ANNOTATION_DECORATION_KEY } from '../editors/text/extensions/annotationDecoration';
import { IndexMap } from '../models/types';
import { Decoration } from '@tiptap/pm/view';
import { Node } from '@tiptap/pm/model';

/**
 * Composable that builds standoff-annotation index maps from the current ProseMirror document.
 *
 * Each map translates a node or decoration UUID to `{ startIndex, endIndex }` offsets in the
 * plain-text representation of the document (i.e. character positions, not ProseMirror doc
 * positions). The maps are used when serialising annotations to standoff format for the backend.
 *
 * Four maps are produced:
 * - `decorationIndexMap`     – inline annotation decorations (from/to in plain-text chars)
 * - `structureBlockIndexMap` – block nodes that carry a `uuid` attr (paragraphs, headings, …)
 * - `zeroPointIndexMap`      – `zeroPointAnnotation` inline atoms (position between two chars)
 * - `hardBreakIndexMap`      – `hardBreak` inline atoms (position between two chars)
 */
export function useCreateIndexMaps() {
  const { tiptap } = useTiptapStore();
  const doc = computed<Node>(() => tiptap.value!.state.doc);

  const decorations: Decoration[] =
    ANNOTATION_DECORATION_KEY.getState(tiptap.value!.state)?.all.find() ?? [];

  // Maps for standoff indices
  const decorationIndexMap = ref<IndexMap>(new Map());
  const structureBlockIndexMap = ref<IndexMap>(new Map());
  const zeroPointIndexMap = ref<IndexMap>(new Map());
  const hardBreakIndexMap = ref<IndexMap>(new Map());

  /**
   * Builds all four index maps in dependency order and returns read-only snapshots.
   * Call this once per save cycle rather than the individual builders to ensure consistency.
   *
   * @returns Read-only snapshots of all four index maps.
   */
  function buildIndexMaps() {
    buildStructureIndexMap();
    buildZeroPointIndexMap();
    buildHardBreakIndexMap();
    buildDecorationIndexMap();

    return {
      decorationIndexMap: readonly(decorationIndexMap.value),
      hardBreakIndexMap: readonly(hardBreakIndexMap.value),
      zeroPointIndexMap: readonly(zeroPointIndexMap.value),
      structureBlockIndexMap: readonly(structureBlockIndexMap.value),
    };
  }

  /**
   * Traverses the document and maps every uuid-bearing block node to its plain-text char range.
   *
   * @returns The populated `IndexMap` (also stored in `structureBlockIndexMap`).
   */
  function buildStructureIndexMap(): IndexMap {
    const map: IndexMap = new Map();
    traverseNode(doc.value, 0, map);
    structureBlockIndexMap.value = map;

    return map;
  }

  /**
   * Maps each `zeroPointAnnotation` node (by uuid) to the gap it occupies between two chars.
   *
   * @returns The populated `IndexMap` (also stored in `zeroPointIndexMap`).
   */
  function buildZeroPointIndexMap(): IndexMap {
    const map: IndexMap = new Map();
    traverseForInlineNode(doc.value, 0, 'zeroPointAnnotation', map);
    zeroPointIndexMap.value = map;

    return map;
  }

  /**
   * Maps each `hardBreak` node (by uuid) to the gap it occupies between two chars.
   *
   * @returns The populated `IndexMap` (also stored in `hardBreakIndexMap`).
   */
  function buildHardBreakIndexMap(): IndexMap {
    const map: IndexMap = new Map();
    traverseForInlineNode(doc.value, 0, 'hardBreak', map);
    hardBreakIndexMap.value = map;

    return map;
  }

  /**
   * Converts ProseMirror doc positions for every decoration's `from`/`to` into plain-text char
   * indices by walking only text nodes and counting characters. The endIndex is stored as
   * `to - 1` so both start and end are inclusive char offsets.
   *
   * @returns The populated `IndexMap` keyed by decoration `_uuid` (also stored in `decorationIndexMap`).
   */
  function buildDecorationIndexMap(): IndexMap {
    // All available decoration positions that need remapping
    const sortedPositions: number[] = [...new Set(decorations.flatMap(d => [d.from, d.to]))].sort(
      (a, b) => a - b,
    );
    const positionMap = new Map<number, number>();

    // The index of the character in the plain text (counts only char positions, not doc positions)
    let charIndex: number = 0;

    // Loop index for sortedPositions array
    let i: number = 0;

    doc.value.descendants((node: Node, nodePos: number) => {
      if (i >= sortedPositions.length) {
        return false;
      }

      if (node.isText) {
        const nodeEnd: number = nodePos + node.text!.length;

        // For each doc position inside the current text node, the same mapping can be applied
        while (i < sortedPositions.length && sortedPositions[i] <= nodeEnd) {
          const curr: number = sortedPositions[i];
          i++;
          positionMap.set(curr, charIndex + (curr - nodePos));
        }

        charIndex += node.text!.length;
      }
    });

    const map: IndexMap = new Map();

    for (const deco of decorations) {
      map.set(deco.spec._uuid, {
        startIndex: positionMap.get(deco.from)!,
        endIndex: positionMap.get(deco.to)! - 1,
      });
    }

    decorationIndexMap.value = map;

    return map;
  }

  /**
   * Recursively walks `node`, accumulating plain-text char count in `charIndex`.
   * Block nodes with a `uuid` attr are recorded in `map` as `[startIndex, endIndex]` (inclusive).
   * Inline atoms are intentionally skipped here; they are handled by `traverseForInlineNode`.
   *
   * @param node - The ProseMirror node to walk.
   * @param charIndex - Plain-text char offset at the start of this node.
   * @param map - Accumulator map; entries are added in place.
   * @returns The updated `charIndex` after all text inside `node` has been counted.
   */
  function traverseNode(node: Node, charIndex: number, map: IndexMap): number {
    if (node.isText) {
      return charIndex + node.text!.length;
    }

    const startIndex: number = charIndex;
    let current: number = charIndex;

    node.forEach(child => {
      current = traverseNode(child, current, map);
    });

    // Only block nodes map to standoff ranges; inline atoms (zeroPointAnnotation, hardBreak)
    // are handled separately by traverseForInlineNode.
    if (node.attrs.uuid && node.type.isBlock) {
      map.set(node.attrs.uuid, { startIndex, endIndex: current - 1 });
    }

    return current;
  }

  /**
   * Recursively walks `node` and records the standoff position of every inline node of
   * `nodeTypeName` that carries a `uuid` attr. The node is modelled as a zero-width gap between
   * characters: `startIndex = charIndex - 1` (last char before) and `endIndex = charIndex`
   * (first char after). The char counter is NOT advanced for the inline atom itself.
   *
   * @param node - The ProseMirror node to walk.
   * @param charIndex - Plain-text char offset at the start of this node.
   * @param nodeTypeName - ProseMirror node type name to match (e.g. `'hardBreak'`).
   * @param map - Accumulator map; entries are added in place.
   * @returns The updated `charIndex` (unchanged when the current node is the target inline atom).
   */
  function traverseForInlineNode(
    node: Node,
    charIndex: number,
    nodeTypeName: string,
    map: IndexMap,
  ): number {
    // Collect character count recursively
    if (node.isText) {
      return charIndex + node.text!.length;
    }

    if (node.type.name === nodeTypeName && node.attrs.uuid) {
      map.set(node.attrs.uuid, { startIndex: charIndex - 1, endIndex: charIndex });
      return charIndex;
    }

    let current = charIndex;
    node.forEach(child => {
      current = traverseForInlineNode(child, current, nodeTypeName, map);
    });

    return current;
  }

  return {
    decorationIndexMap,
    hardBreakIndexMap,
    zeroPointIndexMap,
    structureBlockIndexMap,
    buildDecorationIndexMap,
    buildHardBreakIndexMap,
    buildIndexMaps,
    buildStructureIndexMap,
    buildZeroPointIndexMap,
  };
}
