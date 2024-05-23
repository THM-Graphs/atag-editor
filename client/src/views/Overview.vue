<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ICollection from '../models/ICollection';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';

const collections = ref<ICollection[]>([]);
const dialogIsVisible = ref<boolean>(false);
const newCollectionTitle = ref<string>('');

onMounted(async (): Promise<void> => {
  collections.value = await getCollections();
});

async function getCollections(): Promise<ICollection[]> {
  // TODO: Replace localhost with vite configuration
  const url: string = 'http://localhost:8080/api/collections';
  const response: Response = await fetch(url);
  const collections: ICollection[] = await response.json();

  collections.sort((a: ICollection, b: ICollection) => {
    if (a.label < b.label) {
      return -1;
    }
    if (a.label > b.label) {
      return 1;
    }
    return 0;
  });

  return collections;
}

async function createNewCollection(): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = 'http://localhost:8080/api/collections';
    const response: Response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ label: newCollectionTitle.value }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    newCollectionTitle.value = '';
    dialogIsVisible.value = false;
    collections.value = await getCollections();
  } catch (error: unknown) {
    console.error('Error creating collection:', error);
  }
}
</script>

<template>
  <div class="container">
    <h1>Available texts</h1>

    <Toolbar class="toolbar">
      <template #start>
        <IconField iconPosition="left">
          <InputIcon>
            <i class="pi pi-search" />
          </InputIcon>
          <InputText placeholder="Filter texts" />
        </IconField>
      </template>

      <template #end>
        <Button
          icon="pi pi-plus"
          aria-label="Submit"
          label="Add text"
          @click="dialogIsVisible = true"
        />
      </template>
    </Toolbar>
    <Dialog
      v-model:visible="dialogIsVisible"
      modal
      header="Add new text"
      :style="{ width: '25rem' }"
    >
      <div class="flex align-items-center gap-3 mb-3">
        <label for="title" class="font-semibold w-6rem">Title</label>
        <InputText id="title" class="flex-auto" autocomplete="off" v-model="newCollectionTitle" />
      </div>
      <div class="flex justify-content-end gap-2">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          @click="dialogIsVisible = false"
        ></Button>
        <Button type="button" label="Create" @click="createNewCollection"></Button>
      </div>
    </Dialog>

    <div class="counter-container">
      <span>{{ collections.length }} texts</span>
    </div>
    <div class="list-container">
      <ul>
        <li v-for="collection in collections" :key="collection.uuid">
          <Card>
            <template #title>
              <RouterLink :to="`/texts/${collection.uuid}`">{{ collection.label }} </RouterLink>
            </template>
          </Card>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  margin: auto;
  width: 60%;
  min-width: 800px;
}

.toolbar {
  width: 60%;
  margin: auto;
}

.list-container {
  overflow-y: auto;
  margin-bottom: 1rem;
  flex-grow: 1;
}
</style>
