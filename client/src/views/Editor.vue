<script setup lang="ts">
import { ComputedRef, computed, onMounted, onUnmounted, ref } from 'vue';
import { RouteLocationNormalizedLoaded, useRoute, onBeforeRouteLeave } from 'vue-router';
import { useCharactersStore } from '../store/characters';
import { useCollectionStore } from '../store/collection';
import EditorAnnotationButtonPane from '../components/EditorAnnotationButtonPane.vue';
import EditorAnnotationPanel from '../components/EditorAnnotationPanel.vue';
import EditorSidebar from '../components/EditorSidebar.vue';
import EditorHeader from '../components/EditorHeader.vue';
import EditorText from '../components/EditorText.vue';
import EditorActionButtonsPane from '../components/EditorActionButtonsPane.vue';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import EditorAnnotations from '../components/EditorAnnotations.vue';
import EditorError from '../components/EditorError.vue';
import EditorFilter from '../components/EditorFilter.vue';
import EditorResizer from '../components/EditorResizer.vue';
import EditorMetadata from '../components/EditorMetadata.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ICollection from '../models/ICollection';
import { Character, CharacterPostData } from '../models/types';
import { IGuidelines } from '../models/IGuidelines';
import IAnnotation from '../models/IAnnotation';
import { useAnnotationStore } from '../store/annotations';
import { useEditorStore } from '../store/editor';
import { useGuidelinesStore } from '../store/guidelines';
import { useHistoryStore } from '../store/history';

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
    await getAnnotations();

    initializeHistory();

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  isLoading.value = false;
});

