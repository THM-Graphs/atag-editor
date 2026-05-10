<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import MultiSelect from 'primevue/multiselect';

import { useSearchParams } from '../composables/useSearchParams';
import {
  BaseNodeLabel,
  CollectionNode,
  NodeSearchParams,
  CursorData,
  EntityNode,
  PaginationData,
  PaginationResult,
  TextNode,
} from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import { useAppStore } from '../store/app';
import NodeTag from './NodeTag.vue';

const { getAvailableCollectionLabels } = useGuidelinesStore();
const { api } = useAppStore();
const { searchParams, updateSearchParams, resetSearchParams } = useSearchParams(25);

const props = defineProps<{
  baseNodeLabel: BaseNodeLabel;
}>();

const emit = defineEmits<{
  (e: 'itemSelected', item: CollectionNode | TextNode | EntityNode): void;
}>();

const PREVIEW_CHARACTER_SIZE: number = 25;

const isSearchActive = ref<boolean>(false);

const availableCollectionLabels = getAvailableCollectionLabels();
const areAllLabelsSelected = computed<boolean>(
  () => searchParams.value.nodeLabels?.length === availableCollectionLabels.length,
);

const fetchedItems = ref<(CollectionNode | TextNode | EntityNode)[]>([]);
const resultPagination = ref<PaginationData>();

watch(searchParams, handleSearchParamsChange, {
  deep: true,
});

function resetSearch(): void {
  resetSearchParams();
  resetPagination();
  setIsSearchActive(false);
}

function setIsSearchActive(mode: boolean): void {
  isSearchActive.value = mode;

  if (mode === false) {
    return;
  }
}

function handleResultItemSelect(item: CollectionNode | TextNode | EntityNode): void {
  resetSearch();

  emit('itemSelected', item);
}

function handleSearchInputChange(newInput: string) {
  const data: NodeSearchParams = {
    searchInput: newInput,
  };

  updateSearchParams(data, { immediate: false });
}

function resetPagination(): void {
  setPagination(null);
}

async function fetchData(): Promise<PaginationResult<(CollectionNode | EntityNode | TextNode)[]>> {
  const { data, pagination } = await api.searchNodes(props.baseNodeLabel, {
    filters: searchParams.value,
  });

  return { data, pagination };
}

function handleNodeLabelsChange(selectedLabels: string[]) {
  const data: NodeSearchParams = {
    nodeLabels: selectedLabels,
  };

  updateSearchParams(data);
}

function setPagination(newPagination: PaginationData) {
  resultPagination.value = newPagination;
}

function replaceData(data: CollectionNode[]) {
  fetchedItems.value = data;
}

async function handleSearchParamsChange() {
  const { data, pagination } = await fetchData();

  replaceData(data);
  setPagination(pagination);
  resetPagination();
}
</script>

<template>
  <div class="header flex gap-1">
    <MultiSelect
      :modelValue="searchParams.nodeLabels"
      :options="availableCollectionLabels"
      :filter="false"
      display="chip"
      :maxSelectedLabels="2"
      :selectedItemsLabel="`${searchParams.nodeLabels?.length ?? 0} labels selected`"
      title="Select node labels to filter"
      class="flex-shrink-0"
      @update:modelValue="handleNodeLabelsChange"
    />
    <AutoComplete
      :class="isSearchActive ? 'active' : 'inactive'"
      :modelValue="searchParams.searchInput"
      :placeholder="`Search for text`"
      :suggestions="fetchedItems"
      class="searchbar h-2rem"
      variant="filled"
      ref="searchbar"
      title="Enter search term"
      @complete="handleSearchInputChange($event.query)"
      @option-select="handleResultItemSelect($event.value)"
    >
      <template #header v-if="fetchedItems.length > 0">
        <div class="font-medium px-3 py-2">{{ fetchedItems.length }} Results</div>
      </template>
      <template #option="{ option }">
        <div class="result-item">
          <template v-for="nodeLabel in option.nodeLabels">
            <NodeTag :content="nodeLabel" :type="baseNodeLabel" />
          </template>
          <span :title="option.data">{{ option.data?.label ?? option.data?.text }}</span>
        </div>
      </template>
    </AutoComplete>
  </div>
</template>

<style scoped></style>
