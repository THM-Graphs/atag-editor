import { computed, ref } from 'vue';
import { AnnotationData, Collection, CollectionAccessObject, Level, Text } from '../models/types';
import { useAppStore } from './app';

const { api } = useAppStore();

const levels = ref<Level[]>([
  {
    data: [],
    activeUuid: null,
    level: 0,
    parentUuid: null,
  },
]);

const activeCollection = ref<CollectionAccessObject | null>(null);
const pathToActiveCollection = computed<Collection[]>(() => {
  if (!activeCollection.value) {
    return [];
  }

  let items = [];

  for (const level of levels.value) {
    const activeInColumn: Collection | null = level.data.find(
      c => c.data.uuid === level.activeUuid,
    );

    if (activeInColumn) {
      items.push(activeInColumn);
    }

    if (level.activeUuid === activeCollection.value?.collection?.data?.uuid) {
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

    // Remove levels AFTER index and replace the first new level with fetched data
    levels.value = [
      ...levels.value.slice(0, index + 1),
      {
        activeUuid: null,
        level: 0,
        data: [],
        parentUuid: uuid,
      },
    ];

    levels.value[index].activeUuid = uuid;

    activeCollection.value = cao;
  }

  async function restoreDefaultView(): Promise<void> {
    // Reset path selection (no selected item in column, nothing displayed in edit pane)
    levels.value[0].activeUuid = null;
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
