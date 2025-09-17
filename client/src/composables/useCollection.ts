import { readonly, ref } from 'vue';
import { Collection } from '../models/types';
import { useAppStore } from '../store/app';

const { api } = useAppStore();

export function useCollection() {
  // Data
  const collection = ref<Collection>(null);

  // Fetch status
  const isFetching = ref<boolean>(false);
  const error = ref<any>(null);

  async function fetchCollection(uuid: string) {
    isFetching.value = true;

    try {
      const result: Collection = await api.getCollection(uuid);

      collection.value = result;
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error fetching guidelines:', e);
    } finally {
      isFetching.value = false;
    }

    return collection.value;
  }

  return {
    collection,
    error: readonly(error),
    isFetching: readonly(isFetching),
    fetchCollection,
  };
}
