import { ref } from 'vue';
import ICharacter from '../models/ICharacter';

/**
 * Store for managing the state of characters inside an editor instance. When the component is mounted,
 * the store is initialized with the fetched characters from the database. When the component is unmounted,
 * the store is reset (character array is emptied).
 */
export const useCharactersStore = () => {
  const characters = ref<ICharacter[]>([]);

  function initializeCharacters(initialCharacters: ICharacter[]): void {
    characters.value = initialCharacters;
  }

  function insertCharactersBetweenIndexes(
    startIndex: number,
    endIndex: number,
    newCharacters: ICharacter[],
    action: 'insert' | 'replace',
  ): void {
    const charsToDeleteCount: number =
      action === 'insert' ? endIndex - startIndex : endIndex - startIndex + 1;
    const from: number = action === 'insert' ? startIndex + 1 : startIndex;

    console.time('insert');
    characters.value.splice(from, charsToDeleteCount, ...newCharacters);
    console.timeEnd('insert');
  }

  function deleteCharactersBetweenIndexes(startIndex: number, endIndex: number) {
    characters.value.splice(startIndex, endIndex - startIndex + 1);
  }

  function resetCharacters(): void {
    characters.value = [];
  }

  return {
    characters,
    deleteCharactersBetweenIndexes,
    initializeCharacters,
    insertCharactersBetweenIndexes,
    resetCharacters,
  };
};
