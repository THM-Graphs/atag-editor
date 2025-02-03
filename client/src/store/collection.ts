import { ref } from 'vue';
import ICollection from '../models/ICollection';
import { Collection } from '../models/types';

const collection = ref<ICollection>();
const initialCollection = ref<ICollection>();
const collectionNodeLabel = ref<string>();

function initializeCollection(newCollection: Collection): void {
  collection.value = newCollection.data;
  collectionNodeLabel.value = newCollection.nodeLabel;
  initialCollection.value = { ...newCollection.data };
}
export function useCollectionStore() {
  return {
    collection,
    initialCollection,
    collectionNodeLabel,
    initializeCollection,
  };
}
