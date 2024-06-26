import { ref } from 'vue';
import ICharacter from '../models/ICharacter';

const characters = ref<ICharacter[]>([]);
const initialCharacters = ref<ICharacter[]>([]);

function initializeCharacters(characterData: ICharacter[]): void {
  characters.value = characterData;
  initialCharacters.value = [...characterData];
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

/**
 * Deletes characters between the specified start and end indexes (both inclusive).
 *
 * @param {number} startIndex - The index of the first character to delete.
 * @param {number} endIndex - The index of the last character to delete.
 * @return {void} This function does not return anything.
 */
function deleteCharactersBetweenIndexes(startIndex: number, endIndex: number) {
  const charsToDeleteCount: number = endIndex - startIndex;

  characters.value.splice(startIndex, charsToDeleteCount + 1);
}

function resetCharacters(): void {
  characters.value = [];
}

/**
 * Store for managing the state of characters inside an editor instance. When the component is mounted,
 * the store is initialized with the fetched characters from the database. When the component is unmounted,
 * the store is reset (character array is emptied).
 */
export function useCharactersStore() {
  return {
    characters,
    initialCharacters,
    deleteCharactersBetweenIndexes,
    initializeCharacters,
    insertCharactersBetweenIndexes,
    resetCharacters,
  };
}
