<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTitle } from '@vueuse/core';
import { useGuidelinesStore } from '../store/guidelines';
import { useCollectionSearch } from '../composables/useCollectionSearch';
import CollectionCreationButton from '../components/CollectionCreationButton.vue';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import CollectionTable from '../components/CollectionTable.vue';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import { DataTablePageEvent, DataTableSortEvent } from 'primevue';
import { buildFetchUrl } from '../utils/helper/helper';
import { IGuidelines } from '../models/IGuidelines';
import {
  Collection,
  CollectionPreview,
  CollectionSearchParams,
  NodeAncestry,
  PaginationData,
  PaginationResult,
} from '../models/types';

const toast: ToastServiceMethods = useToast();

const route = useRoute();

useTitle('Collection Manager');

const { initializeGuidelines, guidelines } = useGuidelinesStore();

const {
  fetchUrl: collectionFetchUrl,
  resetSearchParams: resetCollectionSearchParams,
  updateSearchParams,
  searchParams,
  updateUuid,
} = useCollectionSearch();

const collection = ref(null);
const collections = ref<CollectionPreview[] | null>(null);
const pagination = ref<PaginationData | null>(null);
const ancestryPaths = ref<NodeAncestry[] | null>(null);

// Initial pageload
const isLoading = ref<boolean>(false);
// For other async operations
const asyncOperationRunning = ref<boolean>(false);

watch(
  () => route.params.uuid,
  async (newUuid: string) => {
    isLoading.value = true;

    await getGuidelines();

    // Fetch parent collection details and ancestry only if a UUID is present
    if (newUuid) {
      await getCollection();
      await getCollectionAncestry();
    }

    // Collection filter params need to be reset
    resetCollectionSearchParams();

    // Explicitly update the composable's uuid
    updateUuid(newUuid || undefined);

    // Collections are fetched via watcher

    isLoading.value = false;
  },
  {
    immediate: true,
  },
);

// This watcher handles ALL collection fetching
watch(collectionFetchUrl, async () => {
  if (isLoading.value === true) {
    return;
  }

  await getCollections();
});

async function getCollection(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/collections/${route.params.uuid}`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollection: Collection = await response.json();

    collection.value = fetchedCollection;
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
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}

async function getCollections(): Promise<void> {
  try {
    asyncOperationRunning.value = true;
    const url: string = buildFetchUrl(collectionFetchUrl.value);

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
  <Toast />

  <h2 class="text-center text-5xl line-height-2">
    Collection Manager for {{ route.params.uuid ? collection?.data.label : '' }}
  </h2>
  <div class="flex">
    <div class="container flex flex-column h-screen m-auto">
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
          <span>
            <span>-></span>
            <span class="font-bold font-italic">{{ collection.data.label }}</span>
          </span>
        </div>
      </div>

      <div class="flex gap-2">
        <OverviewToolbar
          v-if="guidelines"
          :searchInputValue="searchParams.searchInput"
          :nodeLabelsValue="searchParams.nodeLabels as string[]"
          @search-input-changed="handleSearchInputChange"
          @node-labels-input-changed="handleNodeLabelsInputChanged"
        />

        <CollectionCreationButton
          :parent-collection="collection"
          @collection-created="handleCollectionCreation"
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
        mode="edit"
      />
    </div>

    <div class="collection-data text-center">
      <div>Data of current collection</div>
      <br />

      <template v-if="collection">
        <div>
          {{ collection?.nodeLabels }}
        </div>
        <br />
        <div>
          {{ collection?.data }}
        </div>
      </template>
      <template v-else>
        <span class="font-italic"> No collection selected </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.collection-data {
  width: 250px;
}
.container {
  width: 80%;
  min-width: 800px;
}
</style>
