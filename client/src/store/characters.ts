import { ref } from 'vue';
import { defineStore } from 'pinia';
import ICharacter from '../models/ICharacter';

export const useCharactersStore = defineStore('characters', () => {
  const characters = ref<ICharacter[]>([]);

  function initialize(initialCharacters: ICharacter[]): void {
    characters.value = initialCharacters;
  }

  // TODO: Replace with $patch?
  function update(newCharacters): void {
    characters.value = newCharacters;
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

  function $reset(): void {
    characters.value = [];
    console.log(characters.value);
  }

  return {
    characters,
    deleteCharactersBetweenIndexes,
    initialize,
    insertCharactersBetweenIndexes,
    $reset,
    update,
  };
});
