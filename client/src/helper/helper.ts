import { Ref } from 'vue';
import ICharacter from '../models/ICharacter';

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
 * A function that compares two objects to check if they are equal. Works only for non-nested objects
 * where values are strings or numbers.
 *
 * @param {Record<string, string | number>} obj1 - The first object to compare.
 * @param {Record<string, string | number>} obj2 - The second object to compare.
 * @return {boolean} Returns true if the objects are equal, otherwise false.
 */
export function objectsAreEqual(
  obj1: Record<string, string | number>,
  obj2: Record<string, string | number>,
): boolean {
  const keys1: string[] = Object.keys(obj1);
  const keys2: string[] = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key) || obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
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
 * Finds the index of the start of the word that contains the given character index.
 * Used for word deleting with "Ctrl + Backspace".
 *
 * @param {number} charIndex - The index of the character.
 * @param {ICharacter[]} characters - The array of characters.
 * @return {number} The index of the character that is the start of a word.
 */
export function findStartOfWord(charIndex: number, characters: ICharacter[]): number {
  let start: number = charIndex;

  while (start > 0 && !isWordBoundary(characters[start - 1].text)) {
    start--;
  }

  return start;
}

/**
 * Finds the index of the end of the word that contains the given character index.
 * Used for word deleting with "Ctrl + Delete".
 *
 * @param {number} charIndex - The index of the character.
 * @param {ICharacter[]} characters - The array of characters.
 * @return {number} The index of the character that is the end of a word.
 */
export function findEndOfWord(charIndex: number, characters: ICharacter[]): number {
  let end: number = charIndex + 1;

  while (end < characters.length && !isWordBoundary(characters[end].text)) {
    end++;
  }

  return end;
}

/**
 * Determines if the given character is a word boundary, for example whitespace or punctuation.
 *
 * @param {string} char - The character to check.
 * @returns {boolean} True if the character is a word boundary, false otherwise.
 */
export function isWordBoundary(char: string): boolean {
  return /\s/.test(char) || /[.,!?;:(){}[\]"']/g.test(char);
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

/**
 * Determines if the cursor is before the first character in the editor. Used for determining where to execute the insert/delete operation.
 *
 * @param {HTMLSpanElement} characterSpan - The HTMLSpanElement representing the character span.
 * @param {Ref<HTMLDivElement>} editorElm - The ref to the editor element.
 * @return {boolean} True if the cursor is before the first character, false otherwise.
 */
export function isCursorAtBeginning(
  characterSpan: HTMLSpanElement,
  editorElm: Ref<HTMLDivElement>,
) {
  const { range } = getSelectionData();
  return characterSpan === editorElm.value.firstElementChild && range.startOffset === 0;
}
