<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTitle } from '@vueuse/core';
import { useGuidelinesStore } from '../store/guidelines';
import { useCollectionSearch } from '../composables/useCollectionSearch';
import CollectionCreationButton from '../components/CollectionCreationButton.vue';
import CollectionError from '../components/CollectionError.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import CollectionTable from '../components/CollectionTable.vue';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { MenuItem } from 'primevue/menuitem';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import { DataTablePageEvent, DataTableSortEvent } from 'primevue';
import { buildFetchUrl } from '../utils/helper/helper';
import { IGuidelines } from '../models/IGuidelines';
import {
  Collection,
  CollectionNetworkActionType,
  CollectionPreview,
  CollectionSearchParams,
  NodeAncestry,
  PaginationData,
  PaginationResult,
} from '../models/types';
import CollectionEditModal from '../components/CollectionEditModal.vue';
import { useCollectionManagerStore } from '../store/collectionManager';

const toast: ToastServiceMethods = useToast();

const route = useRoute();

useTitle('Collection Manager');

const { initializeGuidelines, guidelines } = useGuidelinesStore();

const {
  tableSelection,
  isActionModalVisible,
  currentActionType,
  actionTargetCollections,
  parentCollection,
  closeActionModal,
  reset: resetCollectionManager,
  setParentCollection,
  setSelection,
  openBulkAction,
} = useCollectionManagerStore();

const {
  fetchUrl: collectionFetchUrl,
  resetSearchParams: resetCollectionSearchParams,
  updateSearchParams,
  searchParams,
  updateUuid,
} = useCollectionSearch(10);

const collection = ref<Collection>(null);
const collections = ref<CollectionPreview[] | null>(null);
const pagination = ref<PaginationData | null>(null);
const ancestryPaths = ref<NodeAncestry[] | null>(null);

// Initial pageload
const isLoading = ref<boolean>(false);
const isValidCollection = ref<boolean>(false);
// For other async operations
const asyncOperationRunning = ref<boolean>(false);

type Action = {
  type: CollectionNetworkActionType;
  data: Collection[];
};

const menu = ref();

// Menu items for the three-dot menu
const menuItems: MenuItem[] = [
  {
    label: 'Move',
    icon: 'pi pi-arrow-circle-left',
    command: () => openBulkAction('move'),
    disabled: () => !parentCollection.value,
  },
  {
    label: 'Copy',
    icon: 'pi pi-link',
    command: () => openBulkAction('copy'),
    disabled: () => !parentCollection.value,
  },
  {
    separator: true,
  },
  {
    label: 'De-reference',
    icon: 'pi pi-minus-circle ',
    command: () => openBulkAction('dereference'),
    disabled: () => !parentCollection.value,
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => openBulkAction('delete'),
    disabled: true,
  },
];

watch(
  () => route.params.uuid,
  async (newUuid: string) => {
    isLoading.value = true;

    if (newUuid) {
      await getCollection();
    } else {
      // TODO: This is hacky: collection.value is the component's collection ref
      // At the end, the parentCollection ref of the store is set to this value. So currently,
      // this is kept, but should be overhauled...
      collection.value = null;
    }

    // Reset ancestry - If no uuid param is set, needs to be cleanded anyway
    ancestryPaths.value = [];

    // Fetch parent collection details and ancestry only if a UUID is present
    if (isValidCollection.value && newUuid !== '') {
      await getCollectionAncestry();
    }

    if (isValidCollection.value || newUuid === '') {
      await getGuidelines();

      // Collection filter params need to be reset
      resetCollectionSearchParams();

      // Explicitly update the composable's uuid
      updateUuid(newUuid || undefined);

      // Collections are fetched via watcher
    }

    setParentCollection(collection.value);

    isLoading.value = false;
  },
  {
    immediate: true,
  },
);

// This watcher handles ALL collection fetching
watch(collectionFetchUrl, async () => await getCollections());

async function getCollection(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/collections/${route.params.uuid}`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollection: Collection = await response.json();

    isValidCollection.value = true;
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

function handleSelectionChange(newSelection: CollectionPreview[]): void {
  setSelection(newSelection.map(c => c.collection));
}

function handleActionCanceled(): void {
  closeActionModal();
  resetCollectionManager();
}

async function handleActionDone(event: Action): Promise<void> {
  closeActionModal();

  await getCollections();

  toast.add({
    severity: 'success',
    summary: 'Network updated',
    detail: event.data.length + ' collections updated',
    life: 3000,
  });
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

function toggleMenu(event: Event): void {
  menu.value.toggle(event);
}
</script>

<template>
  <Toast />

  <LoadingSpinner v-if="isLoading === true" />
  <CollectionError
    v-else-if="isValidCollection === false && route.params.uuid !== ''"
    :uuid="route.params.uuid as string"
  />

  <template v-else>
    <div class="header-buttons flex justify-content-between mx-2 pl-2 pt-2">
      <RouterLink to="/">
        <Button
          icon="pi pi-home"
          aria-label="Home"
          class="w-2rem h-2rem"
          title="Go to overview"
        ></Button>
      </RouterLink>
      <div class="flex">
        <RouterLink v-if="route.params.uuid" :to="`/collections/${collection?.data.uuid}`">
          <Button
            icon="pi pi-pen-to-square"
            label="Edit collection data"
            severity="secondary"
            aria-label="Open this collection in Collection editor"
            title="Open this collection in Collection editor"
          ></Button>
        </RouterLink>
      </div>
    </div>
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
        <div class="action-bar pb-2">
          <span span> {{ tableSelection.length }} rows selected </span>

          <Button
            icon="pi pi-ellipsis-v"
            rounded
            severity="secondary"
            class="w-2rem h-2rem"
            title="More actions"
            aria-label="More actions"
            :disabled="tableSelection.length === 0"
            @click="toggleMenu($event)"
          />
          <Menu ref="menu" :model="menuItems" popup />
        </div>

        <CollectionEditModal
          v-if="isActionModalVisible"
          :isVisible="isActionModalVisible"
          :action="currentActionType"
          :collections="actionTargetCollections"
          :parent="parentCollection"
          @action-done="handleActionDone"
          @action-canceled="handleActionCanceled"
        />

        <CollectionTable
          v-if="guidelines"
          :collections="collections"
          :pagination="pagination"
          :async-operation-running="asyncOperationRunning"
          mode="edit"
          @selection-changed="handleSelectionChange"
          @sort-changed="handleSortChange"
          @pagination-changed="handlePaginationChange"
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