onUnmounted((): void => {
  resetCharacters();
  resetAnnotations();
  resetEditor();
  resetHistory();

  console.log('unmount...');
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

onBeforeRouteLeave(() => preventUserFromRouteLeaving());

const route: RouteLocationNormalizedLoaded = useRoute();
const uuid: string = route.params.uuid as string;

// Initial page load
const isLoading = ref<boolean>(true);
const isValidCollection = ref<boolean>(false);
// For fetch during save/cancel action
const asyncOperationRunning = ref<boolean>(false);

const { hasUnsavedChanges, resetEditor } = useEditorStore();
const { collection, initialCollection, initializeCollection } = useCollectionStore();
const {
  afterEndIndex,
  beforeStartIndex,
  initialSnippetCharacters,
  snippetCharacters,
  totalCharacters,
  initializeCharacters,
  insertSnippetIntoChain,
  resetCharacters,
} = useCharactersStore();
const {
  annotations,
  initialAnnotations,
  initializeAnnotations,
  resetAnnotations,
  updateAnnotationsBeforeSave,
  updateAnnotationStatuses,
} = useAnnotationStore();
const { initializeGuidelines } = useGuidelinesStore();

const { initializeHistory, resetHistory } = useHistoryStore();

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
    isCollapsed: false,
    resizerActive: false,
    width: 350,
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
  if (!hasUnsavedChanges()) {
    console.log('no changes made, no request needed');
    return;
  }

  const metadataAreValid: boolean = metadataRef.value.validate();
  const labelInputIsValid: boolean = labelInputRef.value.validate();

  if (!metadataAreValid || !labelInputIsValid) {
    return;
  }

  asyncOperationRunning.value = true;

  try {
    await saveCollection();
    await saveCharacters();
    await saveAnnotations();

    // All Annotation statuses are updated explicitly to "existing" and the initialData property set to the current data
    updateAnnotationStatuses();

    // Reset initial values of all state components
    initialCollection.value = { ...collection.value };
    initialSnippetCharacters.value = JSON.parse(JSON.stringify(snippetCharacters.value));
    initialAnnotations.value = JSON.parse(JSON.stringify(annotations.value));

    showMessage('success');
  } catch (error: unknown) {
    showMessage('error', error as Error);
    console.error('Error updating collection:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

async function handleCancelChanges(): Promise<void> {
  // Also works, needs less condition checking in stores and skips requests
  collection.value = { ...initialCollection.value };
  snippetCharacters.value = JSON.parse(JSON.stringify(initialSnippetCharacters.value));
  annotations.value = JSON.parse(JSON.stringify(initialAnnotations.value));
}

async function saveCollection(): Promise<void> {
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
    throw new Error('Neither metadata nor text could be saved');
  }
}

async function saveCharacters(): Promise<void> {
  // This can be done within the snippet since changes in the chain can only occur here
  const { uuidStart, uuidEnd } = findChangesetBoundaries();

  // Insert the snippet into the whole chain to simplify index finding -> only one chain to consider
  // TODO: This might take a while on longer texts...fix?
  insertSnippetIntoChain();

  const startNodeIndex = uuidStart
    ? totalCharacters.value.findIndex((c: Character) => c.data.uuid === uuidStart)
    : -1;

  let endNodeIndex = uuidEnd
    ? totalCharacters.value.findIndex((c: Character) => c.data.uuid === uuidEnd)
    : totalCharacters.value.length;

  if (endNodeIndex === -1) {
    endNodeIndex = totalCharacters.value.length;
  }

  const sliceStart: number = startNodeIndex + 1;
  const sliceEnd: number = endNodeIndex;

  const snippetToUpdate: Character[] = totalCharacters.value.slice(sliceStart, sliceEnd);
  console.log(snippetToUpdate.map((c: Character) => c.data.text));

  const characterPostData: CharacterPostData = {
    collectionUuid: collection.value.uuid,
    uuidStart: uuidStart,
    uuidEnd: uuidEnd,
    // TODO: This array.map is a workaround since saving does not work currently
    characters: snippetToUpdate.map((c: Character) => c.data),
  };

  const url: string = `http://localhost:8080/api/collections/${uuid}/characters`;
  const response: Response = await fetch(url, {
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
}

async function saveAnnotations(): Promise<void> {
  updateAnnotationsBeforeSave();

  const url: string = `http://localhost:8080/api/collections/${uuid}/annotations`;
  const response: Response = await fetch(url, {
    method: 'POST',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(annotations.value),
  });

  if (!response.ok) {
    throw new Error('Neither metadata nor text could be saved');
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

    const fetchedCharacters: Character[] = await response.json();

    initializeCharacters(fetchedCharacters);
  } catch (error: unknown) {
    console.error('Error fetching characters:', error);
  }
}

async function getAnnotations(): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = `http://localhost:8080/api/collections/${uuid}/annotations`;
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedAnnotations: IAnnotation[] = await response.json();

    initializeAnnotations(fetchedAnnotations);
  } catch (error: unknown) {
    console.error('Error fetching annotations:', error);
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

    initializeGuidelines(fetchedGuidelines);
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

function handleMouseUp(): void {
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
  let uuidStart: string | null = beforeStartIndex.value
    ? totalCharacters.value[beforeStartIndex.value].data.uuid
    : null;

  let uuidEnd: string | null = afterEndIndex.value
    ? totalCharacters.value[afterEndIndex.value].data.uuid
    : null;

  for (let index = 0; index < snippetCharacters.value.length; index++) {
    if (
      snippetCharacters.value[index].data.uuid !== initialSnippetCharacters.value[index]?.data.uuid
    ) {
      break;
    }

    uuidStart = snippetCharacters.value[index].data.uuid;

    if (
      index === snippetCharacters.value.length - 1 &&
      snippetCharacters.value.length >= initialSnippetCharacters.value.length
    ) {
      uuidStart = beforeStartIndex.value
        ? totalCharacters.value[beforeStartIndex.value].data.uuid
        : null;
    }
  }

  const reversedCharacters: Character[] = [...snippetCharacters.value].reverse();
  const reversedInitialCharacters: Character[] = [...initialSnippetCharacters.value].reverse();

  for (let index = 0; index < reversedCharacters.length; index++) {
    if (reversedCharacters[index].data.uuid !== reversedInitialCharacters[index]?.data.uuid) {
      break;
    }

    uuidEnd = reversedCharacters[index].data.uuid;

    if (
      index === reversedCharacters.length - 1 &&
      reversedCharacters.length >= reversedInitialCharacters.length
    ) {
      uuidEnd = afterEndIndex.value ? totalCharacters.value[afterEndIndex.value].data.uuid : null;
    }
  }

  return { uuidStart, uuidEnd };
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
    <div class="absolute overlay w-full h-full" v-if="asyncOperationRunning">
      <LoadingSpinner />
    </div>
    <EditorSidebar
      position="left"
      :isCollapsed="sidebars['left'].isCollapsed === true"
      :width="sidebars['left'].width"
    >
      <EditorMetadata ref="metadataRef" />
      <EditorAnnotations />
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
      <EditorAnnotationButtonPane />
      <EditorText ref="editorRef" :async-operation-running="asyncOperationRunning" />
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
      <EditorFilter />
      <EditorAnnotationPanel />
    </EditorSidebar>
  </div>
</template>

<style scoped>
.overlay {
  z-index: 99999;
}
</style>
