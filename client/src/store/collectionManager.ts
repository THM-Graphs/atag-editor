import { computed, ref } from 'vue';
import { Collection, CollectionAccessObject, Level } from '../models/types';
import { useAppStore } from './app';
import { useRefHistory } from '@vueuse/core';

const { api } = useAppStore();

const levels = ref<Level[]>([]);

const activeCollection = ref<CollectionAccessObject | null>(null);
const pathToActiveCollection = ref<Collection[]>([]);

const previousPaths = useRefHistory(pathToActiveCollection, {
  capacity: 5,
});

const mode = ref<'view' | 'edit' | 'create'>('view');
const asyncOperationRunning = ref<boolean>(false);
const canNavigate = computed<boolean>(() => {
  if (mode.value === 'edit' || mode.value === 'create') {
    return false;
  }

  return true;
});

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
        collections: [],
        parentUuid: uuid,
      });
    }

    levels.value[index].activeCollection =
      levels.value[index].collections.find(c => c.data.data.uuid === uuid).data ?? null;

    activeCollection.value = cao;
  }

  function createNewUrlPathElements(uuid: string, index: number): string[] {
    // Update URL path
    const uuidPath: string | null = new URLSearchParams(window.location.search).get('path');
    const currentUuids: string[] = uuidPath?.split(',') ?? [];
    const newUuids: string[] = [...currentUuids.slice(0, index), uuid];

    return newUuids;
  }

  function createNewUrlPath(uuid: string, index: number): string {
    return createNewUrlPathElements(uuid, index).join(',');
  }

  async function restoreDefaultView(): Promise<void> {
    // Reset path selection (no selected item in column, nothing displayed in edit pane)
    levels.value[0].activeCollection = null;
    setPathToActiveCollection([]);
    setCollectionActive(null);

    // Keep only first level
    levels.value = levels.value.slice(0, 1);
  }

  function restorePath(): void {
    if (previousPaths.canUndo) {
      previousPaths.undo();
    }
  }

  function setCollectionActive(cao: CollectionAccessObject): void {
    activeCollection.value = cao;
  }

  function setPathToActiveCollection(path: Collection[]): void {
    pathToActiveCollection.value = path;
  }

  function setMode(newMode: 'view' | 'edit' | 'create'): void {
    mode.value = newMode;
  }

  async function updateLevelsAndFetchData(newPath: Collection[]) {
    setPathToActiveCollection(newPath);
    updateLevels();

    if (newPath.length === 0) {
      setCollectionActive(null);

      return;
    }

    const cao: CollectionAccessObject = await fetchCollectionDetails(
      newPath[newPath.length - 1].data.uuid,
    );

    setCollectionActive(cao);
  }

  function updateLevels(): void {
    const newPathLength: number = pathToActiveCollection.value.length;

    // Keep last column (when URL is only truncated and not changed, or the navigation
    // happend via breadcrumbs, the children should not be refetched)
    const currentLastColumn: Level = levels.value[newPathLength];

    if (levels.value.length > newPathLength) {
      // slice levels to match new path length
      levels.value = levels.value.slice(0, newPathLength);
    } else if (newPathLength > levels.value.length) {
      // Fill up with empty levels
      const diff: number = newPathLength - levels.value.length;

      for (let i = 0; i < diff; i++) {
        levels.value.push({
          collections: [],
          activeCollection: null,
          parentUuid: null,
        });
      }
    }

    // Then: Set activeCollection and parentUuid of each level
    levels.value.forEach((level: Level, index: number) => {
      level.activeCollection = pathToActiveCollection.value[index];
      level.parentUuid = levels.value[index - 1]?.activeCollection?.data.uuid ?? null;
    });

    const lastActiveCollectionIsSame: boolean =
      levels.value[levels.value.length - 1]?.activeCollection?.data.uuid ===
      currentLastColumn?.parentUuid;

    // Then: Add level for the children of last selection in path. Is either an empty level
    // or an existing level (see comments above)
    if (lastActiveCollectionIsSame && currentLastColumn) {
      levels.value.push({ ...currentLastColumn, activeCollection: null });
    } else {
      // Else, Add empty level
      levels.value.push({
        activeCollection: null,
        collections: [],
        parentUuid: levels.value[levels.value.length - 1]?.activeCollection?.data.uuid ?? null,
      });
    }
  }

  async function validatePath(uuidString: string): Promise<Collection[]> {
    return await api.validateCollectionPath(uuidString);
  }

  return {
    asyncOperationRunning,
    canNavigate,
    levels,
    mode,
    pathToActiveCollection,
    activeCollection,
    activateCollection,
    createNewUrlPath,
    createNewUrlPathElements,
    fetchCollectionDetails,
    restoreDefaultView,
    restorePath,
    setCollectionActive,
    setMode,
    setPathToActiveCollection,
    updateLevels,
    updateLevelsAndFetchData,
    validatePath,
  };
}
