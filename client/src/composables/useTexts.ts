import { readonly, ref } from 'vue';
import { useAppStore } from '../store/app';
import { Text } from '../models/types';

const { api } = useAppStore();

export function useTexts() {
  // Data
  const texts = ref<Text[]>([]);

  // Fetch status
  const isFetching = ref<boolean>(false);
  const error = ref<any>(null);

  async function fetchTexts(collectionUuid: string | null): Promise<Text[]> {
    isFetching.value = true;

    try {
      const fetchedTexts: Text[] = await api.getTexts(collectionUuid);

      texts.value = fetchedTexts;
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error fetching guidelines:', e);
    } finally {
      isFetching.value = false;
    }

    return texts.value;
  }

  return {
    error: readonly(error),
    isFetching: readonly(isFetching),
    fetchTexts,
  };
}
