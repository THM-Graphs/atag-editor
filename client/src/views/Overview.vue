<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import OverviewCollectionTable from '../components/OverviewCollectionTable.vue';
import ICollection from '../models/ICollection';
import { buildFetchUrl } from '../utils/helper/helper';
import { CollectionAccessObject } from '../models/types';
import { DataTablePageEvent, DataTableSortEvent } from 'primevue';

const baseFetchUrl: string = '/api/collections';

const toast: ToastServiceMethods = useToast();

const collections = ref<CollectionAccessObject[] | null>(null);

// Refs for fetch url params to re-fetch collections on change
const searchInput = ref<string>('');
const offset = ref<number>(0);
// TODO: Make dynamically
const rowCount = ref<number>(5);
const sortField = ref<string>('');
// TODO: Should this be set here or on the server?
const sortDirection = ref<'asc' | 'desc'>('asc');

const fetchUrl = ref<string>(baseFetchUrl);

watch([sortField, sortDirection, rowCount, offset, searchInput], async () => {
  const searchParams: URLSearchParams = new URLSearchParams();

  searchParams.set('sort', sortField.value);
  searchParams.set('order', sortDirection.value);
  searchParams.set('limit', rowCount.value.toString());
  searchParams.set('skip', offset.value.toString());
  searchParams.set('search', searchInput.value);

  fetchUrl.value = baseFetchUrl + '?' + searchParams.toString();

  await getCollections();
});

onMounted(async (): Promise<void> => {
  await getCollections();
});

async function getCollections(): Promise<void> {
  try {
    const url: string = buildFetchUrl(fetchUrl.value);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollections: CollectionAccessObject[] = await response.json();

    fetchedCollections.sort((a: CollectionAccessObject, b: CollectionAccessObject) => {
      if (a.collection.data.label.toLowerCase() < b.collection.data.label.toLowerCase()) {
        return -1;
      }
      if (a.collection.data.label.toLowerCase() > b.collection.data.label.toLowerCase()) {
        return 1;
      }
      return 0;
    });

    collections.value = fetchedCollections;
  } catch (error: unknown) {
    console.error('Error fetching collections:', error);
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
        >{{ collections ? collections.length : 0 }} Collections in total</strong
      >
    </div>

    <OverviewCollectionTable
      @sort-changed="handleSortChange"
      @pagination-changed="handlePaginationChange"
      :collections="collections"
    />
  </div>
</template>

<style scoped>
.container {
  width: 80%;
  min-width: 800px;
}
</style>
