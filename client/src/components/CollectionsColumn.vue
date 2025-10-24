<script setup lang="ts">
import { InputText, Button } from 'primevue';
import { useCollectionManagerStore } from '../store/collectionManager';
import CollectionItem from './CollectionItem.vue';
import { useRouter } from 'vue-router';
import { CollectionAccessObject, CollectionSearchParams, PaginationData } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import MultiSelect from 'primevue/multiselect';
import { computed, ref, watch } from 'vue';
import OverlayBadge from 'primevue/overlaybadge';
import { useSearchParams } from '../composables/useSearchParams';
import { useAppStore } from '../store/app';

const props = defineProps<{
  index: number;
  parentUuid: string | null;
}>();

const router = useRouter();

const { api } = useAppStore();
const { getAvailableCollectionLabels } = useGuidelinesStore();
const { activeCollection, levels, fetchCollectionDetails, setCollectionActive } =
  useCollectionManagerStore();
const { searchParams, updateSearchParams } = useSearchParams(50);

const availableCollectionLabels = getAvailableCollectionLabels();

const columnPagination = ref<PaginationData>(null);

const areAllLabelsSelected = computed<boolean>(
  () => searchParams.value.nodeLabels.length === availableCollectionLabels.length,
);

async function fetchData(): Promise<void> {
  const { data, pagination } = await api.getCollections(
    props.parentUuid,
    searchParams.value as CollectionSearchParams,
  );

  levels.value[props.index].data = data;

  columnPagination.value = pagination;
}

watch(searchParams, fetchData, {
  deep: true,
});

watch(() => props.parentUuid, fetchData, {
  immediate: true,
});

async function handleItemSelected(uuid: string): Promise<void> {
  const isAlreadySelectedInColumn: boolean =
    uuid === levels.value[props.index].activeCollection?.data.uuid;

  const isAlreadyActiveInEditPane: boolean =
    isAlreadySelectedInColumn && uuid === activeCollection.value.collection.data.uuid;

  // Nothing happens, return;
  if (isAlreadyActiveInEditPane) {
    return;
  }

  // Only update collection in edit pane. Leave navigation path intact
  if (isAlreadySelectedInColumn) {
    const cao: CollectionAccessObject = await fetchCollectionDetails(uuid);

    setCollectionActive(cao);

    return;
  }

  // Else, change URL and let the watcher handle the rest
  updateUrlPath(uuid, props.index);
}

function handleNodeLabelsChange(selectedLabels: string[]) {
  const data: CollectionSearchParams = {
    nodeLabels: selectedLabels,
  };

  updateSearchParams(data);
}

function handleSearchInputChange(newInput: string) {
  const data: CollectionSearchParams = {
    searchInput: newInput,
  };

  updateSearchParams(data, { immediate: false });
}

function updateUrlPath(uuid: string, index: number): void {
  const uuidPath: string | null = new URLSearchParams(window.location.search).get('path');
  const currentUuids: string[] = uuidPath?.split(',') ?? [];
  const newUuids: string[] = [...currentUuids.slice(0, index), uuid];

  router.push({ query: { path: newUuids.join(',') } });
}
</script>

<template>
  <div class="column flex flex-column">
    <div class="header flex gap-1 p-1">
      <InputText
        size="small"
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
    <div class="content">
      <CollectionItem
        v-for="collection of levels[props.index].data"
        :key="collection.data.uuid"
        :collection="collection"
        :isActive="levels[props.index].activeCollection?.data.uuid === collection.data.uuid"
        @item-selected="handleItemSelected"
      ></CollectionItem>
    </div>
    <div class="footer p-1 flex justify-content-center">
      <Button size="small" severity="secondary" icon="pi pi-plus" label="Add Collection" />
    </div>
  </div>
</template>

<style scoped>
.column {
  min-width: 200px;
}

.content {
  overflow-y: scroll;
  overflow-x: hidden;
  flex-grow: 1;
}
</style>
