import { ref } from 'vue';
import { IGuidelines } from '../models/IGuidelines';

const allOptions = ref<string[]>([]);
const defaultOptions = ref<string[]>([]);
const selectedOptions = ref<string[]>([]);

/**
 * Store for filtering the displayed annotation types in the editor instance. The store's data are derived from
 * the guidelines store and is initialized from there.
 */
export function useFilterStore() {
  /**
   * Initializes the store with the provided data. Called from the guidelines store where the default options are stored.
   *
   * @param {IGuidelines} guidelines - The guidelines data to initialize with.
   * @return {void} This function does not return anything.
   */
  function initializeFilter(guidelines: IGuidelines): void {
    allOptions.value = guidelines.annotations.types.map(type => type.type);
    defaultOptions.value = guidelines.annotations.types
      .filter(type => type.defaultSelected)
      .map(type => type.type);
    selectedOptions.value = [...defaultOptions.value];
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

  /**
   * Resets the selected options to the default options.
   *
   * @return {void} This function does not return any value.
   */
  function selectDefaultOptions(): void {
    selectedOptions.value = [...defaultOptions.value];
  }

  return {
    allOptions,
    selectedOptions,
    initializeFilter,
    selectAllOptions,
    selectDefaultOptions,
  };
}
