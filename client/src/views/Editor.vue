<script setup lang="ts">
import { ComputedRef, computed, onMounted, onUnmounted, ref } from 'vue';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import { useCharactersStore } from '../store/characters';
import { useCollectionStore } from '../store/collection';
import EditorSidebar from '../components/EditorSidebar.vue';
import EditorHeader from '../components/EditorHeader.vue';
import EditorText from '../components/EditorText.vue';
import EditorActionButtonsPane from '../components/EditorActionButtonsPane.vue';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import EditorResizer from '../components/EditorResizer.vue';
import Metadata from '../components/EditorMetadata.vue';
import ICharacter from '../models/ICharacter';
import ICollection from '../models/ICollection';
import { IGuidelines } from '../../../server/src/models/IGuidelines';
import { CharacterPostData } from '../models/types';

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

// onUpdated(() => {
//   console.log('update');
//   placeCursor();
// });

onUnmounted((): void => {
  resetCharacters();

  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousedown', handleMouseDown);
});

const route: RouteLocationNormalizedLoaded = useRoute();
const uuid: string = route.params.uuid as string;

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

    collection.value = fetchedCollection;
    initializeCollection(fetchedCollection);
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}

async function handleSaveChanges(): Promise<void> {
  const metadataAreValid: boolean = metadataRef.value.validate();

  if (!metadataAreValid) {
    return;
  }

  const { uuidStart, uuidEnd } = findChangesetBoundaries();

  console.log('startUuid:', uuidStart);
  console.log('endUuid:', uuidEnd);

  const startNodeIndex = uuidStart
    ? characters.value.findIndex((c: ICharacter) => c.uuid === uuidStart)
    : 0;
  const endNodeIndex = uuidEnd
    ? characters.value.findIndex((c: ICharacter) => c.uuid === uuidEnd)
    : characters.value.length;

  console.log(startNodeIndex);
  console.log(endNodeIndex);

  const characterSnippet: ICharacter[] = characters.value.slice(startNodeIndex, endNodeIndex);
  console.log(characterSnippet.map((c: ICharacter) => c.text));

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
      throw new Error('Network response was not ok');
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
      throw new Error('Network response was not ok');
    }

    const updatedCharacters: ICharacter[] = await response.json();
    console.log('UPDATE');
    console.log(updatedCharacters);

    showMessage('success');
  } catch (error: unknown) {
    showMessage('error');
    console.error('Error updating collection:', error);
  }
}

async function handleCancelChanges(): Promise<void> {
  console.log('cancel');
  // try {
  //   await getCollectionByUuid();
  //   await getCharacters();
  // } catch (error: unknown) {
  //   console.error('Error discarding changes:', error);
  // }
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

function showMessage(result: 'success' | 'error') {
  toast.add({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Changes could not be saved',
    detail: 'Message Content',
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

  const startSpan = document.querySelector(`[data-uuid="${uuidStart}"]`);
  if (startSpan) {
    (startSpan as HTMLSpanElement).style.backgroundColor = 'green';
  }

  const endSpan = document.querySelector(`[data-uuid="${uuidEnd}"]`);
  if (endSpan) {
    (endSpan as HTMLSpanElement).style.backgroundColor = 'red';
  }

  return { uuidStart, uuidEnd };
}
</script>

<template>
  <div class="container flex h-screen">
    <EditorSidebar
      position="left"
      :isCollapsed="sidebars['left'].isCollapsed === true"
      :width="sidebars['left'].width"
    >
      <Metadata :guidelines="guidelines" ref="metadataRef" />
    </EditorSidebar>
    <EditorResizer
      position="left"
      :width="resizerWidth"
      :sidebarIsCollapsed="sidebars['left'].isCollapsed === true"
      @toggle-sidebar="toggleSidebar"
    />
    <section class="main flex flex-column flex-grow-1" :style="{ width: mainWidth + 'px' }">
      <Toast />
      <EditorHeader />
      <EditorText ref="editorRef" />
      <EditorActionButtonsPane @save="handleSaveChanges" @cancel="handleCancelChanges" />
    </section>
    <EditorResizer
      position="right"
      :width="resizerWidth"
      :sidebarIsCollapsed="sidebars['right'].isCollapsed === true"
      @toggle-sidebar="toggleSidebar"
    />
    <EditorSidebar
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
</style>
