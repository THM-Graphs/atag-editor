<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ICollection from '../models/ICollection';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Dialog from 'primevue/dialog';

const collections = ref<ICollection[]>([]);
const filteredCollections = ref<ICollection[]>([]);
const searchInput = ref<string>('');
const dialogIsVisible = ref<boolean>(false);
const newCollectionTitle = ref<string>('');

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

    filterCollections();
  } catch (error: unknown) {
    console.error('Error creating collection:', error);
  }
}

async function createNewCollection(): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = 'http://localhost:8080/api/collections';
    const response: Response = await fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ label: newCollectionTitle.value }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    newCollectionTitle.value = '';
    dialogIsVisible.value = false;

    await getCollections();
  } catch (error: unknown) {
    console.error('Error creating collection:', error);
  }
}

async function deleteCollection(uuid: string): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = `http://localhost:8080/api/collections/${uuid}`;
    const response: Response = await fetch(url, {
      method: 'DELETE',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ uuid: uuid }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    await getCollections();
  } catch (error: unknown) {
    console.error('Error deleting collection:', error);
  }
}

function filterCollections(): void {
  filteredCollections.value = collections.value.filter((c: ICollection) =>
    c.label.includes(searchInput.value),
  );
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
          <InputText placeholder="Filter texts" v-model="searchInput" @input="filterCollections" />
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
      <form @submit.prevent="createNewCollection">
        <div class="flex align-items-center gap-3 mb-3">
          <label for="title" class="font-semibold w-6rem">Title</label>
          <InputText
            id="title"
            class="flex-auto"
            autocomplete="off"
            required
            autofocus
            v-model="newCollectionTitle"
          />
        </div>
        <div class="flex justify-content-end gap-2">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            @click="dialogIsVisible = false"
          ></Button>
          <Button type="submit" label="Create"></Button>
        </div>
      </form>
    </Dialog>

    <div class="counter-container">
      <span>{{ filteredCollections.length }} texts</span>
    </div>
    <div class="list-container">
      <ul>
        <li
          class="list-item flex justify-content-between gap-6 flex-grow-1 text-xl p-3"
          v-for="collection in filteredCollections"
          :key="collection.uuid"
        >
          <div class="title">
            <RouterLink :to="`/texts/${collection.uuid}`">{{ collection.label }} </RouterLink>
          </div>
          <Button
            class="button-delete-collection"
            icon="pi pi-trash"
            aria-label="Delete text"
            label=""
            severity="danger"
            @click="deleteCollection(collection.uuid)"
          />
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
  width: 40%;
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

.list-item {
  /* border: 2px solid gray;
  border-radius: 5px; */
  margin: 1rem;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px -1px rgba(0, 0, 0, 0.1);
  border-radius: 6px;

  .button-delete-collection {
    opacity: 0;
  }

  &:hover {
    .button-delete-collection {
      opacity: 1;
    }
  }
}
</style>
