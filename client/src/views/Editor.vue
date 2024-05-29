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
const sidebars = ref([
  { side: 'left', collapsed: false },
  { side: 'right', collapsed: false },
]);

onMounted(async (): Promise<void> => {
  await getCollectionByUuid();
  await getCharacters();
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

async function getCollectionByUuid(): Promise<void> {
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

async function updateCollection(): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = `http://localhost:8080/api/collections/${uuid}`;
    const response: Response = await fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ label: collection.value.label }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
  } catch (error: unknown) {
    console.error('Error updating collection:', error);
  }
}

async function getCharacters(): Promise<void> {
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

function toggleSidebar(side: 'left' | 'right') {
  const sidebar = sidebars.value.find(s => s.side === side);
  sidebar.collapsed = sidebar.collapsed === true ? false : true;
  console.log(sidebar);
}
</script>

<template>
  <div class="container flex h-screen">
    <section
      class="sidebar sidebar-left"
      v-show="sidebars.find(s => s.side === 'left').collapsed === false"
    ></section>
    <div class="resizer resizer-left">
      <Button
        class="handle handle-left"
        icon="pi pi-arrow-left"
        severity="secondary"
        @click="toggleSidebar('left')"
      ></Button>
    </div>
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
        <small class="uuid text-center block">UUID: {{ displayedUuid }}</small>
      </div>
      <div class="content flex flex-column flex-1 p-3 overflow-auto">
        <small class="character-counter text-right">{{ characters.length }} characters</small>
        <div class="text-container h-full p-2">
          <div id="text" contenteditable="true" spellcheck="false">
            <span v-for="character in characters" :key="character.uuid" :id="character.uuid">
              {{ character.text }}
            </span>
          </div>
        </div>
      </div>
      <div class="editor-button-container flex justify-content-center gap-3 p-3">
        <Button aria-label="Save changes" @click="updateCollection">Save</Button>
        <Button severity="secondary" aria-label="Cancel changes">Cancel</Button>
      </div>
    </section>
    <div class="resizer resizer-right">
      <Button
        class="handle handle-right"
        icon="pi pi-arrow-right"
        severity="secondary"
        @click="toggleSidebar('right')"
      ></Button>
    </div>
    <section
      class="sidebar sidebar-right"
      v-show="sidebars.find(s => s.side === 'right').collapsed === false"
    ></section>
  </div>
</template>

<style scoped>
.main {
  flex-basis: 60%;
}

.sidebar {
  flex-basis: 20%;
}

.content {
  outline: 1px solid red;
}

.text-container {
  background-color: white;
  border-radius: 3px;
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

.resizer {
  width: 0.1rem;
  cursor: col-resize;
  background-color: black;
  position: relative;

  --height: 2.5rem;
  --width: 1.25rem;

  .handle {
    /* display: flex; */
    /* justify-content: center; */
    /* align-items: center; */
    /* background-color: #b2b2d7; */
    /* color: #fff; */
    /* border: 1px solid #b2b2d7; */
    position: absolute;
    height: var(--height);
    width: var(--width);
    top: 50%;
    cursor: pointer;
    /* z-index: 5; */
    /* transition: background-color 100ms; */

    &.handle-left {
      left: 100%;
      transform: translateY(-50%);
      /* border-radius: 0 var(--width) var(--width) 0; */
    }

    &.handle-right {
      right: 100%;
      transform: translateY(-50%);
      /* border-radius: var(--width) 0 0 var(--width); */
    }

    /* &:hover {
      background-color: darkblue;
      border: 1px solid darkblue;
      transition: background-color 100ms;
    } */
  }
}
</style>
