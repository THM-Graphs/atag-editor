import { Node } from '@tiptap/pm/model';

export function buildIndexMap(doc: Node): Map<string, { startIndex: number; endIndex: number }> {
  const map = new Map<string, { startIndex: number; endIndex: number }>();
  let charIndex = 0;

  doc.descendants((node: Node) => {
    if (node.isText) {
      map.set(node.attrs.uuid, { startIndex: charIndex, endIndex: charIndex + node.text!.length });

      charIndex += node.text!.length;
    }
  });

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
