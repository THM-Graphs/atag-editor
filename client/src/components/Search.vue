<script setup lang="ts">
import { ref, watch } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import MultiSelect from 'primevue/multiselect';
import InputGroup from 'primevue/inputgroup';
import { useCollectionSearch } from '../composables/useCollectionSearch';
import { CollectionPreview, PaginationData, PaginationResult } from '../models/types';
import { buildFetchUrl } from '../utils/helper/helper';
import { useGuidelinesStore } from '../store/guidelines';
import Tag from 'primevue/tag';

const emit = defineEmits(['itemSelected']);

const pagination = ref<PaginationData>(null);

const { availableCollectionLabels } = useGuidelinesStore();
const { fetchUrl: collectionFetchUrl, updateSearchParams } = useCollectionSearch();

const selectedCollectionLabels = ref(availableCollectionLabels.value);
const isSearchActive = ref<boolean>(false);

// State of search
const fetchedItems = ref<CollectionPreview[]>([]);
const searchInput = ref<string>('');

watch(collectionFetchUrl, async () => await getCollections());

function resetSearch(): void {
  searchInput.value = '';
  fetchedItems.value = [];

  setIsSearchActive(false);
}

async function getCollections(): Promise<void> {
  try {
    const url: string = buildFetchUrl(collectionFetchUrl.value);
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const paginationResult: PaginationResult<CollectionPreview[]> = await response.json();

    fetchedItems.value = paginationResult.data;
    pagination.value = paginationResult.pagination;
  } catch (error: unknown) {
    console.error('Error fetching collections:', error);
  }
}

async function search(searchString: string): Promise<void> {
  // Use the selected collection labels or all if none selected
  updateSearchParams({
    searchInput: searchString,
    nodeLabels: selectedCollectionLabels.value,
  });
}

function setIsSearchActive(mode: boolean): void {
  isSearchActive.value = mode;

  if (mode === false) {
    return;
  }
}

function handleResultItemSelect(collection: CollectionPreview): void {
  // Emit the selected collection
  emit('itemSelected', collection.collection);

  // Reset search after selection
  resetSearch();
}

// Handle collection label selection changes
function handleCollectionLabelChange(): void {
  // If there's an active search, re-run it with new filters
  if (searchInput.value && searchInput.value.trim()) {
    search(searchInput.value);
  }
}
</script>

<template>
  <div class="search-container">
    <InputGroup>
      <MultiSelect
        v-model="selectedCollectionLabels"
        :options="availableCollectionLabels"
        :display="'chip'"
        class="collection-filter"
        title="Filter by collection labels"
        @change="handleCollectionLabelChange"
      >
        <template #chip="{ value }">
          <Tag :value="value" severity="contrast" class="mr-1" />
        </template>
      </MultiSelect>
      <AutoComplete
        v-model="searchInput"
        :placeholder="`Search for collection`"
        :suggestions="fetchedItems"
        class="searchbar"
        variant="filled"
        ref="searchbar"
        title="Enter search term"
        @complete="search($event.query)"
        @option-select="handleResultItemSelect($event.value)"
        @blur="isSearchActive = searchInput === '' ? false : true"
      >
        <template #header v-if="fetchedItems.length > 0">
          <div class="font-medium px-3 py-2">{{ fetchedItems.length }} Results</div>
        </template>
        <template #option="slotProps">
          <div class="flex gap-1 p-2">
            <Tag
              v-for="label in slotProps.option.collection.nodeLabels"
              :value="label"
              severity="contrast"
              class="mr-1"
              siz
            />
            <div class="font-medium">{{ slotProps.option.collection.data.label }}</div>
          </div>
        </template>
      </AutoComplete>
    </InputGroup>
  </div>
</template>

<style scoped></style>
