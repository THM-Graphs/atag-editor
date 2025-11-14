<script setup lang="ts">
import { InputText, Button, useToast } from 'primevue';
import { useCollectionManagerStore } from '../store/collectionManager';
import CollectionItem from './CollectionItem.vue';
import { useRouter } from 'vue-router';
import {
  Collection,
  CollectionAccessObject,
  CollectionSearchParams,
  CollectionStatusObject,
  PaginationData,
  PaginationResult,
} from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import MultiSelect from 'primevue/multiselect';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import OverlayBadge from 'primevue/overlaybadge';
import { useSearchParams } from '../composables/useSearchParams';
import { useAppStore } from '../store/app';
import { useEventListener, useInfiniteScroll } from '@vueuse/core';
import Toast from 'primevue/toast';
import { createNewCollectionAccessObject } from '../utils/helper/helper';

const props = defineProps<{
  index: number;
  parentUuid: string | null;
}>();

const toast = useToast();
const router = useRouter();

const { api } = useAppStore();
const { getAvailableCollectionLabels } = useGuidelinesStore();
const {
  activeCollection,
  canNavigate,
  levels,
  fetchCollectionDetails,
  getUrlPath,
  setCollectionActive,
  setMode,
  setPathToActiveCollection,
} = useCollectionManagerStore();
const { searchParams, updateSearchParams } = useSearchParams(25);

const availableCollectionLabels = getAvailableCollectionLabels();

const columnPagination = ref<PaginationData>(null);

const column = useTemplateRef<HTMLDivElement>('column');
const scrollPane = useTemplateRef<HTMLDivElement>('scroll-pane');

const areAllLabelsSelected = computed<boolean>(
  () => searchParams.value.nodeLabels.length === availableCollectionLabels.length,
);

const initialDataAreFetched = ref<boolean>(false);
// The useInfiniteScroll composable has its own loading state management, but it does not work
// well with the initial data fetching logic. Therefore, an component wide loading state is used.
const isLoading = ref<boolean>(false);

// TODO: Use reset method as soon vueUse package version is updated
useInfiniteScroll(scrollPane, fetchMoreData, {
  distance: searchParams.value.rowCount,
  canLoadMore: () => {
    // Prevent parallel loading
    if (isLoading.value === true) {
      return false;
    }

    // Initial data fetching should come from the component lifecycle
    if (initialDataAreFetched.value === false) {
      return false;
    }

    // If no cursor available, nothing more to load (obviously)
    if (columnPagination.value?.nextCursor === null) {
      return false;
    }

    return true;
  },
});

watch(searchParams, handleSearchParamsChange, {
  deep: true,
});

watch(() => props.parentUuid, handleParentUuidChange, {
  immediate: true,
});

onMounted(() => {
  scrollToColumn();
});

function addData(data: Collection[]) {
  levels.value[props.index].collections.push(
    ...data.map((c: Collection) => {
      return {
        data: c,
        status: 'existing',
      } as CollectionStatusObject;
    }),
  );
}

async function fetchData(): Promise<PaginationResult<Collection[]>> {
  const { data, pagination } = await api.getCollections(props.parentUuid, {
    filters: searchParams.value,
    cursor: columnPagination.value?.nextCursor,
  });

  return { data, pagination };
}

async function fetchInitialData(): Promise<void> {
  setIsLoading(true);

  const { data, pagination } = await fetchData();
  replaceData(data);
  setPagination(pagination);

  initialDataAreFetched.value = true;

  setIsLoading(false);
}

async function fetchMoreData(): Promise<void> {
  setIsLoading(true);

  const { data, pagination } = await fetchData();
  addData(data);
  setPagination(pagination);

  setIsLoading(false);
}

function handleAddCollectionClick() {
  if (!canNavigate.value) {
    // TODO: Show message?
    return;
  }

  setMode('create');

  const newCollection: CollectionAccessObject = createNewCollectionAccessObject();

  // Add to beginning of list
  levels.value[props.index].collections.unshift({
    data: newCollection.collection,
    status: 'temporary',
  });

  // Add new collection as active in this column
  levels.value[props.index].activeCollection = newCollection.collection;

  // Set new path
  setPathToActiveCollection(levels.value.slice(0, props.index + 1).map(l => l.activeCollection));

  // Display in edit pane
  setCollectionActive(newCollection);
}

function handleChangeSortOrderClick() {
  resetPagination();
  updateSearchParams({
    sortDirection: searchParams.value.sortDirection === 'asc' ? 'desc' : 'asc',
  });
}

async function handleParentUuidChange() {
  resetPagination();
  await fetchInitialData();

  initialDataAreFetched.value = true;
}

async function handleItemSelected(uuid: string): Promise<void> {
  if (!canNavigate.value) {
    showUnsavedChangesWarning();
    return;
  }

  const isAlreadySelectedInColumn: boolean =
    uuid === levels.value[props.index].activeCollection?.data.uuid;

  const isAlreadyActiveInEditPane: boolean =
    isAlreadySelectedInColumn && uuid === activeCollection.value.collection.data.uuid;

  // Nothing happens, return;
  if (isAlreadyActiveInEditPane) {
    return;
  }

  // Only update collection in edit pane. Leave navigation path intact
  if (isAlreadySelectedInColumn) {
    const cao: CollectionAccessObject = await fetchCollectionDetails(uuid);

    setPathToActiveCollection(levels.value.slice(0, props.index + 1).map(l => l.activeCollection));
    setCollectionActive(cao);

    return;
  }

  // Else, change URL and let the watcher handle the rest
  updateUrlPath(uuid, props.index);
}

