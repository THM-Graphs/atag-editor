<script setup lang="ts">
import { ComputedRef, computed, onMounted, onUnmounted, ref } from 'vue';
import { RouteLocationNormalizedLoaded, useRoute, onBeforeRouteUpdate } from 'vue-router';
import { useEventListener, useTitle } from '@vueuse/core';
import { useCharactersStore } from '../store/characters';
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
import { cloneDeep } from '../utils/helper/helper';
import { Annotation, Character, CharacterPostData } from '../models/types';
import { useAnnotationStore } from '../store/annotations';
import { useEditorStore } from '../store/editor';
import { useShortcutsStore } from '../store/shortcuts';
import { useTextStore } from '../store/text';
import { useAppStore } from '../store/app';

interface SidebarConfig {
  isCollapsed: boolean;
  resizerActive: boolean;
  width: number;
}

onMounted(async (): Promise<void> => {
  // TODO: This needs refactoring. Centralize fetches, split fetch/initialize logic
  await fetchAndInitializeText(textUuid);

  if (!isValidText.value) {
    isLoading.value = false;
    return;
  }

  await fetchAndInitializeCharacters(text.value.data.uuid);

  if (charactersFetchError.value) {
    isLoading.value = false;
    return;
  }

  await fetchAndInitializeAnnotations(text.value.data.uuid);

  if (annotationFetchError.value) {
    isLoading.value = false;
    return;
  }

  initializeEditor();

  isLoading.value = false;
});

onUnmounted((): void => {
  resetCharacters();
  resetAnnotations();
  resetEditor();
  resetHistory();
});

onBeforeRouteUpdate(() => preventUserFromRouteLeaving());

useEventListener('mouseup', handleMouseUp);
useEventListener('mousedown', handleMouseDown);
useEventListener('beforeunload', handleBeforeUnload);
useEventListener('keydown', handleKeyDown);

const route: RouteLocationNormalizedLoaded = useRoute();
const textUuid: string = route.params.uuid as string;

// Initial page load
const isLoading = ref<boolean>(true);
const isValidText = computed<boolean>(
  () => !textFetchError.value && !annotationFetchError.value && !charactersFetchError.value,
);

// For fetch during save/cancel action
const asyncOperationRunning = ref<boolean>(false);

const { api } = useAppStore();

const { hasUnsavedChanges, initializeEditor, initializeHistory, resetEditor, resetHistory } =
  useEditorStore();
const { error: textFetchError, text, initialText, fetchAndInitializeText } = useTextStore();
const {
  afterEndIndex,
  beforeStartIndex,
  error: charactersFetchError,
  initialAfterEndCharacter,
  initialBeforeStartCharacter,
  initialSnippetCharacters,
  snippetCharacters,
  totalCharacters,
  fetchAndInitializeCharacters,
  insertSnippetIntoChain,
  resetCharacters,
  resetInitialBoundaryCharacters,
} = useCharactersStore();
const {
  error: annotationFetchError,
  initialSnippetAnnotations,
  initialTotalAnnotations,
  snippetAnnotations,
  totalAnnotations,
  extractSnippetAnnotations,
  fetchAndInitializeAnnotations,
  insertSnippetIntoTotalAnnotations,
  getAnnotationsToSave,
  resetAnnotations,
  updateAnnotationsBeforeSave,
  updateAnnotationStatuses,
  updateTruncationStatus,
} = useAnnotationStore();
const { shortcutMap, normalizeKeys } = useShortcutsStore();

useTitle(computed(() => `Text | ${text.value?.nodeLabels.join(', ') ?? ''}`));

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

// TODO: Annotations structure has changed, overhaul all methods inside
async function handleSaveChanges(): Promise<void> {
  if (!hasUnsavedChanges()) {
    console.log('no changes made, no request needed');
    return;
  }

  asyncOperationRunning.value = true;

  try {
    // TODO: Text needs to be saved to when labels are changed
    // await saveText();
    await saveCharacters();
    await saveAnnotations();

    // All Annotation statuses are updated explicitly to "existing" and the initialData property set to the current data
    updateAnnotationStatuses();

    // Reset initial values of all state components
    initialText.value = cloneDeep(text.value);
    initialSnippetCharacters.value = cloneDeep(snippetCharacters.value);
    initialTotalAnnotations.value = cloneDeep(totalAnnotations.value);

    // Check which annotations are now in snippet. Calling this function is less error prone than setting the state variables explicitly
    // since the new snippetAnnotations will be extracted from the new totalAnnotations state
    extractSnippetAnnotations();

    // Store function is used, combines boundaries resettings
    resetInitialBoundaryCharacters();

    showMessage('success');
  } catch (error: unknown) {
    showMessage('error', error as Error);
    console.error('Error updating text:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

async function handleCancelChanges(): Promise<void> {
  text.value = cloneDeep(initialText.value);
  snippetCharacters.value = cloneDeep(initialSnippetCharacters.value);
  snippetAnnotations.value = cloneDeep(initialSnippetAnnotations.value);

  // TODO: Combine this with extractSnippetAnnotations.
  updateTruncationStatus();

  totalCharacters.value[beforeStartIndex.value] = cloneDeep(initialBeforeStartCharacter.value);
  totalCharacters.value[afterEndIndex.value] = cloneDeep(initialAfterEndCharacter.value);

  initializeHistory();
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

  // TODO: textUuid is not really needed since it is parsed from the url parameter
  const characterPostData: CharacterPostData = {
    textUuid: text.value.data.uuid,
    uuidStart: uuidStart,
    uuidEnd: uuidEnd,
    characters: snippetToUpdate.map((c: Character) => c.data),
    text: totalCharacters.value.map(c => c.data.text).join(''),
  };

  await api.updateCharacterChain(textUuid, characterPostData);
}

async function saveAnnotations(): Promise<void> {
  // Insert into total map since next operations are executed on the total map
  insertSnippetIntoTotalAnnotations();

  updateAnnotationsBeforeSave();

  // Reduce amount of data that need to sent to the backend
  const annotationsToSave: Annotation[] = getAnnotationsToSave();

  await api.updateAnnotations(textUuid, annotationsToSave);
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

function handleKeyDown(event: KeyboardEvent): void {
  const keys: string[] = [];

  if (event.ctrlKey) {
    keys.push('ctrl');
  }

  if (event.shiftKey) {
    keys.push('shift');
  }

  if (event.altKey) {
    keys.push('alt');
  }

  if (event.metaKey) {
    keys.push('meta');
  }

  keys.push(event.key.toLowerCase());

  const keyCombo: string = normalizeKeys(keys);

  // Check if the shortcut combo exists, execute callback function
  if (shortcutMap.value.has(keyCombo)) {
    event.preventDefault();
    shortcutMap.value.get(keyCombo)();
  }
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
  if (!isValidText.value) {
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
  if (!isValidText.value) {
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
  <EditorError v-else-if="isValidText === false" :uuid="textUuid" />
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
