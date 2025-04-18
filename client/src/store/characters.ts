import { ref } from 'vue';
import { PAGINATION_SIZE } from '../config/constants';
import { useGuidelinesStore } from './guidelines';
import TextOperationError from '../utils/errors/textOperation.error';
import { Annotation, AnnotationReference, Character } from '../models/types';
import { cloneDeep } from '../utils/helper/helper';

type CharacterInfo = {
  char: Character | null;
  annotations: AnnotationReference[];
  anchorStartUuids?: string[];
  anchorEndUuids?: string[];
};

const beforeStartIndex = ref<number | null>(null);
const afterEndIndex = ref<number | null>(null);

const totalCharacters = ref<Character[]>([]);
const snippetCharacters = ref<Character[]>([]);
const initialSnippetCharacters = ref<Character[]>([]);

const { getAnnotationConfig } = useGuidelinesStore();

/**
 * Store for managing the state of characters inside an editor instance. When the component is mounted,
 * the store is initialized with the fetched characters from the database. When the component is unmounted,
 * the store is reset (character array is emptied). The store can also be reinitialized during text import.
 */
export function useCharactersStore() {
  /**
   * Initializes the character store with the provided character data. Called on character fetching from the database or on text import.
   * This function resets the store and performs further initialization logic depending on the source.
   *
   * @param {Character[]} characterData - The array of characters to initialize the store with.
   * @param {'database' | 'import'} source - The source of the character data. `database` if the initialization happens on text load,
   *                                         `import` if it happens on text import.
   * @return {void} This function does not return any value.
   */
  function initializeCharacters(characterData: Character[], source: 'database' | 'import'): void {
    resetCharacters();

    totalCharacters.value = characterData;

    if (source === 'database') {
      initializeCharactersFromDatabase();
    } else {
      initializeCharactersFromImport();
    }
  }

  /**
   * Creates the character snippet and implements the pagination logic.
   * Called on initialization when the text is loaded from the database (this is the normal case).
   *
   * @return {void} This function does not return any value.
   */
  function initializeCharactersFromDatabase(): void {
    // TODO: Why so many empty statements?
    if (totalCharacters.value.length === 0) {
      // No characters -> snippet equals total characters (obviously) -> afterEndIndex stays at null
    } else if (totalCharacters.value.length < PAGINATION_SIZE) {
      // Less than default page size -> afterEndIndex needs to be null
    } else if (totalCharacters.value.length > PAGINATION_SIZE) {
      afterEndIndex.value = PAGINATION_SIZE;
    }

    if (afterEndIndex.value) {
      snippetCharacters.value = cloneDeep(totalCharacters.value.slice(0, afterEndIndex.value));
    } else {
      snippetCharacters.value = cloneDeep(totalCharacters.value);
    }

    initialSnippetCharacters.value = cloneDeep(snippetCharacters.value);
  }

  /**
   * Creates the character snippet, but skips the pagination logic.
   * Called on initialization when the text is imported. Since the snippet will contain the whole loaded text,
   * no pagination is needed.
   *
   * @return {void} This function does not return any value.
   */
  function initializeCharactersFromImport(): void {
    snippetCharacters.value = cloneDeep(totalCharacters.value);
    initialSnippetCharacters.value = [];
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

  function getCharAtIndex(index: number): Character | null {
    let char: Character;

    if (index === snippetCharacters.value.length) {
      if (afterEndIndex.value === null) {
        char = null;
      } else {
        char = totalCharacters.value[afterEndIndex.value];
      }
    } else {
      char = snippetCharacters.value[index];
    }

    return char;
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

  function getCharInfo(index: number): CharacterInfo {
    const charAtIndex: Character | null = getCharAtIndex(index);
    const annotations: AnnotationReference[] = charAtIndex?.annotations ?? [];
    const anchorStartUuids: string[] = annotations
      .filter(a => getAnnotationConfig(a.type)?.isZeroPoint && a.isFirstCharacter)
      .map(a => a.uuid);

    const anchorEndUuids: string[] = annotations
      .filter(a => getAnnotationConfig(a.type)?.isZeroPoint && a.isLastCharacter)
      .map(a => a.uuid);

    const char: CharacterInfo = {
      char: charAtIndex,
      annotations,
      anchorStartUuids,
      anchorEndUuids,
    };

    return char;
  }

  function getPrevCharInfo(index: number): CharacterInfo {
    const char: Character | null = getPreviousChar(index);
    const annotations: AnnotationReference[] = char?.annotations ?? [];
    const anchorStartUuids: string[] = annotations
      .filter(a => getAnnotationConfig(a.type)?.isZeroPoint && a.isFirstCharacter)
      .map(a => a.uuid);

    const prevChar = { char, annotations, anchorStartUuids };

    return prevChar;
  }

  function getNextCharInfo(index: number): CharacterInfo {
    const char: Character | null = getNextChar(index);
    const annotations: AnnotationReference[] = char?.annotations ?? [];
    const anchorEndUuids: string[] = annotations
      .filter(a => getAnnotationConfig(a.type)?.isZeroPoint && a.isLastCharacter)
      .map(a => a.uuid);

    const nextChar = { char, annotations, anchorEndUuids };

    return nextChar;
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
    snippetCharacters.value = JSON.parse(
      JSON.stringify([...totalCharacters.value].slice(start, end)),
    );
    initialSnippetCharacters.value = cloneDeep(snippetCharacters.value);
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
    const prevChar: CharacterInfo = getPrevCharInfo(startIndex);
    const nextChar: CharacterInfo = getNextCharInfo(endIndex);

    // These annotations have ended on the previous char. Stored in static variable since values are changed further down.
    let annotationEndsUuids: string[] = prevChar.char?.annotations
      .filter(a => !getAnnotationConfig(a.type).isZeroPoint && a.isLastCharacter)
      .map(a => a.uuid);

    // Since a new character is inserted, the previous one can not be the last character of ANY annotation anymore
    prevChar.char?.annotations.forEach(a => {
      const isZeroPoint: boolean = getAnnotationConfig(a.type)?.isZeroPoint;

      if (!isZeroPoint) {
        a.isLastCharacter = false;
      }
    });

    newCharacters.forEach((c: Character, index: number) => {
      // Annotate new character with annotations of previous character
      prevChar.char?.annotations.forEach(a => {
        const isZeroPoint: boolean = getAnnotationConfig(a.type)?.isZeroPoint;

        if (!isZeroPoint) {
          c.annotations.push({ ...a, isFirstCharacter: false, isLastCharacter: false });
        } else {
          if (a.isFirstCharacter && index === 0) {
            c.annotations.push({ ...a, isFirstCharacter: false, isLastCharacter: true });
          }
        }
      });

      if (index === newCharacters.length - 1) {
        // If next character after insertion is the last character of a zero-point-annotation, new character will be the new start char.
        nextChar.annotations.forEach(a => {
          const isZeroPoint: boolean = getAnnotationConfig(a.type)?.isZeroPoint;

          if (isZeroPoint && a.isLastCharacter) {
            c.annotations.push({ ...a, isFirstCharacter: true, isLastCharacter: false });
          }
        });

        c.annotations.forEach(a => {
          const isZeroPoint: boolean = getAnnotationConfig(a.type)?.isZeroPoint;

          if (!isZeroPoint) {
            if (annotationEndsUuids.includes(a.uuid)) {
              a.isLastCharacter = true;
            }

            if (!nextChar.char?.annotations.map(ax => ax.uuid).includes(a.uuid)) {
              a.isLastCharacter = true;
            }
          }
        });
      }
    });

    // The next character can be the new first character of an annotation
    nextChar.char?.annotations.forEach(a => {
      const isZeroPoint: boolean = getAnnotationConfig(a.type)?.isZeroPoint;

      if (!isZeroPoint && !prevChar.char?.annotations.map(ax => ax.uuid).includes(a.uuid)) {
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
    const prevChar: CharacterInfo = getPrevCharInfo(index);
    const nextChar: CharacterInfo = getCharInfo(index);

    // These annotations have ended on the previous char. Stored in static variable since values are changed further down.
    let annotationEndsUuids: string[] = prevChar.annotations
      .filter(a => a.isLastCharacter)
      .map(a => a.uuid);

    // Since a new character is inserted, the previous one can not be the last character of ANY annotation anymore
    prevChar.char?.annotations.forEach(a => {
      const isZeroPoint: boolean = getAnnotationConfig(a.type)?.isZeroPoint;

      if (!isZeroPoint) {
        a.isLastCharacter = false;
      }
    });

    newCharacters.forEach((c: Character, i: number) => {
      prevChar.char?.annotations.forEach(a => {
        const isZeroPoint: boolean = getAnnotationConfig(a.type)?.isZeroPoint;

        if (!isZeroPoint) {
          c.annotations.push({ ...a, isFirstCharacter: false });
        } else {
          if (i === 0 && prevChar.anchorStartUuids.includes(a.uuid)) {
            c.annotations.push({ ...a, isFirstCharacter: false, isLastCharacter: true });
          }
        }
      });

      if (i === newCharacters.length - 1) {
        c.annotations.forEach(a => {
          if (annotationEndsUuids.includes(a.uuid)) {
            a.isLastCharacter = true;
          }
        });
      }

      // Remove annotation from span after insertion if it is zero-point (first of the inserted spans is now annotated as isLastCharacter)
      if (nextChar.char) {
        nextChar.char.annotations = nextChar.char.annotations.filter(a => {
          const isZeroPoint: boolean = getAnnotationConfig(a.type)?.isZeroPoint;

          if (isZeroPoint && nextChar.anchorEndUuids?.includes(a.uuid)) {
            return false;
          }

          return true;
        });
      }
    });

    snippetCharacters.value.splice(index, 0, ...newCharacters);
  }

  /**
   * Deletes characters between the specified start and end indexes.
   * Indexes are calculated during input event handling. Start and end index are inclusive and therefore deleted as well.
   *
   * @param {number} startIndex - The index of the first character to delete.
   * @param {number} endIndex - The index of the last character to delete.
   * @return {void} This function does not return anything.
   *
   * @throws {TextOperationError} If the character can not be deleted since there is no previous/next character to be annotated as zero-point anchor.
   */
  function deleteCharactersBetweenIndexes(startIndex: number, endIndex: number): void {
    const charsToDeleteCount: number = endIndex - startIndex;
    const prevChar: CharacterInfo = getPrevCharInfo(startIndex);
    const nextChar: CharacterInfo = getNextCharInfo(endIndex);

    // Selection ends between two anchor spans and there is no previous character in the chain to be the new left anchor
    const hasNoPreviousAnchor: boolean =
      !prevChar.char &&
      nextChar.char?.annotations.some(
        a => getAnnotationConfig(a.type)?.isZeroPoint && a.isLastCharacter,
      );

    // Selection starts between two anchor spans and there is no next character in the chain to be the right anchor
    const hasNoNextAnchor: boolean =
      !nextChar.char &&
      prevChar.char?.annotations.some(
        a => getAnnotationConfig(a.type)?.isZeroPoint && a.isFirstCharacter,
      );

    // If there is no next/previous character to be the new anchor of a zero-point annotation,
    // text operation should not be allowed at all
    if (hasNoPreviousAnchor || hasNoNextAnchor) {
      const errorMsg: string = hasNoPreviousAnchor
        ? 'Character can not be deleted since there is no previous character to be annotated as zero-point anchor'
        : 'Character can not be deleted since there is no next character to be annotated as zero-point anchor';

      throw new TextOperationError(errorMsg);
    }

    // Behaviour for zero-point annotations (annotate previous/next character
    // if the delete operation starts/ends inside of an annotation)
    prevChar.anchorStartUuids.forEach((uuid: string) => {
      const anno: AnnotationReference = {
        ...prevChar.char?.annotations.find(a => a.uuid === uuid),
      };

      if (!nextChar.char?.annotations.some(a => a.uuid === uuid)) {
        nextChar.char?.annotations.push(anno);
      }

      anno.isFirstCharacter = false;
      anno.isLastCharacter = true;
    });

    nextChar.anchorEndUuids.forEach((uuid: string) => {
      const anno: AnnotationReference = {
        ...nextChar.char?.annotations.find(a => a.uuid === uuid),
      };

      if (!prevChar.char?.annotations.some(a => a.uuid === uuid)) {
        prevChar.char?.annotations.push(anno);
      }

      anno.isFirstCharacter = true;
      anno.isLastCharacter = false;
    });

    // Behaviour for non-zero-point annotations
    prevChar.char?.annotations.forEach(prevAnno => {
      if (getAnnotationConfig(prevAnno.type)?.isZeroPoint) {
        return;
      }

      if (!nextChar.char?.annotations.find(nextAnno => nextAnno.uuid === prevAnno.uuid)) {
        prevAnno.isLastCharacter = true;
      }
    });

    nextChar.char?.annotations.forEach(nextAnno => {
      if (getAnnotationConfig(nextAnno.type)?.isZeroPoint) {
        return;
      }

      if (!prevChar.char?.annotations.find(prevAnno => prevAnno.uuid === nextAnno.uuid)) {
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
    initialSnippetCharacters.value = cloneDeep(snippetCharacters.value);

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
    characters.forEach((c: Character, index: number, arr: Character[]) =>
      c.annotations.push({
        uuid: annotation.data.properties.uuid,
        type: annotation.data.properties.type,
        subtype: annotation.data.properties.subtype.toString() ?? null,
        isFirstCharacter: index === 0 ? true : false,
        isLastCharacter: index === arr.length - 1 ? true : false,
      }),
    );
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
   * Resets all character-related state variables to their initial values. Called when the Editor component is unmounted.
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
