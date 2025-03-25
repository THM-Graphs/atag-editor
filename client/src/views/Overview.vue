<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { refDebounced } from '@vueuse/core';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import OverviewCollectionTable from '../components/OverviewCollectionTable.vue';
import ICollection from '../models/ICollection';
import { buildFetchUrl } from '../utils/helper/helper';
import { CollectionAccessObject, PaginationData, PaginationResult } from '../models/types';
import { DataTablePageEvent, DataTableSortEvent } from 'primevue';

const INPUT_DELAY: number = 300;
const baseFetchUrl: string = '/api/collections';

const toast: ToastServiceMethods = useToast();

const collections = ref<CollectionAccessObject[] | null>(null);
const pagination = ref<PaginationData | null>(null);

// Refs for fetch url params to re-fetch collections on change

const searchInput = ref<string>('');
// This ref is used to prevent too many fetches when rapid typing
const debouncedSearchInput = refDebounced(searchInput, INPUT_DELAY);
const offset = ref<number>(0);
// TODO: Make dynamically
const rowCount = ref<number>(10);
const sortField = ref<string>('');
const sortDirection = ref<'asc' | 'desc'>('asc');

const fetchUrl = computed<string>(() => {
  const searchParams: URLSearchParams = new URLSearchParams();

  searchParams.set('sort', sortField.value);
  searchParams.set('order', sortDirection.value);
  searchParams.set('limit', rowCount.value.toString());
  searchParams.set('skip', offset.value.toString());
  searchParams.set('search', debouncedSearchInput.value);

  return `${baseFetchUrl}?${searchParams.toString()}`;
});

watch(fetchUrl, async () => await getCollections());

onMounted(async (): Promise<void> => await getCollections());

const asyncOperationRunning = ref<boolean>(false);

async function getCollections(): Promise<void> {
  try {
    asyncOperationRunning.value = true;
    const url: string = buildFetchUrl(fetchUrl.value);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const paginationResult: PaginationResult<CollectionAccessObject[]> = await response.json();

    collections.value = paginationResult.data;
    pagination.value = paginationResult.pagination;
  } catch (error: unknown) {
    console.error('Error fetching collections:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

function handleCollectionCreation(newCollection: ICollection): void {
  showMessage('created', `"${newCollection.label}"`);
  getCollections();
}

function handleSearchInputChange(newInput: string): void {
  searchInput.value = newInput;
}

function updateTableUrlParams(event: DataTablePageEvent | DataTableSortEvent): void {
  // TODO: Fix this, looks ugly
  sortField.value = (event.sortField as string | null) || '';
  sortDirection.value = event.sortOrder === -1 ? 'desc' : 'asc';
  rowCount.value = event.rows || 5;
  offset.value = event.first || 0;
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
    summary: operation === 'created' ? 'New text created' : 'Text deleted',
    detail: detail,
    life: 2000,
  });
}
</script>

<template>
  <div class="container flex flex-column h-screen m-auto">
    <Toast />

    <h1 class="text-center text-5xl line-height-2">Collections</h1>

    <OverviewToolbar
      @collection-created="handleCollectionCreation"
      @search-input-changed="handleSearchInputChange"
    />

    <div class="counter text-right pt-2 pb-3">
      <strong class="text-base"
        >{{ pagination ? pagination.totalRecords : 0 }} Collections in total</strong
      >
    </div>

    <OverviewCollectionTable
      @sort-changed="handleSortChange"
      @pagination-changed="handlePaginationChange"
      :collections="collections"
      :pagination="pagination"
      :async-operation-running="asyncOperationRunning"
    />
  </div>
</template>

<style scoped>
.container {
  width: 80%;
  min-width: 800px;
}
</style>
