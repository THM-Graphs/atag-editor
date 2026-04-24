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
    map.set(node.attrs.uuid, { startIndex, endIndex: current });
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
  const sorted: number[] = [...new Set(decorations.flatMap(d => [d.from, d.to]))].sort(
    (a, b) => a - b,
  );
  const positionMap = new Map<number, number>();

  let charIndex: number = 0;
  let i: number = 0;

  doc.descendants((node: Node, nodePos: number) => {
    if (i >= sorted.length) return false;

    if (node.isText) {
      const nodeEnd: number = nodePos + node.text!.length;

      while (i < sorted.length && sorted[i] < nodePos) {
        positionMap.set(sorted[i++], charIndex);
      }

      while (i < sorted.length && sorted[i] <= nodeEnd) {
        const pos: number = sorted[i++];
        positionMap.set(pos, charIndex + (pos - nodePos));
      }

      charIndex += node.text!.length;
    }
  });

  while (i < sorted.length) {
    positionMap.set(sorted[i++], charIndex);
  }

  const map = new Map<string, { startIndex: number; endIndex: number }>();

  for (const deco of decorations) {
    map.set(deco.spec._uuid, {
      startIndex: positionMap.get(deco.from)!,
      endIndex: positionMap.get(deco.to)!,
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

export function positionToIndex(doc: Node, pos: number): number {
  let index: number = 0;
  let found: boolean = false;

  doc.descendants((node: Node, nodePos: number) => {
    // Index already found, do not further descend into the node subtree
    if (found) {
      return false;
    }

    if (node.isText) {
      // Count characters in text node. If the given position is inside it, return its position.
      const nodeEnd: number = nodePos + node.text!.length;

      if (pos >= nodePos && pos <= nodeEnd) {
        index += pos - nodePos;
        found = true;
        return false;
      }

      index += node.text!.length;
    }
  });

  return index;
}
