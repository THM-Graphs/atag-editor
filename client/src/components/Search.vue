<script setup lang="ts">
import { ref, watch } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import MultiSelect from 'primevue/multiselect';
import InputGroup from 'primevue/inputgroup';
import { useCollectionSearch } from '../composables/useCollectionSearch';
import { CollectionPreview, CollectionSearchParams } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import Tag from 'primevue/tag';
import Paginator from 'primevue/paginator';
import { DataTablePageEvent } from 'primevue';
import { useCollections } from '../composables/useCollections';

const emit = defineEmits(['itemSelected']);

const { availableCollectionLabels } = useGuidelinesStore();
const { searchParams: collectionSearchParams, updateSearchParams } = useCollectionSearch(50);
const { collections: fetchedItems, pagination, fetchCollections } = useCollections();

const selectedCollectionLabels = ref(availableCollectionLabels.value);
const isSearchActive = ref<boolean>(false);

// State of search
const searchInput = ref<string>('');

watch(
  collectionSearchParams,
  async () => await fetchCollections(null, collectionSearchParams.value),
  {
    deep: true,
  },
);

function resetSearch(): void {
  searchInput.value = '';
  // fetchedItems.value = [];

  setIsSearchActive(false);
}

/**
 * Updates the search input in the collection search params and triggers a fetch of collections based on the new search input.
 *
 * IMPORTANT: PrimeVue's Autocomplete component's default delay of 300ms is set to 0
 * to allow the composable coordinating the delay.
 *
 * @param {string} searchString - The new search input string.
 */
async function handleSearchInputChange(searchString: string): Promise<void> {
  updateSearchParams(
    {
      searchInput: searchString,
    },
    { immediate: false },
  );
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

/**
 * Handle collection label selection changes.
 *
 * @returns {void} This function does not return any value.
 */
function handleCollectionLabelChange(): void {
  updateSearchParams({
    nodeLabels: selectedCollectionLabels.value,
  });
}

function handlePagination(event: DataTablePageEvent): void {
  const data: CollectionSearchParams = {
    sortField: (event.sortField as string | null) || '',
    sortDirection: event.sortOrder === -1 ? 'desc' : 'asc',
    rowCount: event.rows || 5,
    offset: event.first || 0,
  };

  updateSearchParams(data);
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
        :suggestions="fetchedItems as CollectionPreview[]"
        :delay="0"
        class="searchbar"
        variant="filled"
        ref="searchbar"
        title="Enter search term"
        @complete="handleSearchInputChange($event.query)"
        @option-select="handleResultItemSelect($event.value)"
        @blur="isSearchActive = searchInput === '' ? false : true"
      >
        <template #header v-if="fetchedItems.length > 0">
          <div class="font-medium px-3 py-2">{{ fetchedItems.length }} Results</div>
        </template>
        <template #option="slotProps">
          <div class="flex gap-2">
            <Tag
              v-for="label in slotProps.option.collection.nodeLabels"
              :value="label"
              severity="contrast"
            />
            <div class="font-medium">{{ slotProps.option.collection.data.label }}</div>
          </div>
        </template>

        <template #footer>
          <Paginator
            :rows="fetchedItems.length"
            :totalRecords="pagination.totalRecords"
            :rowsPerPageOptions="[10, 20, 50, 100]"
            @page="handlePagination"
          ></Paginator>
        </template>
      </AutoComplete>
    </InputGroup>
  </div>
</template>

<style scoped></style>
