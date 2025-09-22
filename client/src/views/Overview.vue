<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useTitle } from '@vueuse/core';
import { useGuidelinesStore } from '../store/guidelines';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import CollectionTable from '../components/CollectionTable.vue';
import { CollectionPreview, CollectionSearchParams } from '../models/types';
import { DataTablePageEvent, DataTableSortEvent } from 'primevue';
import { useCollectionSearch } from '../composables/useCollectionSearch';
import { useCollections } from '../composables/useCollections';

useTitle('ATAG Editor');

const { guidelines, availableCollectionLabels } = useGuidelinesStore();
const { fetchUrl, searchParams, updateSearchParams } = useCollectionSearch(10);

const { collections, isFetching, pagination, fetchCollections } = useCollections();

watch(fetchUrl, async () => await fetchCollections(null, searchParams.value));

onMounted(async (): Promise<void> => {
  // Initialize nodeLabels AFTER guidelines are loaded. Otherwise, the useCollectionSearch composable
  // is initialized with an empty array
  updateSearchParams({
    nodeLabels: availableCollectionLabels.value,
  });

  await fetchCollections(null, searchParams.value);
});

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
</script>

<template>
  <div class="container flex flex-column h-screen m-auto">
    <Toast />

    <div class="header-buttons flex justify-content-end mx-2 pl-2 pt-2">
      <div class="flex">
        <RouterLink :to="`/collection-manager`">
          <Button
            icon="pi pi-sitemap"
            severity="secondary"
            title="Go to Collection manager page to edit collection network"
            label="Go to Collection manager"
            aria-label="Go to Collection manager"
          ></Button>
        </RouterLink>
      </div>
    </div>

    <h1 class="text-center text-5xl line-height-2">Collections</h1>

    <div class="flex gap-2">
      <OverviewToolbar
        v-if="guidelines"
        :searchInputValue="searchParams.searchInput"
        :nodeLabelsValue="searchParams.nodeLabels as string[]"
        @search-input-changed="handleSearchInputChange"
        @node-labels-input-changed="handleNodeLabelsInputChanged"
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
      :collections="collections as CollectionPreview[]"
      :pagination="pagination"
      :async-operation-running="isFetching"
      mode="view"
    />
  </div>
</template>

<style scoped>
.container {
  width: 80%;
  min-width: 800px;
}
</style>
