import { ref } from 'vue';
import { CollectionNetworkActionType } from '../models/types';

export function useEditCollectionNetwork() {
  const isSaving = ref<boolean>(false);
  const isDone = ref<boolean>(false);
  const error = ref(null);

  const BASE_FETCH_URL: string = '/api/collection-network';

  function executeAction(type: CollectionNetworkActionType) {
    console.log('execute ', type + ' action');
  }

  return {
    isSaving,
    error,
    executeAction,
  };
}
