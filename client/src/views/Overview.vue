<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useTitle } from '@vueuse/core';
import { useGuidelinesStore } from '../store/guidelines';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import CollectionCreationButton from '../components/CollectionCreationButton.vue';
import CollectionTable from '../components/CollectionTable.vue';
import { IGuidelines } from '../models/IGuidelines';
import { buildFetchUrl } from '../utils/helper/helper';
import {
  Collection,
  CollectionPreview,
  CollectionSearchParams,
  PaginationData,
  PaginationResult,
} from '../models/types';
import { DataTablePageEvent, DataTableSortEvent } from 'primevue';
import { useCollectionSearch } from '../composables/useCollectionSearch';

const toast: ToastServiceMethods = useToast();

useTitle('ATAG Editor');

const { guidelines, availableCollectionLabels, initializeGuidelines } = useGuidelinesStore();
const { fetchUrl, searchParams, updateSearchParams } = useCollectionSearch(10);

const collections = ref<CollectionPreview[] | null>(null);
const pagination = ref<PaginationData | null>(null);

const asyncOperationRunning = ref<boolean>(false);

watch(fetchUrl, async () => await getCollections());

onMounted(async (): Promise<void> => {
  await getGuidelines();

  // Initialize nodeLabels AFTER guidelines are loaded. Otherwise, the useCollectionSearch composable
  // is initialized with an empty array
  updateSearchParams({
    nodeLabels: availableCollectionLabels.value,
  });

  await getCollections();
});

async function getCollections(): Promise<void> {
  try {
    asyncOperationRunning.value = true;
    const url: string = buildFetchUrl(fetchUrl.value);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const paginationResult: PaginationResult<CollectionPreview[]> = await response.json();

    collections.value = paginationResult.data;
    pagination.value = paginationResult.pagination;
  } catch (error: unknown) {
    console.error('Error fetching collections:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

async function getGuidelines(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/guidelines`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedGuidelines: IGuidelines = await response.json();

    initializeGuidelines(fetchedGuidelines);
  } catch (error: unknown) {
    console.error('Error fetching guidelines:', error);
  }
}

function handleCollectionCreation(newCollection: Collection): void {
  showMessage('created', `"${newCollection.data.label}"`);
  getCollections();
}

function handleNodeLabelsInputChanged(selectedLabels: string[]): void {
  const data: CollectionSearchParams = {
    nodeLabels: selectedLabels,
  };

  updateSearchParams(data);
}

function handleSearchInputChange(newInput: string): void {
  const data: CollectionSearchParams = {
    searchInput: newInput,
  };

  updateSearchParams(data);
}

function updateTableUrlParams(event: DataTablePageEvent | DataTableSortEvent): void {
  const data: CollectionSearchParams = {
    sortField: (event.sortField as string | null) || '',
    sortDirection: event.sortOrder === -1 ? 'desc' : 'asc',
    rowCount: event.rows || 5,
    offset: event.first || 0,
  };

  updateSearchParams(data);
}

function handleSortChange(event: DataTableSortEvent): void {
  updateTableUrlParams(event);
}

function handlePaginationChange(event: DataTablePageEvent): void {
  updateTableUrlParams(event);
}

function showMessage(operation: 'created' | 'deleted', detail?: string): void {
  toast.add({
    severity: 'success',
    summary: operation === 'created' ? 'New collection created' : 'Collection deleted',
    detail: detail,
    life: 2000,
  });
}
</script>

<template>
  <div class="container flex flex-column h-screen m-auto">
    <Toast />

    <div class="header-buttons flex justify-content-end mx-2 pl-2 pt-2">
      <div class="flex">
        <RouterLink :to="`/collection-manager`">
          <Button
            icon="pi pi-sitemap"
            severity="secondary"
            title="Go to Collection manager page to edit collection network"
            label="Go to Collection manager"
            aria-label="Go to Collection manager"
          ></Button>
        </RouterLink>
      </div>
    </div>

    <h1 class="text-center text-5xl line-height-2">Collections</h1>

    <div class="flex gap-2">
      <OverviewToolbar
        v-if="guidelines"
        :searchInputValue="searchParams.searchInput"
        :nodeLabelsValue="searchParams.nodeLabels as string[]"
        @search-input-changed="handleSearchInputChange"
        @node-labels-input-changed="handleNodeLabelsInputChanged"
      />
    </div>

    <div class="counter text-right pt-2 pb-3">
      <strong class="text-base"
        >{{ pagination ? pagination.totalRecords : 0 }} Collections in total</strong
      >
    </div>

    <CollectionTable
      v-if="guidelines"
      @sort-changed="handleSortChange"
      @pagination-changed="handlePaginationChange"
      :collections="collections"
      :pagination="pagination"
      :async-operation-running="asyncOperationRunning"
      mode="view"
    />
  </div>
</template>

<style scoped>
.container {
  width: 80%;
  min-width: 800px;
}
</style>
