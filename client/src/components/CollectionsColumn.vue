<script setup lang="ts">
import { InputText, Button } from 'primevue';
import { useCollectionManagerStore } from '../store/collectionManager';
import CollectionItem from './CollectionItem.vue';
import { useRouter } from 'vue-router';
import {
  Collection,
  CollectionAccessObject,
  CollectionSearchParams,
  PaginationData,
  PaginationResult,
} from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import MultiSelect from 'primevue/multiselect';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import OverlayBadge from 'primevue/overlaybadge';
import { useSearchParams } from '../composables/useSearchParams';
import { useAppStore } from '../store/app';
import { useInfiniteScroll } from '@vueuse/core';
import { createNewCollectionAccessObject } from '../utils/helper/helper';

const props = defineProps<{
  index: number;
  parentUuid: string | null;
}>();

const router = useRouter();

const { api } = useAppStore();
const { getAvailableCollectionLabels } = useGuidelinesStore();
const {
  activeCollection,
  levels,
  fetchCollectionDetails,
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
    if (columnPagination.value?.nextCursor == null) {
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
  levels.value[props.index].data.push(...data);
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
  setMode('create');
  const newCollection: CollectionAccessObject = createNewCollectionAccessObject();
  console.log('Very basic: ', newCollection);

  // Add to beginning of list
  levels.value[props.index].data.unshift(newCollection.collection);

  // Add new collection as active in this column
  levels.value[props.index].activeCollection = newCollection.collection;

  // Set new path
  setPathToActiveCollection(levels.value.slice(0, props.index + 1).map(l => l.activeCollection));

  // Display in edit pane
  setCollectionActive(newCollection);
}

async function handleParentUuidChange() {
  await fetchInitialData();

  initialDataAreFetched.value = true;
}

async function handleItemSelected(uuid: string): Promise<void> {
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
  levels.value[props.index].data = data;
}

function resetPagination(): void {
  setPagination(null);
}

function setPagination(newPagination: PaginationData) {
  columnPagination.value = newPagination;
}

function updateUrlPath(uuid: string, index: number): void {
  const uuidPath: string | null = new URLSearchParams(window.location.search).get('path');
  const currentUuids: string[] = uuidPath?.split(',') ?? [];
  const newUuids: string[] = [...currentUuids.slice(0, index), uuid];

  router.push({ query: { path: newUuids.join(',') } });
}

function scrollToColumn() {
  column.value.scrollIntoView({ behavior: 'smooth' });
}

function setIsLoading(state: boolean) {
  isLoading.value = state;
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
    </div>
    <div class="content" ref="scroll-pane">
      <CollectionItem
        v-for="collection of levels[props.index].data"
        :key="collection.data.uuid"
        :collection="collection"
        :isActive="levels[props.index].activeCollection?.data.uuid === collection.data.uuid"
        @item-selected="handleItemSelected"
      ></CollectionItem>
      <div
        class="text-center"
        v-if="isLoading && levels[props.index].data.length > 0"
        title="More data are loading..."
      >
        <span class="pi pi-spin pi-spinner"></span>
      </div>
    </div>
    <div class="count text-xs text-right pr-3">
      {{ levels[props.index].data.length }}/{{ columnPagination?.totalRecords }}
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
</template>

<style scoped>
.column {
  width: 200px;
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
