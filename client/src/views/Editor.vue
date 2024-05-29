<script setup lang="ts">
import { ComputedRef, WritableComputedRef, computed, onMounted, ref } from 'vue';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import ICharacter from '../models/ICharacter';
import ICollection from '../models/ICollection';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

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

// This allows using v-model for title input changes.
// TODO: Replace with more generic async handling later
const displayedLabel: WritableComputedRef<string> = computed({
  get() {
    return collection.value?.label || '';
  },
  set(value: string) {
    if (collection.value) {
      collection.value.label = value;
    }
  },
});

// TODO: Replace with more generic async handling later
const displayedUuid: ComputedRef<string> = computed(() => collection.value?.uuid || '');

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

    // TODO: This should come from the database
    fetchedCharacters.forEach((c: ICharacter) => (c.uuid = crypto.randomUUID()));

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
        <div class="label flex justify-content-center text-center">
          <InputText
            id="label"
            v-model="displayedLabel"
            spellcheck="false"
            :invalid="displayedLabel.length === 0"
            placeholder="No label provided"
            class="input-label text-center w-full text-xl font-bold"
          />
        </div>
        <div class="uuid text-center">UUID: {{ displayedUuid }}</div>
      </div>
      <div class="content flex flex-column flex-1 p-3">
        <div class="character-counter text-right">{{ characters.length }} characters</div>
        <div class="text-container p-2">
          <div id="text" contenteditable="true" spellcheck="false">
            <span v-for="character in characters" :key="character.uuid" :id="character.uuid">
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

.input-label {
  &::placeholder {
    color: rgb(255, 173, 173);
    font-weight: normal;
  }

  &:not(:focus-visible):not(:hover):not([aria-invalid='true']) {
    outline: none;
    box-shadow: none;
    border-color: white;
  }
}
</style>
