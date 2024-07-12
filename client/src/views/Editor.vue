<script setup lang="ts">
import { ComputedRef, computed, onMounted, onUnmounted, ref } from 'vue';
import { RouteLocationNormalizedLoaded, useRoute, onBeforeRouteLeave } from 'vue-router';
import { useCharactersStore } from '../store/characters';
import { useCollectionStore } from '../store/collection';
import EditorSidebar from '../components/EditorSidebar.vue';
import EditorHeader from '../components/EditorHeader.vue';
import EditorText from '../components/EditorText.vue';
import EditorActionButtonsPane from '../components/EditorActionButtonsPane.vue';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import EditorError from '../components/EditorError.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import EditorResizer from '../components/EditorResizer.vue';
import Metadata from '../components/EditorMetadata.vue';
import { objectsAreEqual } from '../helper/helper';
import ICharacter from '../models/ICharacter';
import ICollection from '../models/ICollection';
import { IGuidelines } from '../../../server/src/models/IGuidelines';
import { CharacterPostData } from '../models/types';

interface SidebarConfig {
  isCollapsed: boolean;
  resizerActive: boolean;
  width: number;
}

onMounted(async (): Promise<void> => {
  await getCollectionByUuid();

  if (isValidCollection.value) {
    await getGuidelines();
    await getCharacters();

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  isLoading.value = false;
});

onUnmounted((): void => {
  resetCharacters();

  console.log('unmount...');
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

onBeforeRouteLeave((to, from) => preventUserFromRouteLeaving());

const route: RouteLocationNormalizedLoaded = useRoute();
const uuid: string = route.params.uuid as string;

const isLoading = ref<boolean>(true);
const isValidCollection = ref<boolean>(false);

const { collection, initialCollection, initializeCollection } = useCollectionStore();
const { characters, initialCharacters, initializeCharacters, resetCharacters } =
  useCharactersStore();

const guidelines = ref<IGuidelines | null>(null);
const resizerWidth = 5;

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
    isCollapsed: true,
    resizerActive: false,
    width: 250,
  },
});

const activeResizer = ref<string>('');
const metadataRef = ref(null);
const labelInputRef = ref(null);
const editorRef = ref<HTMLDivElement>(null);

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

    isValidCollection.value = true;
    initializeCollection(fetchedCollection);
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}

async function handleSaveChanges(): Promise<void> {
  const metadataAreValid: boolean = metadataRef.value.validate();
  const labelInputIsValid: boolean = labelInputRef.value.validate();

  if (!metadataAreValid || !labelInputIsValid) {
    return;
  }

  const { uuidStart, uuidEnd } = findChangesetBoundaries();

  const startNodeIndex = uuidStart
    ? characters.value.findIndex((c: ICharacter) => c.uuid === uuidStart)
    : -1;

  let endNodeIndex = uuidEnd
    ? characters.value.findIndex((c: ICharacter) => c.uuid === uuidEnd)
    : characters.value.length;

  if (endNodeIndex === -1) {
    endNodeIndex = characters.value.length;
  }

  const sliceStart: number = startNodeIndex + 1;
  const sliceEnd: number = endNodeIndex;

  const characterSnippet: ICharacter[] = characters.value.slice(sliceStart, sliceEnd);
  console.log(characterSnippet.map((c: ICharacter) => c.text));

  // TODO: Send only one request? Would simplify error handling

  try {
    // TODO: Replace localhost with vite configuration
    let url: string = `http://localhost:8080/api/collections/${uuid}`;
    let response: Response = await fetch(url, {
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
      throw new Error('Neither metadata nor text could be saved');
    }

    const characterPostData: CharacterPostData = {
      collectionUuid: collection.value.uuid,
      uuidStart: uuidStart,
      uuidEnd: uuidEnd,
      characters: characterSnippet,
    };

    url = `http://localhost:8080/api/collections/${uuid}/characters`;
    response = await fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(characterPostData),
    });

    if (!response.ok) {
      throw new Error('Metadata could be saved, text not');
    }

    initialCollection.value = { ...collection.value };
    initialCharacters.value = [...characters.value];
    showMessage('success');
  } catch (error: unknown) {
    showMessage('error', error as Error);
    console.error('Error updating collection:', error);
  }
}

async function handleCancelChanges(): Promise<void> {
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

    initializeCharacters(fetchedCharacters);
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

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  preventUserFromPageLeaving(event);
}

