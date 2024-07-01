import { ref } from 'vue';
import ICharacter from '../models/ICharacter';

const characters = ref<ICharacter[]>([]);
const initialCharacters = ref<ICharacter[]>([]);

function initializeCharacters(characterData: ICharacter[]): void {
  characters.value = characterData;
  initialCharacters.value = [...characterData];
}

/**
 * Replaces characters between the specified start and end indexes with the given array of new characters.
 * Indexes are calculated during input event handling. Start and end index are inclusive and therefore deleted as well.
 *
 * @param {number} startIndex - The index of the first character to replace.
 * @param {number} endIndex - The index of the last character to replace.
 * @param {ICharacter[]} newCharacters - The array of new characters to insert.
 * @return {void} This function does not return anything.
 */
function replaceCharactersBetweenIndizes(
  startIndex: number,
  endIndex: number,
  newCharacters: ICharacter[],
): void {
  const charsToDeleteCount: number = endIndex - startIndex + 1;
  characters.value.splice(startIndex, charsToDeleteCount, ...newCharacters);
}

/**
 * Inserts new characters at the specified index in the characters array. Indexes are calculated during input event handling.
 *
 * @param {number} index - The index at which to insert the new characters.
 * @param {ICharacter[]} newCharacters - The array of new characters to insert.
 * @return {void} This function does not return anything.
 */
function insertCharactersAtIndex(index: number, newCharacters: ICharacter[]): void {
  characters.value.splice(index, 0, ...newCharacters);
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
  initialCharacters.value = [];
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
    insertCharactersAtIndex,
    replaceCharactersBetweenIndizes,
    resetCharacters,
  };
}
