/**
 * Capitalizes the first letter of a given string.
 *
 * @param {string} inputString - The string to be capitalized.
 * @return {string} The input string with the first letter capitalized.
 */
export function capitalize(inputString: string): string {
  return inputString.charAt(0).toUpperCase() + inputString.slice(1);
}

/**
 * Checks if the given node is the text container element with id "text".
 *
 * @param {Node} node - The node to check.
 * @return {boolean} Returns true if the node is the text container element, false otherwise.
 */
export function isEditorElement(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).id === 'text';
}

/**
 * Returns the HTMLSpanElement that is the parent of the given node if it is a text node, or the element itself if it is a span element.
 * Used for getting and setting selection ranges during input handling.
 *
 * @param {Node} node - The node for which to find the parent character span (if it is not a span element itself)
 * @return {HTMLSpanElement} The parent span element of the given node (or the node itself)
 */
export function getParentCharacterSpan(node: Node): HTMLSpanElement {
  if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'SPAN') {
    return node as HTMLSpanElement;
  } else if (node.nodeType === Node.TEXT_NODE) {
    return node.parentElement as HTMLSpanElement;
  }

  throw new Error('The provided node is neither a text node nor a span element.');
}

/**
 * Remove images, formatting, newline characters, carriage returns, and escape elements from the input text.
 * Used for cleaning up the input text before inserting it into the editor via paste.
 *
 * @param {string} text - The text from which to remove formatting.
 * @return {string} The plain text with leading and trailing whitespace trimmed.
 */
export function removeFormatting(text: string): string {
  const plainText: string = text.replace(/<[^>]*>|&[^;]*;|\r\n?|\n/g, '');
  return plainText.trim(); // Trim leading and trailing whitespace
}

/**
 * Retrieves relevant data from the Selection object of the current window.
 *
 * @return {Object} An object containing the Selection object itself, the Range object, and the type of the selection ('Caret', 'Range', 'None').
 */
export function getSelectionData(): { selection: Selection; range: Range; type: string } {
  const selection: Selection = window.getSelection();
  const range: Range = selection.getRangeAt(0);
  const type: string = selection.type;

  return { selection, range, type };
}
