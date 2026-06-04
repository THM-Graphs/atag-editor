<script setup lang="ts">
import { computed, ref, toValue, watch } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import MultiSelect from 'primevue/multiselect';

import { useSearchParams } from '../composables/useSearchParams';
import {
  BaseNodeLabel,
  CollectionNode,
  NodeSearchParams,
  EntityNode,
  PaginationData,
  PaginationResult,
  TextNode,
} from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import { useAppStore } from '../store/app';
import NodeTag from './NodeTag.vue';
import { filterDefaultLabels } from '../utils/helper/helper';

const props = defineProps<{
  baseNodeLabel: BaseNodeLabel;
}>();

const { getAvailableNodeLabels } = useGuidelinesStore();
const { api } = useAppStore();
const { searchParams, updateSearchParams, resetSearchParams } = useSearchParams({
  scope: props.baseNodeLabel,
  rowCount: 50,
});

const emit = defineEmits<{
  (e: 'itemSelected', item: CollectionNode | TextNode | EntityNode): void;
}>();

const PREVIEW_CHARACTER_SIZE: number = 25;

const isSearchActive = ref<boolean>(false);
const placeHolder = computed<string>(() => {
  return `Search ${getNodeLabelPlural(props.baseNodeLabel)}`;
});

const availableNodeLabels: string[] = toValue(getAvailableNodeLabels(props.baseNodeLabel));

const fetchedItems = ref<(CollectionNode | TextNode | EntityNode)[]>([]);
const resultPagination = ref<PaginationData>();

watch(searchParams, handleSearchParamsChange, {
  deep: true,
});

function getNodeLabelPlural(nodeLabel: BaseNodeLabel): string {
  switch (nodeLabel) {
    case 'Collection':
      return 'Collections';
    case 'Content':
      return 'Contents';
    case 'Entity':
      return 'Entities';
    case 'Annotation':
      return 'Annotations';
    default:
      return 'Nodes';
  }
}

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

function replaceData(data: (CollectionNode | EntityNode | TextNode)[]) {
  fetchedItems.value = data;
}

async function handleSearchParamsChange() {
  const { data, pagination } = await fetchData();

  pagination.offset = (pagination.offset ?? 0) + data.length;

  replaceData(data);
  setPagination(pagination);
  resetPagination();
}
</script>

<template>
  <div class="flex gap-1">
    <MultiSelect
      :modelValue="searchParams.nodeLabels"
      :options="availableNodeLabels"
      :filter="false"
      display="chip"
      :maxSelectedLabels="2"
      :selectedItemsLabel="`${searchParams.nodeLabels?.length ?? 0} labels selected`"
      title="Select node labels to filter"
      class="flex-shrink-0 w-12rem"
      @update:modelValue="handleNodeLabelsChange"
    />
    <AutoComplete
      :class="isSearchActive ? 'active' : 'inactive'"
      :modelValue="searchParams.searchInput"
      :placeholder="placeHolder"
      :suggestions="fetchedItems"
      inputClass="w-full"
      class="searchbar h-3rem flex-grow-1"
      variant="filled"
      ref="searchbar"
      :title="placeHolder"
      @complete="handleSearchInputChange($event.query)"
      @option-select="handleResultItemSelect($event.value)"
    >
      <template #header v-if="fetchedItems.length > 0">
        <div class="font-medium px-3 py-2">{{ fetchedItems.length }} Results</div>
      </template>
      <template #option="{ option }">
        <template v-if="props.baseNodeLabel === 'Collection'">
          <div class="result-item">
            <template v-for="nodeLabel in filterDefaultLabels(option.nodeLabels)">
              <NodeTag :content="nodeLabel" :type="baseNodeLabel" />
            </template>
            <span :title="option.data">{{ option.data?.label ?? option.data?.text }}</span>
          </div>
        </template>
        <template v-if="props.baseNodeLabel === 'Entity'">
          <div class="result-item">
            <template v-for="nodeLabel in filterDefaultLabels(option.nodeLabels)">
              <NodeTag :content="nodeLabel" :type="baseNodeLabel" />
            </template>
            <span :title="option.data">{{ option.data?.label ?? option.data?.text }}</span>
          </div>
        </template>
        <template v-if="props.baseNodeLabel === 'Content'">
          <div class="result-item">
            <template v-for="nodeLabel in filterDefaultLabels(option.nodeLabels)">
              <NodeTag :content="nodeLabel" :type="baseNodeLabel" />
            </template>
            <span :title="option.data">{{
              option.data?.text.slice(0, PREVIEW_CHARACTER_SIZE)
            }}</span>
          </div>
        </template>
      </template>
    </AutoComplete>
  </div>
</template>

<style scoped></style>
