import { ref } from 'vue';
import { IGuidelines } from '../models/IGuidelines';

const allOptions = ref<string[]>([]);
const selectedOptions = ref<string[]>([]);

/**
 * Store for filtering the displayed annotation types in the editor instance. The store's data are derived from
 * the guidelines store and is initialized from there.
 */
export function useFilterStore() {
  /**
   * Initializes the store with the provided data. Called from the guidelines store
   *
   * @param {IGuidelines} guidelines - The guidelines data to initialize with.
   * @return {void} This function does not return anything.
   */
  function initializeFilter(guidelines: IGuidelines): void {
    allOptions.value = guidelines.annotations.types.map(type => type.type);
    // TODO: This will be important as soon as a defaultSelected key is added to the guidelines JSON
    selectedOptions.value = guidelines.annotations.types.map(type => type.type);
  }

  /**
   * Selects or deselects all options based on the current state of selectedOptions and allOptions.
   *
   * @return {void} This function does not return anything.
   */
  function selectAllOptions(): void {
    if (selectedOptions.value.length === allOptions.value.length) {
      selectedOptions.value = [];
    } else {
      selectedOptions.value = [...allOptions.value];
    }
  }

  return {
    allOptions,
    selectedOptions,
    initializeFilter,
    selectAllOptions,
  };
}
