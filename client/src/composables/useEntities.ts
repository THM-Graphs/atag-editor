import { readonly, ref } from 'vue';
import { useAppStore } from '../store/app';
import IEntity from '../models/IEntity';

const { api } = useAppStore();

export function useEntities() {
  // Data
  const entities = ref<IEntity[]>([]);

  // Fetch status
  const isFetching = ref<boolean>(false);
  const error = ref<any>(null);

  async function fetchEntities(nodeLabel: string, searchString: string): Promise<IEntity[]> {
    isFetching.value = true;

    try {
      const result: IEntity[] = await api.getEntities(nodeLabel, searchString);

      entities.value = result;
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error fetching entities:', e);
    } finally {
      isFetching.value = false;
    }

    return entities.value;
  }

  return {
    entities: readonly(entities),
    error: readonly(error),
    isFetching: readonly(isFetching),
    fetchEntities,
  };
}
