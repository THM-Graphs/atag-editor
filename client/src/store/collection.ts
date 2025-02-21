import { ref } from 'vue';
import ICollection from '../models/ICollection';
import { Collection } from '../models/types';

const collection = ref<ICollection>();
const initialCollection = ref<ICollection>();
const collectionNodeLabels = ref<string[]>([]);

function initializeCollection(newCollection: Collection): void {
  collection.value = newCollection.data;
  collectionNodeLabels.value = newCollection.nodeLabels;
  initialCollection.value = { ...newCollection.data };
}
export function useCollectionStore() {
  return {
    collection,
    initialCollection,
    collectionNodeLabels,
    initializeCollection,
  };
}
