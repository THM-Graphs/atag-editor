import { ref } from 'vue';
import { NetworkPostData } from '../models/types';
import { buildFetchUrl } from '../utils/helper/helper';

export function useEditCollectionNetwork() {
  const isFetching = ref<boolean>(false);
  const isDone = ref<boolean>(false);
  const error = ref(null);

  const BASE_FETCH_URL: string = '/api/network';

  async function executeAction(data: NetworkPostData): Promise<void> {
    isFetching.value = true;

    const url: string = buildFetchUrl(BASE_FETCH_URL);

    try {
      const response: Response = await fetch(url, {
        method: 'POST',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.log(response);
        throw new Error('Could not be saved, try again...');
      }
    } catch (e: unknown) {
      // Handle in component that uses this composable
      throw e;
    } finally {
      isFetching.value = false;
      isDone.value = true;
    }
  }

  return {
    error,
    isDone,
    isFetching,
    executeAction,
  };
}
