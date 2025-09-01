import { computed, readonly, ref } from 'vue';
import { watchDebounced } from '@vueuse/core';
import { CollectionSearchParams } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';

/**
 * Composable function for managing search parameters and generating a URL for fetching collection data. An optional UUID
 * parameter determines if the URL is scoped. If yes, only collections that have the collection with given UUID
 * as parent are fetched. If no, all collections are fetched.
 *
 * Currently used for displaying (sub-)collections in a table, combined with pagination. Returns the search parameter object
 * as well as the URL generated from it.
 *
 * The object contains the following properties:
 * - `fetchUrl`: A reactive string property with the URL to fetch the data from.
 * - `searchParams`: A reactive object property with the search parameters. The object is readonly, but its properties are not. The properties are:
 *   - `searchInput`: The search string to search for in the collection.
 *   - `nodeLabels`: An array of node labels to filter by.
 *   - `offset`: The number of results to skip in the result set.
 *   - `rowCount`: The number of results to return in the result set.
 *   - `sortField`: The field to sort by.
 *   - `sortDirection`: The direction to sort by.
 * - `resetSearchParams`: A function that resets the search parameters to their default values.
 * - `updateSearchParams`: A function that updates the search parameters with given data. These are partials, so not all parameters will be updated.
 *
 * @param {number} rowCount - The number of rows to fetch per page (optional).
 * @returns {Object} An object with reactive properties for performing a search query on the backend.
 */
export function useCollectionSearch(rowCount?: number) {
  const BASE_FETCH_URL: string = '/api/collections';
  const INPUT_DELAY: number = 300; /* delay after input change in ms */
  const DEFAULT_ROW_COUNT: number | null = rowCount ?? null;

  const { availableCollectionLabels } = useGuidelinesStore();

  // UUID of the parent collection (if there is one)
  const parentUuid = ref<string>('');

  const searchParams = ref<CollectionSearchParams>({
    searchInput: '',
    nodeLabels: availableCollectionLabels.value,
    offset: 0,
    rowCount: DEFAULT_ROW_COUNT,
    sortField: '',
    sortDirection: 'asc' as 'asc' | 'desc',
  });

  // Separate ref for the debounced search. Can be manipulated directly on search params reset
  const debouncedSearchInput = ref<string>('');

  const fetchUrl = computed<string>(() => {
    const path = parentUuid.value
      ? `${BASE_FETCH_URL}/${parentUuid.value}/collections`
      : BASE_FETCH_URL;

    const urlParams: URLSearchParams = new URLSearchParams();

    urlParams.set('sort', searchParams.value.sortField);
    urlParams.set('order', searchParams.value.sortDirection);
    urlParams.set('skip', searchParams.value.offset.toString());
    urlParams.set('search', debouncedSearchInput.value);
    urlParams.set('nodeLabels', searchParams.value.nodeLabels.join(','));

    // Optional parameter - only set if it is not null
    if (searchParams.value.rowCount !== null) {
      urlParams.set('limit', searchParams.value.rowCount.toString());
    }

    return `${path}?${urlParams.toString()}`;
  });

  // Watch searchInput and debounce it manually. This is a workaround to prevent double fetching - before,
  // the input was debounced directly with refDebounced, but since data fetching happens directly after resetting,
  // the old search input was used and after the debounced update another fetch was triggered.
  watchDebounced(() => searchParams.value.searchInput, updateDebouncedSearchInput, {
    debounce: INPUT_DELAY,
  });

  /**
   * Resets the search parameters to their default values. Currently only used when the uuid of a route changes
   * and new data need to be fetched without any filters applied.
   *
   * @returns {void} This function does not return any value.
   */
  function resetSearchParams(): void {
    searchParams.value = {
      searchInput: '',
      nodeLabels: availableCollectionLabels.value,
      offset: 0,
      rowCount: DEFAULT_ROW_COUNT,
      sortField: '',
      sortDirection: 'asc',
    };

    // Immediately reset the debounced value to prevent double fetching
    debouncedSearchInput.value = '';
  }

  function updateDebouncedSearchInput(newValue: string) {
    debouncedSearchInput.value = newValue;
  }

  /**
   * Updates the search parameters with given data. These are partials, so not all parameters will be updated.
   *
   * @param {CollectionSearchParams} params - Object with the parameters to update.s
   * @returns {void} This function does not return any value.
   */
  function updateSearchParams(params: CollectionSearchParams): void {
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined && name in searchParams.value) {
        searchParams.value[name] = value;
      }
    }
  }

  function updateUuid(newUuid: string | undefined): void {
    parentUuid.value = newUuid;
  }

  return {
    fetchUrl: readonly(fetchUrl),
    searchParams: readonly(searchParams),
    resetSearchParams,
    updateSearchParams,
    updateUuid,
  };
}
