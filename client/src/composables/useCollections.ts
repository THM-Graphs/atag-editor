import { DeepReadonly, readonly, ref } from 'vue';
import { useAppStore } from '../store/app';
import {
  Collection,
  CollectionSearchParams,
  CursorData,
  PaginationData,
  PaginationResult,
} from '../models/types';

const { api } = useAppStore();

export function useCollections() {
  // Data
  const collection = ref<Collection>(null);
  const collections = ref<Collection[]>([]);
  const pagination = ref<PaginationData>(null);

  // Fetch status
  const isFetching = ref<boolean>(false);
  const error = ref<any>(null);

  async function fetchCollections(
    parentUuid: string | null,
    params: {
      filters: DeepReadonly<CollectionSearchParams> | CollectionSearchParams;
      cursor: CursorData | null;
    },
  ) {
    isFetching.value = true;

    try {
      const result: PaginationResult<Collection[]> = await api.getCollections(parentUuid, params);

      collections.value = result.data;
      pagination.value = result.pagination;
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error fetching collections:', e);
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
