import { ref } from 'vue';
import ICollection from '../models/ICollection';

const collection = ref<ICollection>();

function initializeCollection(collectionData: ICollection): void {
  collection.value = collectionData;
}
export function useCollectionStore() {
  return {
    collection,
    initializeCollection,
  };
}
