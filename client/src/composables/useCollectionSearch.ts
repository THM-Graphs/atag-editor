import { computed, readonly, ref, toRef } from 'vue';
import { refDebounced } from '@vueuse/core';
import { CollectionSearchParams } from '../models/types';

/**
 * Composable function for managing search parameters and generating a URL for fetching collection data.
 *
 * Currently used for displaying (sub-)collections in a table, combined with pagination.
 */
export function useCollectionSearch() {
  const BASE_FETCH_URL: string = '/api/collections';
  const INPUT_DELAY: number = 300;

  const searchParams = ref<CollectionSearchParams>({
    searchInput: '',
    nodeLabels: [],
    offset: 0,
    rowCount: 10,
    sortField: '',
    sortDirection: 'asc' as 'asc' | 'desc',
  });

  const debouncedSearchInput = refDebounced<string>(
    toRef(() => searchParams.value.searchInput),
    INPUT_DELAY,
  );

  const fetchUrl = computed<string>(() => {
    const urlParams: URLSearchParams = new URLSearchParams();

    urlParams.set('sort', searchParams.value.sortField);
    urlParams.set('order', searchParams.value.sortDirection);
    urlParams.set('limit', searchParams.value.rowCount.toString());
    urlParams.set('skip', searchParams.value.offset.toString());
    urlParams.set('search', debouncedSearchInput.value);
    urlParams.set('nodeLabels', searchParams.value.nodeLabels.join(','));

    return `${BASE_FETCH_URL}?${urlParams.toString()}`;
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
      nodeLabels: [],
      offset: 0,
      rowCount: 10,
      sortField: '',
      sortDirection: 'asc',
    };
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

  return {
    fetchUrl,
    searchParams: readonly(searchParams),
    resetSearchParams,
    updateSearchParams,
  };
}
