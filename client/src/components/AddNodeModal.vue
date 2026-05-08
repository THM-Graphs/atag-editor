<script setup lang="ts">
import { ref, computed, useTemplateRef, inject, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { formatFileSize } from '../utils/helper/helper';
import ProgressBar from 'primevue/progressbar';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import FileUpload from 'primevue/fileupload';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { useAddNode } from '../composables/useAddNode';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import {
  BaseNodeLabel,
  CollectionNode,
  CollectionSearchParams,
  CursorData,
  NodeStatusObject,
  PaginationData,
  PaginationResult,
} from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import { useSearchParams } from '../composables/useSearchParams';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import OverlayBadge from 'primevue/overlaybadge';
import { useAppStore } from '../store/app';

const dialogRef: any = inject('dialogRef');
const route: RouteLocationNormalizedLoaded = useRoute();

const { getAvailableCollectionLabels } = useGuidelinesStore();
const { api } = useAppStore();
const {
  currentStep,
  errorMessages,
  init,
  setPipelineStep,
  cancel: cancelProcess,
  finish: finishProcess,
} = useAddNode();
const { searchParams, updateSearchParams } = useSearchParams(25);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', node: NodeStatusObject): void;
}>();

const baseNodeLabel: BaseNodeLabel = dialogRef.value.data.baseNodeLabel;

const availableCollectionLabels = getAvailableCollectionLabels();
const columnPagination = ref<PaginationData>();

const areAllLabelsSelected = computed<boolean>(
  () => searchParams.value.nodeLabels?.length === availableCollectionLabels.length,
);

// The useInfiniteScroll composable has its own loading state management, but it does not work
// well with the initial data fetching logic. Therefore, an component wide loading state is used.
const isLoading = ref<boolean>(false);

const inputIsValid = computed<boolean>(() => {
  // if (chooseOption.value === 'raw') {
  //   return rawJson.value.length > 0;
  // } else {
  //   return fileupload.value?.files.length === 1;
  // }
  return false;
});

const fetchedData = ref<CollectionNode[]>([]);

watch(() => route.path, closeModal);
watch(searchParams, handleSearchParamsChange, {
  deep: true,
});

function handleFinishClick(): void {
  finishProcess();
  closeModal();
}

async function handleCancelClick(): Promise<void> {
  cancelProcess();
  closeModal();
}

function closeModal(): void {
  dialogRef.value.close();
}

function handleSearchInputChange(newInput: string) {
  const data: CollectionSearchParams = {
    searchInput: newInput,
  };

  updateSearchParams(data, { immediate: false });
}

function resetPagination(): void {
  setPagination(null);
}

async function fetchData(): Promise<PaginationResult<CollectionNode[]>> {
  const { data, pagination } = await api.getCollections('', {
    filters: searchParams.value,
    cursor: columnPagination.value?.nextCursor as CursorData,
  });

  return { data, pagination };
}

function handleNodeLabelsChange(selectedLabels: string[]) {
  const data: CollectionSearchParams = {
    nodeLabels: selectedLabels,
  };

  updateSearchParams(data);
}

function setPagination(newPagination: PaginationData) {
  columnPagination.value = newPagination;
}

function replaceData(data: CollectionNode[]) {
  fetchedData.value = data;
}

async function handleSearchParamsChange() {
  const { data, pagination } = await fetchData();

  replaceData(data);
  setPagination(pagination);
  resetPagination();
}
</script>

<template>
  <h2 class="w-full m-0 text-center">You want to add a {{ baseNodeLabel }} Node?</h2>
  <template v-if="currentStep === 'choosing'">
    <div class="header flex gap-1">
      <InputText
        size="small"
        class="w-full"
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
    </div>
  </template>
  <template v-if="currentStep === 'editing'">
    <h2>Edit your data here :)</h2>
  </template>
  <template v-if="currentStep === 'finishing'">
    <h2>You have sucessfully created a new node. Do you want to add it? :)</h2>
  </template>
</template>

<style scoped></style>
