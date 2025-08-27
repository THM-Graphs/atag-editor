import { ref } from 'vue';
import { NetworkPostData } from '../models/types';

export function useEditCollectionNetwork() {
  const isSaving = ref<boolean>(false);
  const isDone = ref<boolean>(false);
  const error = ref(null);

  const BASE_FETCH_URL: string = '/api/network';

  function executeAction(data: NetworkPostData) {
    console.log('execute ', data.type + ' action');
    console.log(data);
  }

  return {
    isSaving,
    error,
    executeAction,
  };
}
