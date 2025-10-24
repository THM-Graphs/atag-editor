import { computed, ref } from 'vue';
import { AnnotationData, Collection, CollectionAccessObject, Level, Text } from '../models/types';
import { useAppStore } from './app';

const { api } = useAppStore();

const levels = ref<Level[]>([
  {
    data: [],
    activeCollection: null,
    level: 0,
    parentUuid: null,
  },
]);

const activeCollection = ref<CollectionAccessObject | null>(null);
const pathToActiveCollection = computed<Collection[]>(() => {
  if (!activeCollection.value) {
    return [];
  }

  let items: Collection[] = [];

  for (const level of levels.value) {
    items.push(level.activeCollection);

    if (level.activeCollection.data.uuid === activeCollection.value?.collection?.data?.uuid) {
      break;
    }
  }

  return items;
});

const asyncOperationRunning = ref<boolean>(false);

export function useCollectionManagerStore() {
  async function fetchCollectionDetails(uuid: string): Promise<CollectionAccessObject> {
    // TODO: Handle errors
    // TODO: Fire requests simultaneously or all at once to improve performance
    const collection: Collection = await api.getCollection(uuid);
    const annotations: AnnotationData[] = await api.getAnnotations('collection', uuid);
    const texts: Text[] = await api.getTexts(uuid);

    const cao: CollectionAccessObject = { collection, texts, annotations };

    return cao;
  }

  async function activateCollection(index: number, uuid: string): Promise<void> {
    const cao: CollectionAccessObject = await fetchCollectionDetails(uuid);

    const currentSecondColumn: Level = levels.value[index + 1];

    // Remove levels AFTER index
    levels.value = [...levels.value.slice(0, index + 1)];

    if (uuid === currentSecondColumn?.parentUuid) {
      levels.value.push({ ...currentSecondColumn, activeCollection: null });
    } else {
      levels.value.push({
        activeCollection: null,
        level: 0,
        data: [],
        parentUuid: uuid,
      });
    }

    levels.value[index].activeCollection = levels.value[index].data.find(c => c.data.uuid === uuid);

    activeCollection.value = cao;
  }

  async function restoreDefaultView(): Promise<void> {
    // Reset path selection (no selected item in column, nothing displayed in edit pane)
    levels.value[0].activeCollection = null;
    setCollectionActive(null);

    // Keep only first level
    levels.value = levels.value.slice(0, 1);
  }

  function setCollectionActive(cao: CollectionAccessObject): void {
    activeCollection.value = cao;
  }

  return {
    asyncOperationRunning,
    levels,
    pathToActiveCollection,
    activeCollection,
    fetchCollectionDetails,
    activateCollection,
    restoreDefaultView,
    setCollectionActive,
  };
}
