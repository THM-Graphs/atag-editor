import { ref } from 'vue';
import { PAGINATION_SIZE } from '../config/constants';
import { Annotation, AnnotationReference, Character } from '../models/types';

const beforeStartIndex = ref<number | null>(null);
const afterEndIndex = ref<number | null>(null);

const totalCharacters = ref<Character[]>([]);
const snippetCharacters = ref<Character[]>([]);
const initialSnippetCharacters = ref<Character[]>([]);

/**
 * Store for managing the state of characters inside an editor instance. When the component is mounted,
 * the store is initialized with the fetched characters from the database. When the component is unmounted,
 * the store is reset (character array is emptied).
 */
export function useCharactersStore() {
  /**
   * Initializes the character store with the provided character data. Called on character fetching from the database.
   *
   * This function resets the store, sets the total characters, and updates the snippet and initial characters based on the pagination size.
   *
   * @param {Character[]} characterData - The array of characters to initialize the store with.
   * @return {void} This function does not return any value.
   */
  function initializeCharacters(characterData: Character[]): void {
    resetCharacters();

    totalCharacters.value = characterData;

    if (totalCharacters.value.length === 0) {
      // No characters -> snippet equals total characters (obviously) -> afterEndIndex stays at null
    } else if (totalCharacters.value.length < PAGINATION_SIZE) {
      // Less than default page size -> afterEndIndex needs to be null
    } else if (totalCharacters.value.length > PAGINATION_SIZE) {
      afterEndIndex.value = PAGINATION_SIZE;
    }

    if (afterEndIndex.value) {
      snippetCharacters.value = [...totalCharacters.value].slice(0, afterEndIndex.value);
    } else {
      snippetCharacters.value = [...totalCharacters.value];
    }

    initialSnippetCharacters.value = JSON.parse(JSON.stringify(snippetCharacters.value));
  }

  /**
   * Paginates character array to the previous characters. The mode parameter determines whether the currently displayed characters
   * should stay rendered or replaced by the previous characters.
   *
   * @param {'keep' | 'replace'} mode - The mode to use when moving to the previous characters.
   * @return {void} This function does not return any value.
   */
  function previousCharacters(mode: 'keep' | 'replace'): void {
    if (beforeStartIndex.value === null) {
      console.log('Already at first character');
      return;
    }

    if (mode === 'replace') {
      // Set afterEndIndex to the first index of the current snippet
      if (beforeStartIndex.value + 1 >= totalCharacters.value.length) {
        afterEndIndex.value = null;
      } else {
        afterEndIndex.value = beforeStartIndex.value + 1;
      }
    }

    if (beforeStartIndex.value - PAGINATION_SIZE < 0) {
      beforeStartIndex.value = null;
    } else {
      beforeStartIndex.value -= PAGINATION_SIZE;
    }

    sliceCharactersSnippet();
  }

  /**
   * Paginates character array to the next characters. The mode parameter determines whether the currently displayed characters
   * should stay rendered or replaced by the next characters.
   *
   * @param {'keep' | 'replace'} mode - The mode to use when moving to the next characters.
   * @return {void} This function does not return any value.
   */
  function nextCharacters(mode: 'keep' | 'replace'): void {
    if (afterEndIndex.value === null) {
      console.log('No more characters');
      return;
    }

    if (mode === 'replace') {
      beforeStartIndex.value = afterEndIndex.value - 1;

      // This is the case when the first snippet of a text is completely deleted by the editor -> afterIndex is 0 since the next snippet is
      // the new beginning of the text
      if (beforeStartIndex.value < 0) {
        beforeStartIndex.value = null;
      }
    }

    if (afterEndIndex.value + PAGINATION_SIZE >= totalCharacters.value.length) {
      afterEndIndex.value = null;
    } else {
      afterEndIndex.value += PAGINATION_SIZE;
    }

    sliceCharactersSnippet();
  }

  /**
   * Paginates to the first snippet of the characters array.
   *
   * @return {void} This function does not return any value.
   */
  function firstCharacters(): void {
    if (beforeStartIndex.value === null) {
      console.log('Already at first character');
      return;
    }

    beforeStartIndex.value = null;

    if (totalCharacters.value.length <= PAGINATION_SIZE) {
      afterEndIndex.value = null;
    } else {
      afterEndIndex.value = PAGINATION_SIZE;
    }

    sliceCharactersSnippet();
  }

  /**
   * Paginates to the last snippet of the characters array.
   *
   * @return {void} This function does not return any value.
   */
  function lastCharacters(): void {
    if (afterEndIndex.value === null) {
      console.log('No more characters');
      return;
    }

    afterEndIndex.value = null;

    if (totalCharacters.value.length <= PAGINATION_SIZE) {
      beforeStartIndex.value = null;
    } else {
      beforeStartIndex.value = totalCharacters.value.length - PAGINATION_SIZE - 1;
    }

    sliceCharactersSnippet();
  }

  /**
   * Retrieves the character that comes before the character at the specified index.
   *
   * @param {number} index - The index of the character for which to retrieve the previous character.
   * @return {Character | null} The previous character, or null if the specified index is the first character.
   */
  function getPreviousChar(index: number): Character | null {
    let char: Character;

    if (index === 0) {
      if (beforeStartIndex.value === null) {
        char = null;
      } else {
        char = totalCharacters.value[beforeStartIndex.value];
      }
    } else {
      char = snippetCharacters.value[index - 1];
    }

    return char;
  }

  /**
   * Retrieves the character that comes after the character at the specified index.
   *
   * @param {number} index - The index of the character for which to retrieve the next character.
   * @return {Character | null} The next character, or null if the specified index is the last character.
   */
  function getNextChar(index: number): Character | null {
    let char: Character;

    if (index === snippetCharacters.value.length - 1) {
      if (afterEndIndex.value === null) {
        char = null;
      } else {
        char = totalCharacters.value[afterEndIndex.value];
      }
    } else {
      char = snippetCharacters.value[index + 1];
    }

    return char;
  }

  /**
   * Slices the total characters array to the snippet characters array, based on the computed start and end indices,
   * and sets the initial snippet characters property to the new snippet.
   *
   * @return {void} No return value.
   */
  function sliceCharactersSnippet(): void {
    const start: number = beforeStartIndex.value === null ? 0 : beforeStartIndex.value + 1;
    const end: number = afterEndIndex.value ?? totalCharacters.value.length;

    // TODO: This is repetitive, it should be sufficient to update the indizes. Compute the rest?
    snippetCharacters.value = [...totalCharacters.value].slice(start, end);
    initialSnippetCharacters.value = JSON.parse(JSON.stringify(snippetCharacters.value));
  }

  /**
   * Replaces characters between the specified start and end indexes with the given array of new characters.
   * Indexes are calculated during input event handling. Start and end index are inclusive and therefore deleted as well.
   *
   * @param {number} startIndex - The index of the first character to replace.
   * @param {number} endIndex - The index of the last character to replace.
   * @param {Character[]} newCharacters - The array of new characters to insert.
   * @return {void} This function does not return anything.
   */
  function replaceCharactersBetweenIndizes(
    startIndex: number,
    endIndex: number,
    newCharacters: Character[],
  ): void {
    const previousChar: Character | null = getPreviousChar(startIndex);
    const nextChar: Character | null = getNextChar(endIndex);
    const prevCharAnnotations: AnnotationReference[] = previousChar?.annotations ?? [];
    const nextCharAnnotations: AnnotationReference[] = nextChar?.annotations ?? [];

    // These annotations have ended on the previous char. Stored in static variable since values are changed further down.
    let annotationEndsUuids: string[] = prevCharAnnotations
      .filter(a => a.isLastCharacter)
      .map(a => a.uuid);

    newCharacters.forEach((c: Character, index: number) => {
      // Since a new character is inserted, the previous one can not be the last character of ANY annotation anymore
      if (index === 0) {
        prevCharAnnotations.forEach(a => (a.isLastCharacter = false));
      }

      prevCharAnnotations.forEach(a => {
        c.annotations.push({ ...a, isFirstCharacter: false, isLastCharacter: false });
      });

      if (index === newCharacters.length - 1) {
        c.annotations.forEach(a => {
          if (annotationEndsUuids.includes(a.uuid)) {
            a.isLastCharacter = true;
          }

          if (!nextCharAnnotations.map(ax => ax.uuid).includes(a.uuid)) {
            a.isLastCharacter = true;
          }
        });
      }
    });

    // The next character can be the new first character of an annotation
    nextCharAnnotations.forEach(a => {
      if (!prevCharAnnotations.map(ax => ax.uuid).includes(a.uuid)) {
        a.isFirstCharacter = true;
      }
    });

    const charsToDeleteCount: number = endIndex - startIndex + 1;
    snippetCharacters.value.splice(startIndex, charsToDeleteCount, ...newCharacters);
  }

  /**
   * Inserts new characters at the specified index in the characters array. Indexes are calculated during input event handling.
   *
   * @param {number} index - The index at which to insert the new characters.
   * @param {Character[]} newCharacters - The array of new characters to insert.
   * @return {void} This function does not return anything.
   */
  function insertCharactersAtIndex(index: number, newCharacters: Character[]): void {
    const previousChar: Character = getPreviousChar(index);
    const prevCharAnnotations: AnnotationReference[] = previousChar?.annotations ?? [];

    // These annotations have ended on the previous char. Stored in static variable since values are changed further down.
    let annotationEndsUuids: string[] = prevCharAnnotations
      .filter(a => a.isLastCharacter)
      .map(a => a.uuid);

    newCharacters.forEach((c: Character, index: number) => {
      // Since a new character is inserted, the previous one can not be the last character of ANY annotation anymore
      if (index === 0) {
        prevCharAnnotations.forEach(a => (a.isLastCharacter = false));
      }

      prevCharAnnotations.forEach(a => {
        c.annotations.push({ ...a, isFirstCharacter: false });
      });

      if (index === newCharacters.length - 1) {
        c.annotations.forEach(a => {
          if (annotationEndsUuids.includes(a.uuid)) {
            a.isLastCharacter = true;
          }
        });
      }
    });

    snippetCharacters.value.splice(index, 0, ...newCharacters);
  }

  /**
   * Deletes characters between the specified start and end indexes (both inclusive).
   *
   * @param {number} startIndex - The index of the first character to delete.
   * @param {number} endIndex - The index of the last character to delete.
   * @return {void} This function does not return anything.
   */
  function deleteCharactersBetweenIndexes(startIndex: number, endIndex: number): void {
    const charsToDeleteCount: number = endIndex - startIndex;

    const previousChar: Character | null = getPreviousChar(startIndex);
    const nextChar: Character | null = getNextChar(endIndex);
    const prevCharAnnotations: AnnotationReference[] = previousChar?.annotations ?? [];
    const nextCharAnnotations: AnnotationReference[] = nextChar?.annotations ?? [];

    prevCharAnnotations.forEach(prevAnno => {
      if (!nextCharAnnotations.find(nextAnno => nextAnno.uuid === prevAnno.uuid)) {
        prevAnno.isLastCharacter = true;
      }
    });

    nextCharAnnotations.forEach(nextAnno => {
      if (!prevCharAnnotations.find(prevAnno => prevAnno.uuid === nextAnno.uuid)) {
        nextAnno.isFirstCharacter = true;
      }
    });

    snippetCharacters.value.splice(startIndex, charsToDeleteCount + 1);
  }

  /**
   * Inserts the snippet characters into the total characters chain, updating the initial characters and after end index accordingly.
   * Called before changes are saved to the database.
   *
   * @return {void} This function does not return anything.
   */
  function insertSnippetIntoChain(): void {
    const startAtIndex: number = beforeStartIndex.value ? beforeStartIndex.value + 1 : 0;
    let charsToDeleteCount = 0;

    if (afterEndIndex.value) {
      charsToDeleteCount = afterEndIndex.value - startAtIndex;
    } else {
      charsToDeleteCount = totalCharacters.value.length;
    }

    totalCharacters.value.splice(startAtIndex, charsToDeleteCount, ...snippetCharacters.value);
    initialSnippetCharacters.value = JSON.parse(JSON.stringify(snippetCharacters.value));

    if (afterEndIndex.value === null) {
      afterEndIndex.value = null;
    } else if (beforeStartIndex.value === null) {
      afterEndIndex.value = snippetCharacters.value.length;
    } else {
      afterEndIndex.value = beforeStartIndex.value + snippetCharacters.value.length + 1;
    }
  }

  /**
   * Annotates each character in the given array with the provided annotation data.
   *
   * @param {Character[]} characters - The array of characters to be annotated.
   * @param {Annotation} annotation - The annotation data to be applied to each character.
   * @return {void} No return value.
   */
  function annotateCharacters(characters: Character[], annotation: Annotation): void {
    console.time('chars');
    characters.forEach((c: Character, index: number, arr: Character[]) =>
      c.annotations.push({
        uuid: annotation.data.uuid,
        type: annotation.data.type,
        subtype: annotation.data.subtype ?? '',
        isFirstCharacter: index === 0 ? true : false,
        isLastCharacter: index === arr.length - 1 ? true : false,
      }),
    );
    console.timeEnd('chars');
  }

  /**
   * Removes the annotation with the specified UUID from all characters.
   *
   * @param {string} annotationUuid - The UUID of the annotation to be removed.
   * @return {void} No return value.
   */
  function removeAnnotationFromCharacters(annotationUuid: string): void {
    // TODO: Reduce loops/duplicate method chaining
    console.time('deannotate characters');
    const annotatedCharacters: Character[] = totalCharacters.value.filter(c =>
      c.annotations.some(a => a.uuid === annotationUuid),
    );
    annotatedCharacters.forEach(
      c => (c.annotations = c.annotations.filter(a => a.uuid !== annotationUuid)),
    );

    const annotatedSnippetCharacters: Character[] = snippetCharacters.value.filter(c =>
      c.annotations.some(a => a.uuid === annotationUuid),
    );
    annotatedSnippetCharacters.forEach(
      c => (c.annotations = c.annotations.filter(a => a.uuid !== annotationUuid)),
    );

    console.timeEnd('deannotate characters');
  }

  /**
   * Resets all character-related state variables to their initial values.
   *
   * @return {void} No return value.
   */
  function resetCharacters(): void {
    snippetCharacters.value = [];
    totalCharacters.value = [];
    initialSnippetCharacters.value = [];
    beforeStartIndex.value = null;
    afterEndIndex.value = null;
  }

  return {
    afterEndIndex,
    beforeStartIndex,
    initialSnippetCharacters,
    snippetCharacters,
    totalCharacters,
    annotateCharacters,
    deleteCharactersBetweenIndexes,
    lastCharacters,
    initializeCharacters,
    insertCharactersAtIndex,
    insertSnippetIntoChain,
    nextCharacters,
    previousCharacters,
    removeAnnotationFromCharacters,
    replaceCharactersBetweenIndizes,
    resetCharacters,
    firstCharacters,
  };
}
