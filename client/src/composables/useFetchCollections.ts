import { MaybeRefOrGetter, readonly, ref, toValue } from 'vue';
import { CollectionPreview, PaginationData, PaginationResult } from '../models/types';
import ApiService from '../services/api';

const api: ApiService = new ApiService();

export function useFetchCollections(url: MaybeRefOrGetter<string> | string) {
  // Data
  const collections = ref<CollectionPreview[]>([]);
  const pagination = ref<PaginationData>(null);

  // Fetch status
  const isFetching = ref<boolean>(false);
  const error = ref<any>(null);

  async function fetchCollections() {
    isFetching.value = true;

    const unwrappedUrl: string = toValue(url);

    try {
      const result: PaginationResult<CollectionPreview[]> = await api.getCollections(unwrappedUrl);

      collections.value = result.data;
      pagination.value = result.pagination;
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error fetching guidelines:', e);
    } finally {
      isFetching.value = false;
    }
  }

  return {
    collections: readonly(collections),
    error: readonly(error),
    isFetching: readonly(isFetching),
    pagination: readonly(pagination),
    fetchCollections,
  };
}
