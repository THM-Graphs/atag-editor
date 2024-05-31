<script setup lang="ts">
import { ComputedRef, WritableComputedRef, computed, onMounted, onUnmounted, ref } from 'vue';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import ICharacter from '../models/ICharacter';
import ICollection from '../models/ICollection';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Sidebar from '../components/Sidebar.vue';
import Resizer from '../components/Resizer.vue';

interface SidebarConfig {
  isCollapsed: boolean;
  resizerActive: boolean;
  width: number;
}

// TODO: Fix route param passing...
defineProps({
  uuid: String,
});

const route: RouteLocationNormalizedLoaded = useRoute();
const uuid: string = route.params.uuid as string;

const collection = ref<ICollection | null>(null);
const characters = ref<ICharacter[]>([]);

const sidebars = ref<Record<string, SidebarConfig>>({
  left: {
    isCollapsed: false,
    resizerActive: false,
    width: 250,
  },
  right: {
    isCollapsed: false,
    resizerActive: false,
    width: 250,
  },
});

const activeResizer = ref<string>('');

onMounted(async (): Promise<void> => {
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousedown', handleMouseDown);

  await getCollectionByUuid();
  await getCharacters();
});

onUnmounted((): void => {
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousedown', handleMouseDown);
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

function toggleSidebar(position: 'left' | 'right', wasCollapsed: boolean): void {
  const sidebar = sidebars.value[position];
  sidebar.isCollapsed = !wasCollapsed;
}

function handleResize(event: MouseEvent): void {
  const sidebar: SidebarConfig = sidebars.value[activeResizer.value];
  sidebar.width =
    activeResizer.value === 'left' ? event.clientX : window.innerWidth - event.clientX;
}

function handleMouseDown(event: MouseEvent): void {
  if (!(event.target as Element).classList.contains('resizer')) {
    return;
  }

  const side: string = (event.target as Element).getAttribute('resizer-id');
  activeResizer.value = side;
  window.addEventListener('mousemove', handleResize);
}

function handleMouseUp(event: MouseEvent): void {
  activeResizer.value = '';
  window.removeEventListener('mousemove', handleResize);
}
</script>

<template>
  <div class="container flex h-screen">
    <Sidebar
      position="left"
      :isCollapsed="sidebars['left'].isCollapsed === true"
      :width="sidebars['left'].width"
    />
    <Resizer
      position="left"
      :sidebarIsCollapsed="sidebars['left'].isCollapsed === true"
      @toggle-sidebar="toggleSidebar"
    />
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
    <Resizer
      position="right"
      :sidebarIsCollapsed="sidebars['right'].isCollapsed === true"
      @toggle-sidebar="toggleSidebar"
    />
    <Sidebar
      position="right"
      :isCollapsed="sidebars['right'].isCollapsed === true"
      :width="sidebars['right'].width"
    />
  </div>
</template>

<style scoped>
.main {
  /* TODO: Fix this */
  /* flex-basis: 60%; */
  /* flex-grow: 1;
  flex-shrink: 1; */
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
</style>