function handleNodeLabelsChange(selectedLabels: string[]) {
  const data: CollectionSearchParams = {
    nodeLabels: selectedLabels,
  };

  updateSearchParams(data);
}

async function handleRefreshClick() {
  if (isLoading.value === true) {
    return;
  }

  setIsLoading(true);
  setPagination(null);

  const { data, pagination } = await fetchData();
  replaceData(data);
  setPagination(pagination);

  initialDataAreFetched.value = true;

  setIsLoading(false);
}

function handleSearchInputChange(newInput: string) {
  const data: CollectionSearchParams = {
    searchInput: newInput,
  };

  updateSearchParams(data, { immediate: false });
}

async function handleSearchParamsChange() {
  resetPagination();
  fetchInitialData();
}

function replaceData(data: Collection[]) {
  levels.value[props.index].collections = data.map(c => {
    return {
      data: c,
      status: 'existing',
    };
  });
}

function resetPagination(): void {
  setPagination(null);
}

function setPagination(newPagination: PaginationData) {
  columnPagination.value = newPagination;
}

function showUnsavedChangesWarning() {
  toast.add({
    severity: 'warn',
    summary: 'You have unsaved changes.',
    detail: 'Please save or discard your changes before selecting other collections.',
    life: 3000,
  });
}

function updateUrlPath(uuid: string, index: number): void {
  const currentUuids: string[] = getUrlPath();
  const newUuids: string[] = [...currentUuids.slice(0, index), uuid];

  router.push({ query: { path: newUuids.join(',') } });
}

function scrollToColumn() {
  column.value.scrollIntoView({ behavior: 'smooth' });
}

function setIsLoading(state: boolean) {
  isLoading.value = state;
}

const resizer = useTemplateRef('resizer');

function handleResize(event) {
  // console.log('Column width: ', column.value.getBoundingClientRect().width);
  // console.log('Column left offset: ', column.value.getBoundingClientRect().left);
  // console.log('Cursor: ', event.clientX);

  const newWidth = event.clientX - column.value.getBoundingClientRect().left;
  console.log('New width: ', newWidth);
  column.value.style.width = `${newWidth}px`;
  // const sidebar: SidebarConfig = sidebars.value[activeResizer.value];
  // sidebar.width =
  //   activeResizer.value === 'left' ? event.clientX : window.innerWidth - event.clientX;
}

function endResize() {
  window.removeEventListener('mousemove', handleResize);
}

useEventListener(resizer, 'mousedown', startResize);
useEventListener(window, 'mouseup', endResize);

function startResize() {
  window.addEventListener('mousemove', handleResize);
}
</script>

<template>
  <div class="column flex flex-column" ref="column">
    <div class="header flex gap-1 p-1">
      <InputText
        size="small"
        :modelValue="searchParams.searchInput"
        spellcheck="false"
        placeholder="Filter by label"
        title="Filter Collections by label"
        @update:model-value="handleSearchInputChange"
      />
      <MultiSelect
        :modelValue="searchParams.nodeLabels"
        :options="availableCollectionLabels"
        dropdownIcon="pi pi-filter"
        :filter="false"
        title="Select node labels to filter"
        class="flex-shrink-0"
        @update:modelValue="handleNodeLabelsChange"
        :pt="{
          root: {
            style: {
              height: '100%',
            },
          },
          dropdownIcon: 'pi pi-filter',
          labelContainer: {
            style: {
              display: 'none',
            },
          },
        }"
      >
        <template #dropdownicon>
          <OverlayBadge v-if="!areAllLabelsSelected" severity="danger">
            <i class="pi pi-filter-fill" />
          </OverlayBadge>
        </template>
      </MultiSelect>
      <Button
        size="small"
        severity="secondary"
        icon="pi pi-refresh"
        title="Refresh data"
        @click="handleRefreshClick"
      />
      <Button
        size="small"
        severity="secondary"
        icon="pi pi-sort-alpha-down"
        title="Change sort"
        @click="handleChangeSortOrderClick"
      />
    </div>
    <div class="content" ref="scroll-pane">
      <CollectionItem
        v-for="collection of levels[props.index].collections"
        :key="collection.data.data.uuid"
        :collection="collection"
        :isActive="levels[props.index].activeCollection?.data.uuid === collection.data.data.uuid"
        @item-selected="handleItemSelected"
      ></CollectionItem>
      <div
        class="text-center"
        v-if="isLoading && levels[props.index].collections.length > 0"
        title="More data are loading..."
      >
        <span class="pi pi-spin pi-spinner"></span>
      </div>
    </div>
    <div class="count text-xs text-right pr-3">
      {{ levels[props.index].collections.length }}/{{ columnPagination?.totalRecords }}
    </div>
    <div class="footer p-1 flex justify-content-center">
      <Button
        size="small"
        severity="secondary"
        icon="pi pi-plus"
        class="w-full"
        label="Add Collection"
        @click="handleAddCollectionClick"
      />
    </div>
  </div>
  <div class="resizer" ref="resizer"></div>
  <Toast />
</template>

<style scoped>
.column {
  display: flex;
  width: 200px;
}

.resizer {
  background-color: green;
  width: 10px;
  cursor: col-resize;
}

.header > * {
  min-width: 0;
}

.content {
  overflow-y: scroll;
  overflow-x: hidden;
  flex-grow: 1;
}

.cursor-item {
  background-color: orange;
  font-size: 0.75rem;
}
</style>