function showMessage(result: 'success' | 'error', error?: Error) {
  toast.add({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Error saving changes',
    detail: error?.message ?? '',
    life: 2000,
  });
}

function findChangesetBoundaries(): {
  uuidStart: string | null;
  uuidEnd: string | null;
} {
  let uuidStart: string | null = null;
  let uuidEnd: string | null = null;

  for (let index = 0; index < characters.value.length; index++) {
    if (characters.value[index].uuid !== initialCharacters.value[index]?.uuid) {
      break;
    }

    uuidStart = characters.value[index].uuid;

    if (
      index === characters.value.length - 1 &&
      characters.value.length >= initialCharacters.value.length
    ) {
      uuidStart = null;
    }
  }

  const reversedCharacters: ICharacter[] = [...characters.value].reverse();
  const reversedInitialCharacters: ICharacter[] = [...initialCharacters.value].reverse();

  for (let index = 0; index < reversedCharacters.length; index++) {
    if (reversedCharacters[index].uuid !== reversedInitialCharacters[index]?.uuid) {
      break;
    }

    uuidEnd = reversedCharacters[index].uuid;

    if (
      index === reversedCharacters.length - 1 &&
      reversedCharacters.length >= reversedInitialCharacters.length
    ) {
      uuidEnd = null;
    }
  }

  return { uuidStart, uuidEnd };
}

function hasUnsavedChanges(): boolean {
  // Compare collection properties
  if (!objectsAreEqual(collection.value, initialCollection.value)) {
    return true;
  }

  // Compare charactfers length
  if (characters.value.length !== initialCharacters.value.length) {
    return true;
  }

  // Compare characters values
  for (let index = 0; index < characters.value.length; index++) {
    if (!objectsAreEqual(characters.value[index], initialCharacters.value[index])) {
      return true;
    }
  }

  return false;
}

function preventUserFromPageLeaving(event: BeforeUnloadEvent): string {
  if (!isValidCollection.value) {
    return;
  }

  if (!hasUnsavedChanges()) {
    return;
  }

  event.preventDefault();

  const confirmationMessage = 'Do you really want to leave? You have unsaved changes.';
  event.returnValue = confirmationMessage;

  return confirmationMessage;
}

function preventUserFromRouteLeaving(): boolean {
  if (!isValidCollection.value) {
    return true;
  }

  if (!hasUnsavedChanges()) {
    return true;
  }

  // TODO: Use PrimeVue confirmation dialog instead of browser default?
  const answer: boolean = window.confirm('Do you really want to leave? you have unsaved changes');

  // cancel the navigation and stay on the same page
  if (!answer) {
    return false;
  }
}
</script>

<template>
  <LoadingSpinner v-if="isLoading === true" />
  <EditorError v-else-if="isValidCollection === false" :uuid="uuid" />
  <div v-else class="container flex h-screen">
    <EditorSidebar
      position="left"
      :isCollapsed="sidebars['left'].isCollapsed === true"
      :width="sidebars['left'].width"
    >
      <Metadata :guidelines="guidelines" ref="metadataRef" />
    </EditorSidebar>
    <EditorResizer
      position="left"
      :isActive="activeResizer === 'left'"
      :defaultWidth="resizerWidth"
      :sidebarIsCollapsed="sidebars['left'].isCollapsed === true"
      @toggle-sidebar="toggleSidebar"
    />
    <section
      class="main flex flex-column flex-grow-1 px-3 pb-0 pt-3"
      :style="{ width: mainWidth + 'px' }"
    >
      <Toast />
      <EditorHeader ref="labelInputRef" />
      <EditorText ref="editorRef" />
      <EditorActionButtonsPane @save="handleSaveChanges" @cancel="handleCancelChanges" />
    </section>
    <EditorResizer
      position="right"
      :isActive="activeResizer === 'right'"
      :defaultWidth="resizerWidth"
      :sidebarIsCollapsed="sidebars['right'].isCollapsed === true"
      @toggle-sidebar="toggleSidebar"
    />
    <EditorSidebar
      position="right"
      :isCollapsed="sidebars['right'].isCollapsed === true"
      :width="sidebars['right'].width"
    >
      Pane for annotation details
    </EditorSidebar>
  </div>
</template>

<style scoped>
.main {
  /* TODO: Fix this */
  /* flex-basis: 60%; */
  /* flex-grow: 1;
  flex-shrink: 1; */
}
</style>
