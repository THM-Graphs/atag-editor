<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTitle, watchDebounced } from '@vueuse/core';
import { useGuidelinesStore } from '../store/guidelines';
import { useCollectionSearch } from '../composables/useCollectionSearch';
import CollectionCreationButton from '../components/CollectionCreationButton.vue';
import CollectionError from '../components/CollectionError.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import CollectionTable from '../components/CollectionTable.vue';
import Button from 'primevue/button';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';

import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import { DataTablePageEvent, DataTableSortEvent } from 'primevue';
import Tag from 'primevue/tag';
import FormPropertiesSection from '../components/FormPropertiesSection.vue';
import ActionMenu from '../components/ActionMenu.vue';
import CollectionEditModal from '../components/CollectionEditModal.vue';
import { useCollectionManagerStore } from '../store/collectionManager';
import { useCollections } from '../composables/useCollections';
import {
  Collection,
  CollectionNetworkActionType,
  CollectionPreview,
  CollectionSearchParams,
  NodeAncestry,
  PropertyConfig,
} from '../models/types';
import { useAppStore } from '../store/app';
import { FETCH_DELAY } from '../config/constants';

const toast: ToastServiceMethods = useToast();

const route = useRoute();

useTitle('Collection Manager');

const { api } = useAppStore();

const { guidelines, getCollectionConfigFields } = useGuidelinesStore();

const {
  allowedEditOperations,
  tableSelection,
  isActionModalVisible,
  currentActionType,
  actionTargetCollections,
  parentCollection,
  closeActionModal,
  reset: resetCollectionManager,
  setParentCollection,
  setSelection,
} = useCollectionManagerStore();

const {
  resetSearchParams: resetCollectionSearchParams,
  updateSearchParams,
  searchParams: collectionSearchParams,
  updateUuid,
} = useCollectionSearch(10);

const {
  collections,
  isFetching: areCollectionsFetching,
  pagination,
  fetchCollections,
} = useCollections();

const collection = ref<Collection>(null);
const ancestryPaths = ref<NodeAncestry[] | null>(null);

// Initial pageload
const isLoading = ref<boolean>(false);
const isValidCollection = ref<boolean>(false);
const isFirstPageLoad = ref<boolean>(true);

const collectionFields = computed<PropertyConfig[]>(() => {
  return guidelines.value ? getCollectionConfigFields(collection.value.nodeLabels) : [];
});

const title = computed<string>(() => {
  if (route.params.uuid) {
    return `${collection.value?.data.label || 'no label provided'}`;
  } else {
    return 'Collection Manager';
  }
});

type Action = {
  type: CollectionNetworkActionType;
  data: Collection[];
};

const actionMenu = useTemplateRef('actionMenu');

watch(
  () => route.params.uuid,
  async (newUuid: string) => {
    isLoading.value = true;

    closeActionModal();

    if (newUuid) {
      try {
        collection.value = await api.getCollection(newUuid);
        isValidCollection.value = true;
      } catch (error: unknown) {
        console.error('Error fetching collections:', error);
        isValidCollection.value = false;
      }
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
      await api.getCollectionAncestry(route.params.uuid as string);
    }

    if (isValidCollection.value || newUuid === '') {
      // Collection filter params need to be reset
      resetCollectionSearchParams();

      // Explicitly update the composable's uuid
      updateUuid(newUuid || undefined);

      // If this is the first page load, load collections here
      if (isFirstPageLoad.value) {
        await fetchCollections(collection.value?.data.uuid, collectionSearchParams.value);
        isFirstPageLoad.value = false;
      }
    }

    setParentCollection(collection.value);

    isLoading.value = false;
  },
  {
    immediate: true,
  },
);

// This watcher handles collection fetching EXCEPT on first page load. Before, this was also done here with the
// `immeditate: true` flage so that data were also fetched when the route was matched for the very first time.
// Problem with that approach: When the route was reloaded or hit without coming from router link, double fetch occured
// since the component was recreated the watcher is therefore triggered.
watchDebounced(
  collectionSearchParams,
  async () => {
    if (!isFirstPageLoad.value) {
      await fetchCollections(collection.value?.data.uuid, collectionSearchParams.value);
    }
  },
  {
    deep: true,
    debounce: FETCH_DELAY,
  },
);

async function handleCollectionCreation(newCollection: Collection): Promise<void> {
  showMessage('created', `"${newCollection.data.label}"`);
  await fetchCollections(collection.value?.data.uuid, collectionSearchParams.value);
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

  await fetchCollections(collection.value?.data.uuid, collectionSearchParams.value);

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

function toggleActionMenu(event: Event): void {
  actionMenu.value.toggle(event);
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
    </div>
    <h2
      class="text-center"
      :class="collection?.data.label && collection.data.label !== '' ? '' : 'font-italic'"
    >
      {{ title }}
    </h2>

    <div class="breadcrumbs-pane text-center mb-4">
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

    <Splitter
      class="flex-grow-1 overflow-y-auto gap-2"
      :pt="{
        gutter: {
          style: {
            width: '4px',
          },
        },
        gutterHandle: {
          style: {
            width: '6px',
            position: 'absolute',
            backgroundColor: 'darkgray',
            height: '40px',
          },
        },
      }"
    >
      <SplitterPanel class="overflow-y-auto">
        <div class="container flex flex-column h-screen m-auto pt-2">
          <div class="flex gap-2">
            <OverviewToolbar
              v-if="guidelines"
              :searchInputValue="collectionSearchParams.searchInput"
              :nodeLabelsValue="collectionSearchParams.nodeLabels as string[]"
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
              @click="toggleActionMenu($event)"
            />
            <ActionMenu
              ref="actionMenu"
              target="bulk"
              :allowed-operations="allowedEditOperations"
            />
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
            :collections="collections as CollectionPreview[]"
            :pagination="pagination"
            :async-operation-running="areCollectionsFetching"
            mode="edit"
            @selection-changed="handleSelectionChange"
            @sort-changed="handleSortChange"
            @pagination-changed="handlePaginationChange"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="4" class="overflow-y-auto pt-2">
        <div class="collection-data p-2">
          <div class="flex justify-content-center align-items-center gap-2">
            <div class="text-center">Data of current collection</div>
            <RouterLink v-if="route.params.uuid" :to="`/collections/${collection?.data.uuid}`">
              <Button
                icon="pi pi-external-link"
                severity="secondary"
                aria-label="Open this collection in Details page"
                title="Open this collection in Details page"
              ></Button>
            </RouterLink>
          </div>

          <div class="p-4 separator relative text-center"></div>

          <template v-if="collection" class="text-center">
            <div class="labels text-center mb-3">
              <h4 class="mt-0 mb-1">Labels</h4>
              <div>
                <Tag
                  v-for="label in collection.nodeLabels"
                  :value="label"
                  severity="contrast"
                  class="mr-1 mb-1 mt-1 inline-block"
                />
              </div>
            </div>
            <div class="properties">
              <h4 class="mt-0 mb-1 text-center mb-3">Properties</h4>

              <FormPropertiesSection
                v-model="collection.data"
                :fields="collectionFields"
                mode="view"
              />
            </div>
          </template>
          <template v-else>
            <span class="font-italic"> No collection selected </span>
          </template>
        </div>
      </SplitterPanel>
    </Splitter>
  </template>
</template>

<style scoped>
.container {
  width: 80%;
  min-width: 800px;
}

.separator::after {
  content: '';
  border-bottom: 2px solid grey;
  position: absolute;
  width: 80px;
  top: 50%;
  transform: translateX(-50%);
  left: 50%;
}
</style>
