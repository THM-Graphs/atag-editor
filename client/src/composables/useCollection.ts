import { readonly, ref } from 'vue';
import { Collection, CollectionCreationData, CollectionPostData } from '../models/types';
import { useAppStore } from '../store/app';

const { api } = useAppStore();

export function useCollection() {
  // Data
  const collection = ref<Collection>(null);

  // Fetch status
  const isFetching = ref<boolean>(false);
  const error = ref<any>(null);

  async function createCollection(data: CollectionCreationData): Promise<Collection> {
    isFetching.value = true;
    error.value = null;

    try {
      const result: Collection = await api.createCollection(data);

      collection.value = result;
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error fetching guidelines:', e);
    } finally {
      isFetching.value = false;
    }

    return collection.value;
  }

  async function fetchCollection(uuid: string): Promise<Collection> {
    isFetching.value = true;
    error.value = null;

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

  /**
   * Updates a collection with new data. This is a STATELESS function - it does not update the reactive collection value of the composable,
   * but is more of a wrapper for the API.
   *
   * @param {string} uuid - The collection's uuid.
   * @param {CollectionPostData} data - The new data to update the collection with.
   * @returns {Promise<Collection>} A promise which resolves with the updated collection.
   */
  async function updateCollection(uuid: string, data: CollectionPostData): Promise<Collection> {
    isFetching.value = true;
    error.value = null;

    try {
      const updatedCollection: Collection = await api.updateCollection(uuid, data);

      return updatedCollection;
    } catch (e: unknown) {
      console.error('Error fetching guidelines:', e);
    } finally {
      isFetching.value = false;
    }
  }

  return {
    collection,
    error: readonly(error),
    isFetching: readonly(isFetching),
    createCollection,
    fetchCollection,
    updateCollection,
  };
}
