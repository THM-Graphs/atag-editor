<script setup lang="ts">
import { InputText, Button } from 'primevue';
import { useCollectionManagerStore } from '../store/collectionManager';
import CollectionItem from './CollectionItem.vue';
import { useRouter } from 'vue-router';
import { CollectionAccessObject, CollectionSearchParams } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import MultiSelect from 'primevue/multiselect';
import { computed, ref, watch } from 'vue';
import OverlayBadge from 'primevue/overlaybadge';
import { useSearchParams } from '../composables/useSearchParams';

const props = defineProps<{
  index: number;
}>();

const router = useRouter();

const { getAvailableCollectionLabels } = useGuidelinesStore();
const { activeCollection, levels, fetchCollectionDetails, setCollectionActive } =
  useCollectionManagerStore();
const { searchParams, updateSearchParams } = useSearchParams();

const availableCollectionLabels = getAvailableCollectionLabels();
const allLabelsSelected = computed<boolean>(
  () => selectedNodeLabels.value.length === availableCollectionLabels.length,
);

// State of filters
const selectedNodeLabels = ref<string[]>(availableCollectionLabels);
const searchInput = ref<string>('');

// TODO: Fetch data
watch(searchParams, async () => console.log(searchParams.value), {
  deep: true,
});

async function handleItemSelected(uuid: string): Promise<void> {
  const isAlreadySelectedInColumn: boolean = uuid === levels.value[props.index].activeUuid;

  const isAlreadyActiveInEditPane: boolean =
    isAlreadySelectedInColumn && uuid === activeCollection.value.collection.data.uuid;

  // Nothing happens, return;
  if (isAlreadyActiveInEditPane) {
    return;
  }

  // Only update collection in edit pane. Leave navigation path intact
  if (isAlreadySelectedInColumn) {
    const cao: CollectionAccessObject = await fetchCollectionDetails(props.index, uuid);

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
        :modelValue="searchInput"
        spellcheck="false"
        placeholder="Filter by label"
        title="Filter Collections by label"
        @update:model-value="handleSearchInputChange"
      />
      <MultiSelect
        :modelValue="selectedNodeLabels"
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
          <OverlayBadge v-if="!allLabelsSelected" severity="danger">
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
        :isActive="levels[props.index].activeUuid === collection.data.uuid"
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
