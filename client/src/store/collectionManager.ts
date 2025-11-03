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
const pathToActiveCollection = ref<Collection[]>([]);

const asyncOperationRunning = ref<boolean>(false);

export function useCollectionManagerStore() {
  async function fetchCollectionDetails(uuid: string): Promise<CollectionAccessObject> {
    // TODO: Handle errors
    const [collection, annotations, texts] = await Promise.all([
      api.getCollection(uuid),
      api.getAnnotations('collection', uuid),
      api.getTexts(uuid),
    ]);

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

    levels.value[index].activeCollection =
      levels.value[index].data.find(c => c.data.uuid === uuid) ?? null;

    activeCollection.value = cao;
  }

  async function restoreDefaultView(): Promise<void> {
    // Reset path selection (no selected item in column, nothing displayed in edit pane)
    levels.value[0].activeCollection = null;
    setPathToActiveCollection([]);
    setCollectionActive(null);

    // Keep only first level
    levels.value = levels.value.slice(0, 1);
  }

  function setCollectionActive(cao: CollectionAccessObject): void {
    activeCollection.value = cao;
  }

  function setPathToActiveCollection(path: Collection[]): void {
    pathToActiveCollection.value = path;
  }

  async function validatePath(uuidString: string): Promise<Collection[]> {
    return await api.validateCollectionPath(uuidString);
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
    setPathToActiveCollection,
    validatePath,
  };
}
