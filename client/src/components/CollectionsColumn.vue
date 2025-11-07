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
import { computed, ref, watch } from 'vue';
import OverlayBadge from 'primevue/overlaybadge';
import { useSearchParams } from '../composables/useSearchParams';
import { useAppStore } from '../store/app';

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
  pathToActiveCollection,
  fetchCollectionDetails,
  setCollectionActive,
  setPathToActiveCollection,
} = useCollectionManagerStore();
const { searchParams, updateSearchParams } = useSearchParams(10);

const availableCollectionLabels = getAvailableCollectionLabels();

const columnPagination = ref<PaginationData>(null);

const areAllLabelsSelected = computed<boolean>(
  () => searchParams.value.nodeLabels.length === availableCollectionLabels.length,
);

watch(searchParams, handleSearchParamsChange, {
  deep: true,
});

watch(() => props.parentUuid, handleParentUuidChange, {
  immediate: true,
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
  const { data, pagination } = await fetchData();

  replaceData(data);
  setPagination(pagination);
}

async function fetchMoreData(): Promise<void> {
  const { data, pagination } = await fetchData();

  addData(data);
  setPagination(pagination);
}

async function handleParentUuidChange() {
  fetchInitialData();
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

    setPathToActiveCollection(pathToActiveCollection.value.slice(0, props.index + 1));
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
</script>

<template>
  <div class="column flex flex-column">
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
    </div>
    <div class="content">
      <CollectionItem
        v-for="collection of levels[props.index].data"
        :key="collection.data.uuid"
        :collection="collection"
        :isActive="levels[props.index].activeCollection?.data.uuid === collection.data.uuid"
        @item-selected="handleItemSelected"
      ></CollectionItem>
      <div class="cursor-item">
        <div>UUID: {{ columnPagination?.nextCursor?.uuid }}</div>
        <div>Label: {{ columnPagination?.nextCursor?.label }}</div>
        <button v-if="columnPagination?.nextCursor" class="w-full" @click="fetchMoreData">
          Load more...
        </button>
      </div>
    </div>
    <div class="count text-xs text-right pr-3">
      {{ levels[props.index].data.length }}/{{ columnPagination?.totalRecords }}
    </div>
    <div class="footer p-1 flex justify-content-center">
      <Button size="small" severity="secondary" icon="pi pi-plus" label="Add Collection" />
    </div>
  </div>
</template>

<style scoped>
.column {
  width: 200px;
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
