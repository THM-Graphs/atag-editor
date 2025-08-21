<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import { refDebounced, useTitle } from '@vueuse/core';
import { useGuidelinesStore } from '../store/guidelines';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import CollectionTable from '../components/CollectionTable.vue';
import ICollection from '../models/ICollection';
import { IGuidelines } from '../models/IGuidelines';
import { buildFetchUrl } from '../utils/helper/helper';
import {
  Collection,
  CollectionPreview,
  NodeAncestry,
  PaginationData,
  PaginationResult,
} from '../models/types';
import { DataTablePageEvent, DataTableSortEvent } from 'primevue';
import { useRoute } from 'vue-router';

const INPUT_DELAY: number = 300;
const baseFetchUrl: string = '/api/collections';

const toast: ToastServiceMethods = useToast();

const route = useRoute();

useTitle('Collection Manager');

const { initializeGuidelines, guidelines } = useGuidelinesStore();

const collection = ref(null);
const collections = ref<CollectionPreview[] | null>(null);
const pagination = ref<PaginationData | null>(null);
const ancestryPaths = ref<NodeAncestry[] | null>(null);

const asyncOperationRunning = ref<boolean>(false);

// Refs for fetch url params to re-fetch collections on change

const searchInput = ref<string>('');
// This ref is used to prevent too many fetches when rapid typing
const debouncedSearchInput = refDebounced(searchInput, INPUT_DELAY);
const offset = ref<number>(0);
// TODO: Make dynamically
const rowCount = ref<number>(10);
const sortField = ref<string>('');
const sortDirection = ref<'asc' | 'desc'>('asc');

const includedNodeLabels = ref<string[]>([]);

const collectionFetchUrl = computed<string>(() => {
  const path: string =
    route.params.uuid !== '' ? `${baseFetchUrl}/${route.params.uuid}/collections` : baseFetchUrl;

  const searchParams: URLSearchParams = new URLSearchParams();

  searchParams.set('sort', sortField.value);
  searchParams.set('order', sortDirection.value);
  searchParams.set('limit', rowCount.value.toString());
  searchParams.set('skip', offset.value.toString());
  searchParams.set('search', debouncedSearchInput.value);
  searchParams.set('nodeLabels', includedNodeLabels.value.join(','));

  return `${path}?${searchParams.toString()}`;
});

watch(
  () => route.params.uuid,
  async (newUuid, oldUuid) => {
    resetCollectionFetchParams();

    // Wait until url is recomputed
    nextTick();

    // Go on, fetch data
    await getGuidelines();
    await getCollection();
    await getCollectionAncestry();
    await getCollections();
  },
  { immediate: true },
);

watch(collectionFetchUrl, async () => await getCollections());

// onMounted(async (): Promise<void> => {
//   await getGuidelines();
//   await getCollections();
// });

async function getCollection(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/collections/${route.params.uuid}`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollection: Collection = await response.json();

    collection.value = fetchedCollection;

    console.log(collection.value.label);
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}

async function getCollectionAncestry(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/collections/${route.params.uuid}/ancestry`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedAncestryPaths: NodeAncestry[] = await response.json();

    ancestryPaths.value = fetchedAncestryPaths;
    console.log(ancestryPaths.value);
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}

async function getCollections(): Promise<void> {
  try {
    asyncOperationRunning.value = true;
    const url: string = buildFetchUrl(collectionFetchUrl.value);

    console.trace(url);

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

function handleCollectionCreation(newCollection: ICollection): void {
  showMessage('created', `"${newCollection.label}"`);
  getCollections();
}

function handleNodeLabelsInputChanged(selectedLabels: string[]): void {
  includedNodeLabels.value = selectedLabels;
}

function handleSearchInputChange(newInput: string): void {
  searchInput.value = newInput;
}

function resetCollectionFetchParams() {
  searchInput.value = '';
  offset.value = 0;
  rowCount.value = 10;
  sortField.value = '';
  sortDirection.value = 'asc';
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

    <h2 class="text-center text-5xl line-height-2">
      Collection Manager for {{ route.params.uuid ? collection?.data.label : '' }}
    </h2>

    <div class="breadcrumbs-pane">
      <div v-for="path in ancestryPaths">
        <span>
          <RouterLink to="/collection-manager" :title="`Go to Collection Manager Overview`">
            <i class="pi pi-home"></i>
          </RouterLink>
        </span>
        <span v-for="node in path">
          <span> -> </span>
          <RouterLink
            v-if="node.nodeLabels.includes('Collection')"
            :to="`/collection-manager/${node.data.uuid}`"
            :title="`Go to Collection ${node.data.uuid}`"
          >
            {{ node.data.label }}
            <i class="pi pi-external-link"></i>
          </RouterLink>
          <a
            v-else-if="node.nodeLabels.includes('Text')"
            :href="`/texts/${node.data.uuid}`"
            :title="`Go to Text ${node.data.uuid}`"
            target="_blank"
          >
            Text
            <i class="pi pi-external-link"></i>
          </a>
          <span v-else> Annotation {{ node.data.type }}</span>
        </span>
      </div>
    </div>

    <OverviewToolbar
      v-if="guidelines"
      @collection-created="handleCollectionCreation"
      @search-input-changed="handleSearchInputChange"
      @node-labels-input-changed="handleNodeLabelsInputChanged"
    />

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
      mode="edit"
    />
  </div>
</template>

<style scoped>
.container {
  width: 80%;
  min-width: 800px;
}
</style>
