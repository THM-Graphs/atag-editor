import { ref } from 'vue';
import { useAppStore } from '../store/app';
import { Collection, NetworkPostData, Text } from '../models/types';

const { api } = useAppStore();

export function useNetwork() {
  // Data
  const updatedNodes = ref<(Collection | Text)[]>([]);

  // Fetch status
  const isFetching = ref<boolean>(false);
  const error = ref<any>(null);

  async function updateNetwork(data: NetworkPostData): Promise<(Collection | Text)[]> {
    isFetching.value = true;

    try {
      updatedNodes.value = await api.updateNetwork(data);
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error updating network:', e);
    } finally {
      isFetching.value = false;
    }

    return updatedNodes.value;
  }

  return {
    error,
    isFetching,
    updateNetwork,
  };
}
