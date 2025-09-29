import { computed, ref } from 'vue';
import { Collection, CollectionNetworkActionType, CollectionPreview } from '../models/types';

// This is only a mirror of the selectedRows ref from the PrimeVue table component
const tableSelection = ref<CollectionPreview[]>([]);
const parentCollection = ref<Collection | null>(null);

// These are the collections that are passed to the action modal
const actionTargetCollections = ref<CollectionPreview[]>([]);

const isActionModalVisible = ref(false);
const currentActionType = ref<CollectionNetworkActionType | null>(null);
const currentActionInitiator = ref<'row' | 'toolbar'>(null);

// These are the collection manage operations which are allowed in the current scope.
// "dereference" and "move" for example can only be executed when the selected collections
// have a parent collection from which they can be detached.
const allowedEditOperations = computed<CollectionNetworkActionType[]>(() => {
  const alwaysAllowed: CollectionNetworkActionType[] = ['reference'];

  const allowed: CollectionNetworkActionType[] = [...alwaysAllowed];

  if (parentCollection.value) {
    allowed.push('dereference', 'move');
  }

  return allowed;
});

export function useCollectionManagerStore() {
  function setSelection(collections: CollectionPreview[]) {
    tableSelection.value = collections;
  }

  function openActionModal(
    actionType: CollectionNetworkActionType,
    collections: CollectionPreview[],
    initiator: 'row' | 'toolbar',
  ) {
    currentActionType.value = actionType;
    actionTargetCollections.value = collections;
    currentActionInitiator.value = initiator;
    isActionModalVisible.value = true;
  }

  function setParentCollection(collection: Collection | null) {
    parentCollection.value = collection;
  }

  return {
    actionTargetCollections,
    allowedEditOperations,
    currentActionType,
    isActionModalVisible,
    parentCollection,
    tableSelection,
    openActionModal,
    setParentCollection,
    setSelection,
  };
}
