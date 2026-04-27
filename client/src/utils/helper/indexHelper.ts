import { Node } from '@tiptap/pm/model';
import { Decoration } from '@tiptap/pm/view';
import { IndexMap } from '../../models/types';

function traverseNode(node: Node, charIndex: number, map: IndexMap): number {
  if (node.isText) {
    return charIndex + node.text!.length;
  }

  const startIndex: number = charIndex;
  let current: number = charIndex;

  node.forEach(child => {
    current = traverseNode(child, current, map);
  });

  if (node.attrs.uuid) {
    map.set(node.attrs.uuid, { startIndex, endIndex: current - 1 });
  }

  return current;
}

export function buildStructureIndexMap(doc: Node): IndexMap {
  const map: IndexMap = new Map();

  traverseNode(doc, 0, map);

  console.log(map);

  return map;
}

export function buildDecorationIndexMap(doc: Node, decorations: Decoration[]): IndexMap {
  // All availabe decoration positions that need remapping
  const sortedPositions: number[] = [...new Set(decorations.flatMap(d => [d.from, d.to]))].sort(
    (a, b) => a - b,
  );
  const positionMap = new Map<number, number>();

  // The index of the character in the plain text (counts only char positions, not doc positions)
  let charIndex: number = 0;

  // Loop index for sortedPositions array
  let i: number = 0;

  doc.descendants((node: Node, nodePos: number) => {
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

  const map = new Map<string, { startIndex: number; endIndex: number }>();

  for (const deco of decorations) {
    map.set(deco.spec._uuid, {
      startIndex: positionMap.get(deco.from)!,
      endIndex: positionMap.get(deco.to)! - 1,
    });
  }

  console.log(map);

  return map;
}

export function indexToPosition(doc: Node, index: number): number {
  let pos: number = 0;
  let remaining: number = index;

  doc.descendants((node: Node, nodePos: number) => {
    // Position already found, do not further descend into the node subtree
    if (remaining < 0) {
      return false;
    }

    if (node.isText) {
      // Count characters in text node. If annotation index is inside it, return its position. Else,
      // subtract the number of characters in the text node from the remaining index.
      if (remaining <= node.text!.length) {
        pos = nodePos + remaining;
        remaining = -1;

        return false;
      }

      remaining -= node.text!.length;
    }
  });

  return pos;
}
