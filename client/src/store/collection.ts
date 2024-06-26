import { ref } from 'vue';
import ICollection from '../models/ICollection';

const collection = ref<ICollection>();
const initialCollection = ref<ICollection>();

function initializeCollection(collectionData: ICollection): void {
  collection.value = collectionData;
  initialCollection.value = { ...collectionData };
}
export function useCollectionStore() {
  return {
    collection,
    initialCollection,
    initializeCollection,
  };
}
