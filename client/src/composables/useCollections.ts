import { DeepReadonly, readonly, ref } from 'vue';
import { useAppStore } from '../store/app';
import {
  Collection,
  CollectionPreview,
  CollectionSearchParams,
  PaginationData,
  PaginationResult,
} from '../models/types';

const { api } = useAppStore();

export function useCollections() {
  // Data
  const collection = ref<Collection>(null);
  const collections = ref<CollectionPreview[]>([]);
  const pagination = ref<PaginationData>(null);

  // Fetch status
  const isFetching = ref<boolean>(false);
  const error = ref<any>(null);

  async function fetchCollections(
    parentUuid: string | null,
    params: DeepReadonly<CollectionSearchParams> | CollectionSearchParams,
  ) {
    isFetching.value = true;

    try {
      const result: PaginationResult<CollectionPreview[]> = await api.getCollections(
        parentUuid,
        params,
      );

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
    collection,
    collections: readonly(collections),
    error: readonly(error),
    isFetching: readonly(isFetching),
    pagination: readonly(pagination),
    fetchCollections,
  };
}
