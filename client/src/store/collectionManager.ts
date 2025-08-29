import { computed, ref } from 'vue';
import { Collection, CollectionNetworkActionType } from '../models/types';

// This is only a mirror of the selectedRows ref from the PrimeVue table component
const tableSelection = ref<Collection[]>([]);
const parentCollection = ref<Collection | null>(null);

// These are the collections that are passed to the action modal
const actionTargetCollections = ref<Collection[]>([]);

const isActionModalVisible = ref(false);
const currentActionType = ref<CollectionNetworkActionType | null>(null);
const currentActionInitiator = ref<'row' | 'toolbar'>(null);

// These are the collection manage operations which are allowed in the current scope.
// "dereference" and "move" for example can only be executed when the selected collections
// have a parent collection from which they can be detached.
const allowedEditOperations = computed<CollectionNetworkActionType[]>(() => {
  const alwaysAllowed: CollectionNetworkActionType[] = ['copy'];

  const allowed: CollectionNetworkActionType[] = [...alwaysAllowed];

  if (parentCollection.value) {
    allowed.push('dereference', 'move');
  }

  return allowed;
});

export function useCollectionManagerStore() {
  function setSelection(collections: Collection[]) {
    tableSelection.value = collections;
  }

  function openActionModal(
    actionType: CollectionNetworkActionType,
    collections: Collection[],
    initiator: 'row' | 'toolbar',
  ) {
    currentActionType.value = actionType;
    actionTargetCollections.value = collections;
    currentActionInitiator.value = initiator;
    isActionModalVisible.value = true;
  }

  function closeActionModal() {
    reset();
  }

  function openRowAction(actionType: CollectionNetworkActionType, collection: Collection) {
    openActionModal(actionType, [collection], 'row');
  }

  function openBulkAction(actionType: CollectionNetworkActionType) {
    if (tableSelection.value.length === 0) {
      return false;
    }

    openActionModal(actionType, [...tableSelection.value], 'toolbar');

    return true;
  }

  function setParentCollection(collection: Collection | null) {
    parentCollection.value = collection;
  }

  function reset() {
    currentActionType.value = null;
    currentActionInitiator.value = null;
    isActionModalVisible.value = false;
    actionTargetCollections.value = [];
  }

  return {
    actionTargetCollections,
    allowedEditOperations,
    currentActionType,
    isActionModalVisible,
    parentCollection,
    tableSelection,
    closeActionModal,
    openActionModal,
    openBulkAction,
    openRowAction,
    reset,
    setParentCollection,
    setSelection,
  };
}
