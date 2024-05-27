<script setup lang="ts">
import Button from 'primevue/button';
import ICharacter from '../models/ICharacter';
import { onMounted, ref } from 'vue';
import ICollection from '../models/ICollection';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';

// TODO: Fix route param passing...
defineProps({
  uuid: String,
});

const route: RouteLocationNormalizedLoaded = useRoute();
const uuid: string = route.params.uuid as string;

const collection = ref<ICollection | null>(null);
const characters = ref<ICharacter[]>([]);

onMounted(async (): Promise<void> => {
  await getCollectionByUuid(uuid);
  await getCharacters(uuid);
});

async function getCollectionByUuid(uuid: string): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = `http://localhost:8080/api/collections/${uuid}`;
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollection: ICollection = await response.json();

    collection.value = fetchedCollection;
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}

async function getCharacters(uuid: string): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = `http://localhost:8080/api/collections/${uuid}/characters`;
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCharacters: ICharacter[] = await response.json();

    characters.value = fetchedCharacters;
  } catch (error: unknown) {
    console.error('Error fetching characters:', error);
  }
}
</script>

<template>
  <div class="container flex">
    <section class="sidebar sidebar-left flex-1"></section>
    <section class="main flex flex-column flex-grow-1">
      <div class="header">
        <div class="header-buttons flex">
          <RouterLink to="/">
            <Button icon="pi pi-home" aria-label="Home"></Button>
          </RouterLink>
        </div>
        <div class="title flex justify-content-center">
          <h2>
            {{ collection?.label }}
            <Button icon="pi pi-pencil" aria-label="Edit title"></Button>
          </h2>
        </div>
        <div class="uuid text-center">UUID: {{ collection?.uuid }}</div>
      </div>
      <div class="content flex flex-column flex-1 p-3">
        <div class="character-counter text-right">{{ characters.length }}</div>
        <div class="text-container p-2">
          <div id="text" contenteditable="true" spellcheck="false">
            <span v-for="character in characters" :key="character.uuid">
              {{ character.text }}
            </span>
          </div>
        </div>
      </div>
      <div class="editor-button-container flex justify-content-center gap-3 p-3">
        <Button aria-label="Save changes">Save</Button>
        <Button severity="secondary" aria-label="Cancel changes">Cancel</Button>
      </div>
    </section>
    <section class="sidebar sidebar-right flex-1"></section>
  </div>
</template>

<style scoped>
.container {
  height: 100dvh;
}

.main {
  max-width: 80%;
}

.content {
  outline: 1px solid red;
}

.text-container {
  height: 100%;
  background-color: white;
  border-radius: 3px;
  overflow: auto;
  outline: 1px solid green;
}
</style>
