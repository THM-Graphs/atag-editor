import { computed, readonly, ref } from 'vue';
import { Collection, CollectionAccessObject, CollectionStatusObject, Level } from '../models/types';
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
const isFetchingCollectionDetails = ref<boolean>(false);
const canNavigate = computed<boolean>(() => {
  if (mode.value === 'edit' || mode.value === 'create') {
    return false;
  }

  return true;
});

export function useCollectionManagerStore() {
  /**
   * Fetches the collection details for a given collection UUID (data, annotations, text).
   *
   * @param {string} uuid The UUID of the collection to fetch the details for.
   * @returns {Promise<CollectionAccessObject>} A promise that resolves with the fetched collection details.
   */
  async function fetchCollectionDetails(uuid: string): Promise<CollectionAccessObject> {
    isFetchingCollectionDetails.value = true;

    // TODO: Handle errors
    const [collection, annotations, texts] = await Promise.all([
      api.getCollection(uuid),
      api.getAnnotations('collection', uuid),
      api.getTexts(uuid),
    ]);

    const cao: CollectionAccessObject = { collection, texts, annotations };

    isFetchingCollectionDetails.value = false;

    return cao;
  }

  /**
   * Removes all temporary collection items from the levels.
   *
   * Called when a creation process of a new collection is canceled and the temporary items should be removed
   * from the column.
   */
  function removeTemporaryCollectionItems() {
    levels.value.forEach(level => {
      level.collections = level.collections.filter(c => c.status !== 'temporary');
    });
  }

  /**
   * Creates a new URL path element array by inserting a new UUID at the given index.
   * The function takes the current URL path elements and inserts the new UUID at the given index.
   *
   * @param {string} uuid The UUID to be inserted into the URL path element array.
   * @param {number} index The index at which to insert the new UUID.
   * @returns {string[]} A new array with the inserted UUID.
   */
  function createNewUrlPathElements(uuid: string, index: number): string[] {
    const currentUuids: string[] = getUrlPath();
    const newUuids: string[] = [...currentUuids.slice(0, index), uuid];

    return newUuids;
  }

  /**
   * Creates a new URL `path` query by inserting a new UUID at the given index.
   *
   * The function takes the current URL path elements and inserts the new UUID at the given index.
   * The new UUID is inserted at the given index and the resulting URL path is returned as a comma-separated string.
   *
   * @param {string} uuid The UUID to be inserted into the URL path.
   * @param {number} index The index at which to insert the new UUID.
   * @returns {string} The new URL path as a string.
   */
  function createNewUrlPath(uuid: string, index: number): string {
    return createNewUrlPathElements(uuid, index).join(',');
  }

  /**
   * Finds a collection in the hierarchy by its UUID at the given index.
   *
   * @param {string} uuid The UUID of the collection to find.
   * @param {number} index The index in the hierarchy to search for the collection.
   * @returns {CollectionStatusObject | null} The collection if found, or null if not found.
   */
  function findCollectionInHierarchy(uuid: string, index: number): CollectionStatusObject | null {
    return levels.value[index].collections.find(c => c.data.data.uuid === uuid) ?? null;
  }

  /**
   * Retrieves the URL path from the current URL `path` query.
   *
   * The function takes the current URL query and extracts the 'path' parameter.
   * The extracted path is then split into an array of UUIDs.
   *
   * @returns {string[]} The URL path as an array of UUIDs. If the 'path' parameter is not found, an empty array is returned.
   */
  function getUrlPath(): string[] {
    const uuidPath: string | null = new URLSearchParams(window.location.search).get('path');

    return uuidPath?.split(',') ?? [];
  }

  /**
   * Resets the application to its default view by clearing the path selection, edit pane and keeping only the first level of the hierarchy.
   *
   * Called when the user clicks on the home button of the breadcrumbs.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function restoreDefaultView(): Promise<void> {
    // Reset path selection (no selected item in column, nothing displayed in edit pane)
    levels.value[0].activeCollection = null;
    setPathToActiveCollection([]);
    setCollectionActive(null);

    // Keep only first level
    levels.value = levels.value.slice(0, 1);
  }

  /**
   * Restores the previous path selection by undoing the last path selection operation.
   *
   * Called when a creation process of a new collection is canceled and the path before must be displayed
   * in the breadcrumbs.
   *
   * @returns {void} This function does not return a value.
   */
  function restorePath(): void {
    if (previousPaths.canUndo) {
      previousPaths.undo();
    }
  }

  /**
   * Sets a collection to active, displaying its details in the edit pane. The data are fetched before.
   *
   * @param {CollectionAccessObject} cao - The collection to set as active.
   * @returns {void} This function does not return a value.
   */
  function setCollectionActive(cao: CollectionAccessObject): void {
    activeCollection.value = cao;
  }

  /**
   * Sets the active path selection in the breadcrumbs.
   *
   * Called when the user navigates through the hierarchy by clicking on a collection item in the columns
   * or when the URL changes.
   *
   * @param {Collection[]} path The active path selection.
   * @returns {void} This function does not return a value.
   */
  function setPathToActiveCollection(path: Collection[]): void {
    pathToActiveCollection.value = path;
  }

  /**
   * Sets the current mode to either 'view', 'edit' or 'create'. The mode is used to determine
   * whether the user is currently viewing, editing or creating a collection.
   *
   * @param {string} newMode - The new mode to set. Must be one of 'view', 'edit', 'create'.
   */
  function setMode(newMode: 'view' | 'edit' | 'create'): void {
    mode.value = newMode;
  }

  /**
   * Updates the hierarchy levels and fetches data for the new path selection.
   * Sets the new path to the active collection, updates the hierarchy levels and fetches collection details
   * for the last item in the path.
   *
   * Called on URL path change (by watcher) or when a creation process of a new collection is canceled.
   *
   * @param {Collection[]} newPath The new path selection.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function updateLevelsAndFetchData(newPath: Collection[]): Promise<void> {
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

  /**
   * Updates the levels based on the new path selection in the breadcrumbs.
   *
   * When the new path is shorter than the current levels, it slices the levels to match the new path length.
   * When the new path is longer than the current levels, it adds empty levels to fill up the difference.
   * Then, it updates the activeCollection and parentUuid of each level.
   * Finally, it adds a new level for the children of the last selection in the path, either an empty level
   * or an existing level (when the URL is only truncated and not changed, or the navigation happens via breadcrumbs).
   *
   * @returns {void} This function does not return a value.
   */
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

  /**
   * Validates a collection path given by a comma-separated string of UUIDs.
   *
   * @param {string} uuidString - The comma-separated string of UUIDs to validate.
   * @returns {Promise<Collection[]>} - A promise that resolves with the validated collection path.
   */
  async function validatePath(uuidString: string): Promise<Collection[]> {
    return await api.validateCollectionPath(uuidString);
  }

  return {
    asyncOperationRunning,
    canNavigate,
    isFetchingCollectionDetails: readonly(isFetchingCollectionDetails),
    levels,
    mode,
    pathToActiveCollection,
    activeCollection,
    removeTemporaryCollectionItems,
    createNewUrlPath,
    createNewUrlPathElements,
    fetchCollectionDetails,
    findCollectionInHierarchy,
    getUrlPath,
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
