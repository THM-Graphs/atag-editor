import { ref } from 'vue';
import { PAGINATION_SIZE } from '../models/constants';
import { Annotation, Character } from '../models/types';

const beforeStartIndex = ref<number | null>(null);
const afterEndIndex = ref<number | null>(null);

const totalCharacters = ref<Character[]>([]);
const snippetCharacters = ref<Character[]>([]);
const initialCharacters = ref<Character[]>([]);

/**
 * Store for managing the state of characters inside an editor instance. When the component is mounted,
 * the store is initialized with the fetched characters from the database. When the component is unmounted,
 * the store is reset (character array is emptied).
 */
export function useCharactersStore() {
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

    initialCharacters.value = [...snippetCharacters.value];
  }

  function previousCharacters(mode: 'keep' | 'replace') {
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

    const startSliceAt: number = beforeStartIndex.value === null ? 0 : beforeStartIndex.value + 1;
    const endSliceAt: number = afterEndIndex.value ?? totalCharacters.value.length;

    // TODO: This is repetitive, it should be sufficient to update the indizes. Compute the rest?
    snippetCharacters.value = [...totalCharacters.value].slice(startSliceAt, endSliceAt);
    initialCharacters.value = [...snippetCharacters.value];
  }

  function nextCharacters(mode: 'keep' | 'replace') {
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

    const startSliceAt: number = beforeStartIndex.value === null ? 0 : beforeStartIndex.value + 1;
    const endSliceAt: number = afterEndIndex.value ?? totalCharacters.value.length;

    // TODO: This is repetitive, it should be sufficient to update the indizes. Compute the rest?
    snippetCharacters.value = [...totalCharacters.value].slice(startSliceAt, endSliceAt);
    initialCharacters.value = [...snippetCharacters.value];
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
    if (startIndex !== 0) {
      const previousChar: Character = snippetCharacters.value[startIndex - 1];
      const nextChar: Character | null = snippetCharacters.value[endIndex + 1];
      const prevCharAnnotations = previousChar.annotations;
      const nextCharAnnotations = nextChar?.annotations ?? [];

      // These annotations have ended on the previous char
      let annotationEndsUuids = prevCharAnnotations.filter(a => a.isLastCharacter).map(a => a.uuid);

      newCharacters.forEach((c: Character, index: number) => {
        // First inserted character can be the new last character of the annotation
        if (index === 0) {
          previousChar.annotations.forEach(a => {
            if (a.isLastCharacter) {
              a.isLastCharacter = false;
            }
          });
        }

        c.annotations.push(
          ...previousChar.annotations.map(a => ({
            ...a,
            isFirstCharacter: false,
            isLastCharacter: false,
          })),
        );

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
    } else {
      const nextChar: Character | null = snippetCharacters.value[endIndex + 1];
      const nextCharAnnotations = nextChar?.annotations ?? [];

      nextCharAnnotations.forEach(a => {
        a.isFirstCharacter = true;
      });

      console.log('inserting at first position, no inherit');
    }

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
    if (index !== 0) {
      const previousChar: Character = snippetCharacters.value[index - 1];
      const annotations = previousChar.annotations;

      // These annotations have ended on the previous char
      let annotationEndsUuids = annotations.filter(a => a.isLastCharacter).map(a => a.uuid);

      newCharacters.forEach((c: Character, index: number) => {
        // First inserted character can be the new last character of the annotation
        if (index === 0) {
          previousChar.annotations.forEach(a => {
            if (a.isLastCharacter) {
              a.isLastCharacter = false;
            }
          });
        }

        c.annotations.push(
          ...previousChar.annotations.map(a => ({ ...a, isFirstCharacter: false })),
        );

        if (index === newCharacters.length - 1) {
          c.annotations.forEach(a => {
            if (annotationEndsUuids.includes(a.uuid)) {
              a.isLastCharacter = true;
            }
          });
        }
      });

      // console.log(JSON.parse(JSON.stringify(previousChar.annotations)));
    } else {
      console.log('inserting at first position, no inherit');
    }

    snippetCharacters.value.splice(index, 0, ...newCharacters);
  }

  /**
   * Deletes characters between the specified start and end indexes (both inclusive).
   *
   * @param {number} startIndex - The index of the first character to delete.
   * @param {number} endIndex - The index of the last character to delete.
   * @return {void} This function does not return anything.
   */
  function deleteCharactersBetweenIndexes(startIndex: number, endIndex: number) {
    const charsToDeleteCount: number = endIndex - startIndex;

    snippetCharacters.value.splice(startIndex, charsToDeleteCount + 1);
  }

  function insertSnippetIntoChain(): void {
    const startAtIndex: number = beforeStartIndex.value ? beforeStartIndex.value + 1 : 0;
    let charsToDeleteCount = 0;

    if (afterEndIndex.value) {
      charsToDeleteCount = afterEndIndex.value - startAtIndex;
    } else {
      charsToDeleteCount = totalCharacters.value.length;
    }

    totalCharacters.value.splice(startAtIndex, charsToDeleteCount, ...snippetCharacters.value);
    initialCharacters.value = [...snippetCharacters.value];

    if (afterEndIndex.value === null) {
      afterEndIndex.value = null;
    } else if (beforeStartIndex.value === null) {
      afterEndIndex.value = snippetCharacters.value.length;
    } else {
      afterEndIndex.value = beforeStartIndex.value + snippetCharacters.value.length + 1;
    }
  }

  function annotateCharacters(characters: Character[], annotation: Annotation) {
    console.time('chars');
    characters.forEach((c: Character, index: number, arr: Character[]) =>
      c.annotations.push({
        uuid: annotation.data.uuid,
        type: annotation.data.type,
        isFirstCharacter: index === 0 ? true : false,
        isLastCharacter: index === arr.length - 1 ? true : false,
      }),
    );
    console.timeEnd('chars');
  }

  function removeAnnotationFromCharacters(annotationUuid: string) {
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

  function resetCharacters(): void {
    snippetCharacters.value = [];
    totalCharacters.value = [];
    initialCharacters.value = [];
    beforeStartIndex.value = null;
    afterEndIndex.value = null;
  }

  return {
    afterEndIndex,
    beforeStartIndex,
    initialCharacters,
    snippetCharacters,
    totalCharacters,
    annotateCharacters,
    deleteCharactersBetweenIndexes,
    initializeCharacters,
    insertCharactersAtIndex,
    insertSnippetIntoChain,
    nextCharacters,
    previousCharacters,
    removeAnnotationFromCharacters,
    replaceCharactersBetweenIndizes,
    resetCharacters,
  };
}
