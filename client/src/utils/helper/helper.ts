import { Ref } from 'vue';
import {
  Annotation,
  CollectionAccessObject,
  PropertyConfigDataType,
  Text,
} from '../../models/types';
import ICollection from '../../models/ICollection';
import { useGuidelinesStore } from '../../store/guidelines';

const { getAllCollectionConfigFields } = useGuidelinesStore();

/**
 * Converts a camelCase or PascalCase string into a space-separated title case string
 * (for example `"actorRoles"` to `"Actor Roles"`).
 *
 * @param {string} inputString - The string to be transformed.
 * @return {string} The transformed string in title case.
 */
export function camelCaseToTitleCase(inputString: string): string {
  return inputString.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, char => char.toUpperCase());
}

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
 * Deep clones an object, map or array. This means that any nested objects, maps or arrays will also be cloned.
 * Used to remove unwanted references e.g. resetting editor state on save/cancel/undo/redo operations.
 *
 * @param {T} input - The object, map or array to be deep cloned.
 * @return {T} The cloned object, map or array.
 */
export function cloneDeep<T>(input: T): T {
  if (input instanceof Map) {
    const clonedMap: Map<any, any> = new Map() as Map<any, any>;

    // new Map(input) would not work since the reference to nested objects would still be the same
    input.forEach((value, key) => {
      clonedMap.set(key, cloneDeep(value));
    });

    return clonedMap as T;
  }

  if (Array.isArray(input)) {
    return JSON.parse(JSON.stringify(input)) as T;
  }

  if (typeof input === 'object' && input !== null) {
    return JSON.parse(JSON.stringify(input)) as T;
  }

  // Default for primitive types like string, number, boolean, etc.
  return input;
}

export function createNewCollectionAccessObject(): CollectionAccessObject {
  return {
    collection: {
      data: {
        label: '',
        uuid: crypto.randomUUID(),
      } as ICollection,
      nodeLabels: [],
    },
    texts: [],
    annotations: [],
  };
}

/**
 * Creates a new Text object with default values.
 *
 * This function is used to generate a new Text object with default values for the node labels and data properties.
 *
 * @return {Text} A new Text object with default values.
 */
export function createNewTextObject(): Text {
  return {
    nodeLabels: [],
    data: {
      uuid: crypto.randomUUID(),
      text: '',
    },
  };
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
  // TODO: This function needs to be rewritten when there are more complex objects...
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
export function areSetsEqual(setA: Set<string>, setB: Set<string>): boolean {
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

export function getCharacterUuidFromSpan(span: HTMLSpanElement | Element | null): string | null {
  return span?.id ?? null;
}

/**
 * Determines the outer boundary elements and their UUIDs of a given range.
 * The function extracts the start and end span elements using `getRangeBoundaries`,
 * then identifies the span elements immediately before the start and after the end
 * of the range, if they exist. It returns these outer span elements and their corresponding
 * UUIDs.
 *
 * @param {Range} range - A Range object representing the selected or highlighted text.
 * @returns {Object} An object containing `leftSpan` and `rightSpan`, which are the
 * HTML span elements immediately before and after the range, respectively, as well as
 * `leftUuid` and `rightUuid`, which are the UUIDs of these span elements.
 */
export function getOuterRangeBoundaries(range: Range): {
  leftSpan: HTMLSpanElement | null;
  rightSpan: HTMLSpanElement | null;
  leftUuid: string | null;
  rightUuid: string | null;
} {
  const { startSpan, endSpan } = getRangeBoundaries(range);

  const leftSpan: HTMLSpanElement | null =
    (startSpan.previousElementSibling as HTMLSpanElement) ?? null;
  const rightSpan: HTMLSpanElement | null = (endSpan.nextElementSibling as HTMLSpanElement) ?? null;
  const leftUuid: string | null = leftSpan?.id ?? null;
  const rightUuid: string | null = rightSpan?.id ?? null;

  return {
    leftSpan,
    rightSpan,
    leftUuid,
    rightUuid,
  };
}

/**
 * Extracts the start and end span elements from a given Range and return an object with two properties,
 * `startSpan` and `endSpan`, which contain the start and end span elements, respectively.
 *
 * @param {Range} range A Range object
 * @returns {Object} An object with two properties, `startSpan` and `endSpan`, which contain the start and end span elements, respectively.
 */
export function getRangeBoundaries(range: Range): {
  startSpan: HTMLSpanElement;
  endSpan: HTMLSpanElement;
} {
  const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
  const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);

  return { startSpan: startReferenceSpanElement, endSpan: endReferenceSpanElement };
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
export function isCaretAtBeginning(
  characterSpan: HTMLSpanElement,
  editorElm: Ref<HTMLDivElement>,
): boolean {
  const { range } = getSelectionData();
  return characterSpan === editorElm.value.firstElementChild && range.startOffset === 0;
}

/**
 * Determines if the caret is after the last character in the editor.
 * Used for determining where to execute the insert/delete operation.
 *
 * @param {HTMLSpanElement} characterSpan - The HTMLSpanElement representing the character span.
 * @param {Ref<HTMLDivElement>} editorElm - The ref to the editor element.
 * @return {boolean} True if the caret is after the last character, false otherwise.
 */
export function isCaretAtEnd(
  characterSpan: HTMLSpanElement,
  editorElm: Ref<HTMLDivElement>,
): boolean {
  const { range } = getSelectionData();
  const lastChild = editorElm.value.lastElementChild;

  // Check if the current span is the last element and caret is at its end
  return characterSpan === lastChild && range.startOffset === 1;
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
    `#text > span:has(span[data-anno-uuid="${annotation.data.properties.uuid}"])`,
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
 * Returns a default value based on the data type.
 *
 * Used during import, editing and saving of Collections or Annotations.
 *
 * @param {PropertyConfigDataType} type - The data type.
 * @return {any} The appropriate default value for the data type.
 */
export function getDefaultValueForProperty(type: PropertyConfigDataType): any {
  switch (type) {
    case 'boolean':
      return false;
    case 'date':
      const today: Date = new Date();
      const year: number = today.getUTCFullYear();
      const month: number = today.getUTCMonth();
      const day: number = today.getUTCDate();
      return new Date(Date.UTC(year, month, day, 0, 0, 0)).toISOString();
    case 'date-time':
      return new Date().toISOString();
    case 'integer':
      return 0;
    case 'number':
      return 0;
    case 'string':
      return '';
    case 'time':
      return '00:00:00';
    case 'array':
      return [];
    default:
      return null;
  }
}
