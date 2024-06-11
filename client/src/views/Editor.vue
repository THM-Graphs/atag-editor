<script setup lang="ts">
import {
  ComputedRef,
  WritableComputedRef,
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
} from 'vue';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import { useTextSelection } from '@vueuse/core';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Sidebar from '../components/Sidebar.vue';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import Resizer from '../components/Resizer.vue';
import Metadata from '../components/Metadata.vue';
import ICharacter from '../models/ICharacter';
import ICollection from '../models/ICollection';
import { IGuidelines } from '../../../server/src/models/IGuidelines';

interface SidebarConfig {
  isCollapsed: boolean;
  resizerActive: boolean;
  width: number;
}

// TODO: Fix route param passing...
defineProps({
  uuid: String,
});

onMounted(async (): Promise<void> => {
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousedown', handleMouseDown);

  await getCollectionByUuid();
  await getGuidelines();
  await getCharacters();
});

onUnmounted((): void => {
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousedown', handleMouseDown);
});

const route: RouteLocationNormalizedLoaded = useRoute();
const uuid: string = route.params.uuid as string;

const collection = ref<ICollection | null>(null);
const characters = ref<ICharacter[]>([]);
const guidelines = ref<IGuidelines | null>(null);
const resizerWidth = 5;
const currentSelection = reactive(useTextSelection());

const mainWidth: ComputedRef<number> = computed(() => {
  const leftSidebarWidth: number = sidebars.value.left.isCollapsed ? 0 : sidebars.value.left.width;
  const rightSidebarWidth: number = sidebars.value.right.isCollapsed
    ? 0
    : sidebars.value.right.width;
  return window.innerWidth - leftSidebarWidth - rightSidebarWidth - resizerWidth * 2;
});

const sidebars = ref<Record<string, SidebarConfig>>({
  left: {
    isCollapsed: false,
    resizerActive: false,
    width: 350,
  },
  right: {
    isCollapsed: false,
    resizerActive: false,
    width: 250,
  },
});

const activeResizer = ref<string>('');
const metadataRef = ref();

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

const toast: ToastServiceMethods = useToast();

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

async function saveChanges(): Promise<void> {
  const metadataAreValid: boolean = metadataRef.value.validate();

  if (!metadataAreValid) {
    return;
  }

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
      body: JSON.stringify(collection.value),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    showMessage('success');
  } catch (error: unknown) {
    showMessage('error');
    console.error('Error updating collection:', error);
  }
}

async function cancelChanges(): Promise<void> {
  try {
    await getCollectionByUuid();
    await getCharacters();
  } catch (error: unknown) {
    console.error('Error discarding changes:', error);
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

async function getGuidelines(): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = 'http://localhost:8080/api/guidelines';
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedGuidelines: IGuidelines = await response.json();
    guidelines.value = fetchedGuidelines;
  } catch (error: unknown) {
    console.error('Error fetching guidelines:', error);
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

function showMessage(result: 'success' | 'error') {
  toast.add({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Changes could not be saved',
    detail: 'Message Content',
    life: 2000,
  });
}

function insertCharacter(
  targetUUID: string,
  position: 'before' | 'after',
  newCharacter: ICharacter,
): void {
  const startTime = performance.now();

  const index: number = characters.value.findIndex(c => c.uuid === targetUUID);

  if (index !== -1) {
    const indexToInsert: number = position === 'before' ? -1 : 1;
    characters.value.splice(index + indexToInsert, 0, newCharacter);
  } else {
    console.log('UUID not found');
  }

  const endTime = performance.now();
  console.log(endTime - startTime);
}

// TODO: Currently handles only inputs, not deletions, pastes etc.
function handleInput(event: InputEvent) {
  event.preventDefault();

  const newCharacter: ICharacter = {
    text: event.data,
    letterLabel: collection.value.label,
    textGuid: '',
    textUrl: '',
    uuid: crypto.randomUUID(),
  };

  const range: Range = currentSelection.ranges[0];
  const type: string = currentSelection.selection.type;

  if (
    range.startContainer.nodeType === Node.ELEMENT_NODE &&
    (range.startContainer as HTMLElement).id === 'text' &&
    range.endContainer.nodeType === Node.ELEMENT_NODE &&
    (range.endContainer as HTMLElement).id === 'text'
  ) {
    // Nothing selected -> Empty text
    console.log('no text selected');
    characters.value.push(newCharacter);
    return;
  } else if (
    range.startContainer.nodeType === Node.TEXT_NODE &&
    range.endContainer.nodeType === Node.TEXT_NODE
  ) {
    // Cursor somewhere in text
    if (type === 'Caret') {
      // No text selected
      console.log('caret');
      const referenceSpanElement: HTMLSpanElement = range.startContainer.parentElement;
      if (range.startOffset === 0) {
        // insert BEFORE reference character
        insertCharacter(referenceSpanElement.id, 'before', newCharacter);
      } else {
        // insert AFTER reference character
        insertCharacter(referenceSpanElement.id, 'after', newCharacter);
      }
    } else {
      // text is selected -> needs to be deleted
    }
  } else {
    console.log('?');
  }

  // TODO: Set range AFTER inserted span
}
</script>

<template>
  <div class="container flex h-screen">
    <Sidebar
      position="left"
      :isCollapsed="sidebars['left'].isCollapsed === true"
      :width="sidebars['left'].width"
    >
      <Metadata v-model="collection" :guidelines="guidelines" ref="metadataRef" />
    </Sidebar>
    <Resizer
      position="left"
      :width="resizerWidth"
      :sidebarIsCollapsed="sidebars['left'].isCollapsed === true"
      @toggle-sidebar="toggleSidebar"
    />
    <section class="main flex flex-column flex-grow-1" :style="{ width: mainWidth + 'px' }">
      <Toast />
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
      </div>
      <div class="content flex flex-column flex-1 p-3 overflow-auto">
        <small class="character-counter text-right">{{ characters.length }} characters</small>
        <div class="text-container h-full p-2">
          <div
            id="text"
            contenteditable="true"
            spellcheck="false"
            @beforeinput="handleInput"
            @input.prevent=""
          >
            <span v-for="character in characters" :key="character.uuid" :id="character.uuid">
              {{ character.text }}
            </span>
          </div>
        </div>
      </div>
      <div class="editor-button-container flex justify-content-center gap-3 p-3">
        <Button aria-label="Save changes" @click="saveChanges">Save</Button>
        <Button severity="secondary" aria-label="Cancel changes" @click="cancelChanges"
          >Cancel</Button
        >
      </div>
    </section>
    <Resizer
      position="right"
      :width="resizerWidth"
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

#text:focus-visible {
  outline: none;
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
