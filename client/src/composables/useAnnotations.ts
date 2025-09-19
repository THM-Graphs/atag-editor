import { readonly, ref } from 'vue';
import { useAppStore } from '../store/app';
import { AnnotationData } from '../models/types';

const { api } = useAppStore();

/**
 * Composable for fetching annotations. Currently only used for Collection annotations since
 * Text annotations are fetched from inside the `annotations` store.
 */
export function useAnnotations() {
  // Data
  const annotations = ref<AnnotationData[]>([]);

  // Fetch status
  const isFetching = ref<boolean>(false);
  const error = ref<any>(null);

  async function fetchAnnotations(
    nodeType: 'collection' | 'text',
    nodeUuid: string | null,
  ): Promise<AnnotationData[]> {
    isFetching.value = true;

    try {
      const fetchedAnnotations: AnnotationData[] = await api.getAnnotations(nodeType, nodeUuid);

      annotations.value = fetchedAnnotations;
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error fetching guidelines:', e);
    } finally {
      isFetching.value = false;
    }

    return annotations.value;
  }

  return {
    annotations,
    error: readonly(error),
    isFetching: readonly(isFetching),
    fetchAnnotations,
  };
}
