<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import CollectionList from '../components/CollectionList.vue';
import ICollection from '../models/ICollection';

const collections = ref<ICollection[] | null>(null);
const filteredCollections = ref<ICollection[] | null>(null);
const searchInput = ref<string>('');

const toast: ToastServiceMethods = useToast();

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
      if (a.label.toLowerCase() < b.label.toLowerCase()) {
        return -1;
      }
      if (a.label.toLowerCase() > b.label.toLowerCase()) {
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

function handleCollectionCreation(newCollection: ICollection): void {
  showMessage('created', `"${newCollection.label}"`);
  getCollections();
}

function handleSearchInputChange(newInput: string): void {
  searchInput.value = newInput;
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

    <h1 class="text-center">Available texts</h1>

    <OverviewToolbar
      @collection-created="handleCollectionCreation"
      @search-input-changed="handleSearchInputChange"
    />

    <div class="counter text-right mx-3">
      <span>{{ filteredCollections ? filteredCollections.length : 0 }} texts</span>
    </div>

    <CollectionList :collections="filteredCollections" />
  </div>
</template>

<style scoped>
.container {
  width: 40%;
  min-width: 800px;
}
</style>
