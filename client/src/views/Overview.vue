<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import ICollection from '../models/ICollection';
import CollectionList from '../components/CollectionList.vue';
import OverviewToolbar from '../components/OverviewToolbar.vue';

const collections = ref<ICollection[]>([]);
const filteredCollections = ref<ICollection[]>([]);
const searchInput = ref<string>('');

watch(collections, () => {
  filterCollections();
});

watch(searchInput, () => {
  filterCollections();
});

onMounted(async (): Promise<void> => {
  await getCollections();
});

async function getCollections(): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = 'http://localhost:8080/api/collections';
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollections: ICollection[] = await response.json();

    fetchedCollections.sort((a: ICollection, b: ICollection) => {
      if (a.label < b.label) {
        return -1;
      }
      if (a.label > b.label) {
        return 1;
      }
      return 0;
    });

    collections.value = fetchedCollections;
  } catch (error: unknown) {
    console.error('Error creating collection:', error);
  }
}

function filterCollections(): void {
  filteredCollections.value = collections.value.filter((c: ICollection) => {
    return c.label.toLowerCase().includes(searchInput.value);
  });
}

function handleSearchInputChange(newInput: string): void {
  searchInput.value = newInput;
}
</script>

<template>
  <div class="container flex flex-column h-screen m-auto">
    <h1 class="text-center">Available texts</h1>

    <OverviewToolbar
      @collection-created="getCollections"
      @search-input-changed="handleSearchInputChange"
    />

    <div class="counter text-right">
      <span>{{ filteredCollections.length }} texts</span>
    </div>

    <CollectionList :collections="filteredCollections" @collection-deleted="getCollections" />
  </div>
</template>

<style scoped>
.container {
  width: 40%;
  min-width: 800px;
}
</style>
