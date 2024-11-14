import { Ref } from 'vue';
import { Annotation, Character } from '../../models/types';

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
 * Creates a deep copy of a JSON object with JSON.parse/JSON.stringify.
 * Used to remove unwanted references e.g. during slicing the character array snippet.
 *
 * @param {Record<any, any>} json - The object to be deep cloned.
 * @return {Record<any, any>} A deep copy of the input object.
 */
export function cloneDeep(json: Record<any, any>) {
  return JSON.parse(JSON.stringify(json));
}

/**
 * A function that compares two objects to check if they are equal. Works only for non-nested objects
 * where values are strings or numbers.
 *
 * @param {Record<string, any>} obj1 - The first object to compare.
 * @param {Record<string, any>} obj2 - The second object to compare.
 * @return {boolean} Returns true if the objects are equal, otherwise false.
 */
export function areObjectsEqual(obj1: Record<string, any>, obj2: Record<string, any>): boolean {
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
 * Checks if two sets are equal by comparing their sizes and elements. Used for comparing
 * character annotations.
 *
 * @param {Set<string>} setA - The first set to compare.
 * @param {Set<string>} setB - The second set to compare.
 * @return {boolean} Returns true if the sets are equal, otherwise false.
 */
export function areSetsEqual(setA: Set<string>, setB: Set<string>) {
  if (setA.size !== setB.size) {
    return false;
  }

  for (let item of setA) {
    if (!setB.has(item)) {
      return false;
    }
  }

  return true;
}

/**
 * Format a file size in bytes into a human-readable string.
 *
 * @param {number} bytes The file size in bytes
 * @returns {string} The formatted file size as a string (e.g. "1.23 MB")
 */
export function formatFileSize(bytes: number): string {
  const k: number = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  if (bytes === 0) {
    return `0 ${sizes[0]}`;
  }

  const i: number = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedSize: number = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

  return `${formattedSize} ${sizes[i]}`;
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
 * @param {Character[]} characters - The array of characters.
 * @return {number} The index of the character that is the start of a word.
 */
export function findStartOfWord(charIndex: number, characters: Character[]): number {
  let start: number = charIndex;

  while (start > 0 && !isWordBoundary(characters[start - 1].data.text)) {
    start--;
  }

  return start;
}

/**
 * Finds the index of the end of the word that contains the given character index.
 * Used for word deleting with "Ctrl + Delete".
 *
 * @param {number} charIndex - The index of the character.
 * @param {Character[]} characters - The array of characters.
 * @return {number} The index of the character that is the end of a word.
 */
export function findEndOfWord(charIndex: number, characters: Character[]): number {
  let end: number = charIndex + 1;

  while (end < characters.length && !isWordBoundary(characters[end].data.text)) {
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
 * Removes formatting characters from the input text.
 *
 * @param {string} text - The text containing formatting characters.
 * @return {string} The text with formatting characters removed.
 */
export function removeFormatting(text: string): string {
  const plainText: string = text.replace(/\r\n?|\n/g, '');
  return plainText;
}

/**
 * Retrieves relevant data from the Selection object of the current window.
 *
 * @return {Object} An object containing the Selection object itself, the Range object, and the type of the selection ('Caret', 'Range', 'None').
 */
export function getSelectionData(): { selection: Selection; range: Range; type: string } {
  const selection: Selection = window.getSelection();
  const range: Range | null = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const type: string = selection.type;

  return { selection, range, type };
}

/**
 * Determines if the caret is before the first character in the editor. Used for determining where to execute the insert/delete operation.
 *
 * @param {HTMLSpanElement} characterSpan - The HTMLSpanElement representing the character span.
 * @param {Ref<HTMLDivElement>} editorElm - The ref to the editor element.
 * @return {boolean} True if the caret is before the first character, false otherwise.
 */
export function isCaretAtBeginning(characterSpan: HTMLSpanElement, editorElm: Ref<HTMLDivElement>) {
  const { range } = getSelectionData();
  return characterSpan === editorElm.value.firstElementChild && range.startOffset === 0;
}

/**
 * Toggles the text highlighting for the given annotation by adding CSS classes to annotated span elements.
 *
 * @param {Annotation} annotation - The annotation for which to toggle highlighting.
 * @param {'on' | 'off'} direction - The direction of the toggle operation.
 * @return {void}
 */
export function toggleTextHightlighting(annotation: Annotation, direction: 'on' | 'off'): void {
  const annotatedSpans: NodeListOf<HTMLSpanElement> = document.querySelectorAll(
    `#text > span:has(span[data-anno-uuid="${annotation.data.uuid}"])`,
  );

  if (annotatedSpans.length === 0) {
    return;
  }

  scrollIntoViewIfNeeded(annotatedSpans[0]);

  annotatedSpans.forEach((span: HTMLSpanElement) => {
    direction === 'on' ? span.classList.add('highlight') : span.classList.remove('highlight');
  });
}

/**
 * Scrolls the given span element into view if it is outside the viewport.
 *
 * @param {HTMLSpanElement} span - The span element to scroll into view.
 * @return {void}
 */
export function scrollIntoViewIfNeeded(span: HTMLSpanElement): void {
  const spanRect: DOMRect = span.getBoundingClientRect();
  const containerRect: DOMRect = document.querySelector('.text-container').getBoundingClientRect();

  const isOutsideViewport: boolean =
    spanRect.top <= containerRect.top || spanRect.bottom >= containerRect.bottom;

  isOutsideViewport && span.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Builds a URL for a given path depending on the environment.
 *
 * If the environment is "development", the URL is constructed by prepending the protocol and host
 * from the Vite configuration to the path. Otherwise, the given path is used as is.
 *
 * @param {string} path - The path for which to build the URL.
 * @return {string} The built URL.
 */
export function buildFetchUrl(path: string): string {
  let url: string;

  console.log(import.meta.env);

  if (import.meta.env.MODE === 'development') {
    // Used for development currently, fix in future with vite configuration
    url = `${import.meta.env.VITE_PROTOCOL}://${import.meta.env.VITE_APP_HOST}:8080${path}`;
  } else {
    // For production, use relative URL and leave configuration to nginx
    switch (path) {
      case '/api/collections':
        url = '../../mockdata/collections.json';
        break;
      case '/api/guidelines':
        url = '../../mockdata/guidelines.json';
        break;
      // case `/api/collections/${uuid}/characters`:
      //   url = `/mockdata/characters.json`;
      //   break;
      // case `/api/collections/${uuid}/annotations`:
      //   url = `/mockdata/annotations.json`;
      //   break;
      default:
        url = path;
    }

    // Set prefix for github pages
    url = import.meta.env.BASE_URL + url;
  }

  console.log(url);

  return url;
}
