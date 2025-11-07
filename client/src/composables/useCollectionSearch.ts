import { readonly, ref } from 'vue';
import { CollectionSearchParams } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import { useTimeoutFn } from '@vueuse/core';
import { FETCH_DELAY } from '../config/constants';

/**
 * Composable function for managing search parameters for fetching collection data. An optional UUID
 * parameter determines if only collections that have the collection with given UUID as parent are fetched.
 * If no, all collections are fetched.
 *
 * Currently used for displaying (sub-)collections in a table, combined with pagination. Returns the search parameter object.
 *
 * The object contains the following properties:
 * - `searchParams`: A reactive object property with the search parameters. The object is readonly, but its properties are not. The properties are:
 *   - `searchInput`: The search string to search for in the collection.
 *   - `nodeLabels`: An array of node labels to filter by.
 *   - `rowCount`: The number of results to return in the result set.
 *   - `sortDirection`: The direction to sort by.
 * - `resetSearchParams`: A function that resets the search parameters to their default values.
 * - `updateSearchParams`: A function that updates the search parameters with given data. These are partials, so not all parameters will be updated.
 *
 * @param {number} rowCount - The number of rows to fetch per page (optional).
 * @returns {Object} An object with reactive properties for performing a search query on the backend.
 */
export function useCollectionSearch(rowCount?: number) {
  const DEFAULT_ROW_COUNT: number | null = rowCount ?? null;

  const { availableCollectionLabels } = useGuidelinesStore();

  // UUID of the parent collection (if there is one)
  const parentUuid = ref<string>('');

  const searchParams = ref<CollectionSearchParams>({
    searchInput: '',
    nodeLabels: availableCollectionLabels.value,
    rowCount: DEFAULT_ROW_COUNT,
    sortDirection: 'asc' as 'asc' | 'desc',
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
      rowCount: DEFAULT_ROW_COUNT,
      sortDirection: 'asc',
    };
  }

  /** Debounced update of the search parameters */
  const { start: updateDebounced } = useTimeoutFn(
    (params: CollectionSearchParams) => {
      updateParams(params);
    },
    FETCH_DELAY,
    { immediate: false },
  );

  /**
   * Updates the search parameters with given data. These are partials, so not all parameters will be updated.
   * If the `immediate` option is set to true (default), the search parameters are updated immediately. If set to false,
   * the update is debounced with the time specified in `FETCH_DELAY` (currently 500ms).
   *
   * @param {CollectionSearchParams} params - The partial search parameters to update.
   * @param {{ immediate: boolean }} options - Optional options object.
   * @param {boolean} options.immediate - Whether to update the search parameters immediately or not.
   */
  function updateSearchParams(
    params: CollectionSearchParams,
    options: { immediate: boolean } = { immediate: true },
  ): void {
    const { immediate } = options;

    if (immediate) {
      updateParams(params);
    } else {
      updateDebounced(params);
    }
  }

  /**
   * Updates the search parameters with given data. These are partials, so not all parameters will be updated.
   * The search parameters are updated immediately.
   *
   * @param {CollectionSearchParams} params - The partial search parameters to update.
   */
  function updateParams(params: CollectionSearchParams): void {
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
    searchParams: readonly(searchParams),
    resetSearchParams,
    updateSearchParams,
    updateUuid,
  };
}
