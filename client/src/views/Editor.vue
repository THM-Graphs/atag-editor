<script setup lang="ts">
import {
  ComputedRef,
  WritableComputedRef,
  computed,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
} from 'vue';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import { useCharactersStore } from '../store/characters';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Sidebar from '../components/Sidebar.vue';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import Resizer from '../components/Resizer.vue';
import Metadata from '../components/Metadata.vue';
import {
  findEndOfWord,
  findStartOfWord,
  getParentCharacterSpan,
  getSelectionData,
  isCursorAtBeginning,
  isEditorElement,
  removeFormatting,
} from '../helper/helper';
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

onUpdated(() => {
  placeCursor();
});

onUnmounted((): void => {
  resetCharacters();

  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousedown', handleMouseDown);
});

const route: RouteLocationNormalizedLoaded = useRoute();
const uuid: string = route.params.uuid as string;

const collection = ref<ICollection | null>(null);

const {
  characters,
  deleteCharactersBetweenIndexes,
  initializeCharacters,
  insertCharactersBetweenIndexes,
  resetCharacters,
} = useCharactersStore();

const guidelines = ref<IGuidelines | null>(null);
const resizerWidth = 5;
const newRangeAnchorUuid = ref<string | null>(null);

const mainWidth: ComputedRef<number> = computed(() => {
  const leftSidebarWidth: number = sidebars.value.left.isCollapsed ? 0 : sidebars.value.left.width;
  const rightSidebarWidth: number = sidebars.value.right.isCollapsed
    ? 0
    : sidebars.value.right.width;
  return window.innerWidth - leftSidebarWidth - rightSidebarWidth - resizerWidth * 2;
});

const sidebars = ref<Record<string, SidebarConfig>>({
  left: {
    isCollapsed: true,
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

function handleInput(event: InputEvent) {
  event.preventDefault();

  switch (event.inputType) {
    // Text Insertion
    case 'insertText':
      handleInsertText(event);
      break;
    case 'insertReplacementText':
      handleInsertReplacementText(event);
      break;
    case 'insertFromPaste':
      handleInsertFromPaste(event);
      break;
    case 'insertFromDrop':
      handleInsertFromDrop(event);
      break;
    case 'insertFromYank':
      handleInsertFromYank(event);
      break;

    // Text Deletion
    case 'deleteWordBackward':
      handleDeleteWordBackward(event);
      break;
    case 'deleteWordForward':
      handleDeleteWordForward(event);
      break;
    case 'deleteContentBackward':
      handleDeleteContentBackward(event);
      break;
    case 'deleteContentForward':
      handleDeleteContentForward(event);
      break;
    case 'deleteByCut':
      handleDeleteByCut(event);
      break;
    case 'deleteByDrag':
      handleDeleteByDrag(event);
      break;
    case 'deleteSoftLineBackward':
      handleDeleteSoftLineBackward(event);
      break;
    case 'deleteSoftLineForward':
      handleDeleteSoftLineForward(event);
      break;
    case 'deleteHardLineBackward':
      handleDeleteHardLineBackward(event);
      break;
    case 'deleteHardLineForward':
      handleDeleteHardLineForward(event);
      break;

    default:
      console.log('Unhandled input type:', event.inputType);
  }
}

function handleInsertText(event: InputEvent): void {
  const newCharacter: ICharacter = createNewCharacter(event.data || '');

  const { range, type } = getSelectionData();
  const action: 'insert' | 'replace' = type === 'Caret' ? 'insert' : 'replace';

  let startIndex: number;
  let endIndex: number;

  if (isEditorElement(range.startContainer)) {
    startIndex = -1;
    endIndex = -1;
  } else {
    if (type === 'Caret') {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      if (isCursorAtBeginning(referenceSpanElement, editorRef)) {
        startIndex = 0;
      } else {
        startIndex = characters.value.findIndex(c => c.uuid === referenceSpanElement.id);
      }
      endIndex = startIndex;
    } else {
      const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(
        range.startContainer,
      );
      const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
      if (isCursorAtBeginning(startReferenceSpanElement, editorRef)) {
        startIndex = 0;
      } else {
        startIndex = characters.value.findIndex(c => c.uuid === startReferenceSpanElement.id);
      }
      endIndex = characters.value.findIndex(c => c.uuid === endReferenceSpanElement.id);
    }
  }

  newRangeAnchorUuid.value = newCharacter.uuid;
  insertCharactersBetweenIndexes(startIndex, endIndex, [newCharacter], action);
}

function handleInsertReplacementText(event: InputEvent): void {
  console.log('Replacement event:', event);

  // const newCharacter: ICharacter = {
  //   text: event.data || '',
  //   letterLabel: 'someLabel',
  //   textGuid: '',
  //   textUrl: '',
  //   uuid: crypto.randomUUID(),
  // };
  // characters.value.push(newCharacter);
  // Additional logic for replacement can be added here
}

async function handleInsertFromPaste(event: InputEvent): Promise<void> {
  const text: string = await navigator.clipboard.readText();

  const newCharacters: ICharacter[] = removeFormatting(text)
    .split('')
    .map((c: string): ICharacter => createNewCharacter(c));

  const { range, type } = getSelectionData();
  const action: 'insert' | 'replace' = type === 'Caret' ? 'insert' : 'replace';

  let startIndex: number;
  let endIndex: number;

  console.log('paste');

  if (isEditorElement(range.startContainer)) {
    startIndex = -1;
    endIndex = -1;
  } else {
    if (type === 'Caret') {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      if (isCursorAtBeginning(referenceSpanElement, editorRef)) {
        startIndex = -1;
      } else {
        startIndex = characters.value.findIndex(c => c.uuid === referenceSpanElement.id);
      }
      endIndex = startIndex;
    } else {
      const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(
        range.startContainer,
      );
      const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
      if (isCursorAtBeginning(startReferenceSpanElement, editorRef)) {
        startIndex = -1;
      } else {
        startIndex = characters.value.findIndex(c => c.uuid === startReferenceSpanElement.id);
      }
      endIndex = characters.value.findIndex(c => c.uuid === endReferenceSpanElement.id);
    }
  }

  newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].uuid;
  insertCharactersBetweenIndexes(startIndex, endIndex, newCharacters, action);
}

function handleInsertFromDrop(event: InputEvent): void {
  const dataTransfer: DataTransfer = event.dataTransfer;

  if (!dataTransfer) {
    return;
  }

  const text: string = dataTransfer.getData('text');
  const newCharacters: ICharacter[] = removeFormatting(text)
    .split('')
    .map((c: string): ICharacter => createNewCharacter(c));

  const { range, type } = getSelectionData();
  let action: 'insert' | 'replace' = type === 'Caret' ? 'insert' : 'replace';

  let startIndex: number;
  let endIndex: number;

  if (isEditorElement(range.startContainer)) {
    startIndex = -1;
    endIndex = -1;
  } else {
    if (type === 'Caret') {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      if (isCursorAtBeginning(referenceSpanElement, editorRef)) {
        startIndex = -1;
      } else {
        startIndex = characters.value.findIndex(c => c.uuid === referenceSpanElement.id);
      }
      endIndex = startIndex;
    } else {
      const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(
        range.startContainer,
      );
      const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
      if (isCursorAtBeginning(startReferenceSpanElement, editorRef)) {
        startIndex = -1;
      } else {
        startIndex = characters.value.findIndex(c => c.uuid === startReferenceSpanElement.id);
      }
      endIndex = characters.value.findIndex(c => c.uuid === endReferenceSpanElement.id);
    }
  }

  newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].uuid;
  insertCharactersBetweenIndexes(startIndex, endIndex, newCharacters, action);
}

function handleInsertFromYank(event: InputEvent): void {
  console.log('Yank event:', event);
  // Handle yank logic
}

// Text Deletion Handlers
function handleDeleteWordBackward(event: InputEvent): void {
  const { range, type } = getSelectionData();

  if (isEditorElement(range.startContainer)) {
    return;
  }

  if (type === 'Caret') {
    const spanToDelete: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

    if (isCursorAtBeginning(spanToDelete, editorRef)) {
      return;
    }

    const charIndex: number = characters.value.findIndex(c => c.uuid === spanToDelete.id);
    const startWordIndex: number = findStartOfWord(charIndex, characters.value);

    newRangeAnchorUuid.value = characters.value[startWordIndex - 1]?.uuid ?? null;

    deleteCharactersBetweenIndexes(startWordIndex, charIndex);
  } else {
    handleDeleteContentBackward(event);
  }
}

function handleDeleteWordForward(event: InputEvent): void {
  const { range, type } = getSelectionData();

  let spanToDelete: HTMLSpanElement;

  if (isEditorElement(range.startContainer)) {
    if (editorRef.value.childElementCount === 0) {
      return;
    }

    spanToDelete = getParentCharacterSpan(editorRef.value.firstElementChild) as HTMLSpanElement;
    newRangeAnchorUuid.value = characters.value[0]?.uuid ?? null;

    deleteCharactersBetweenIndexes(0, findEndOfWord(0, characters.value));
  } else {
    const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

    if (type === 'Caret') {
      const charIndex: number = characters.value.findIndex(c => c.uuid === referenceSpanElement.id);
      const endWordIndex: number = findEndOfWord(charIndex, characters.value);

      const deletionStartIndex: number = isCursorAtBeginning(referenceSpanElement, editorRef)
        ? charIndex
        : charIndex + 1;

      newRangeAnchorUuid.value = characters.value[charIndex]?.uuid ?? null;
      deleteCharactersBetweenIndexes(deletionStartIndex, endWordIndex);
    } else {
      handleDeleteContentForward(event);
    }
  }
}

function handleDeleteContentBackward(event: InputEvent): void {
  const { range, type } = getSelectionData();

  if (isEditorElement(range.startContainer)) {
    // TODO: Any edge cases where this might occur?
    return;
  }

  if (type === 'Caret') {
    const spanToDelete: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

    if (isCursorAtBeginning(spanToDelete, editorRef)) {
      return;
    }

    const charIndex: number = characters.value.findIndex(c => c.uuid === spanToDelete.id);
    newRangeAnchorUuid.value = characters.value[charIndex - 1]?.uuid ?? null;

    deleteCharactersBetweenIndexes(charIndex, charIndex);
  } else {
    const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
    const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
    const startIndex: number = characters.value.findIndex(
      c => c.uuid === startReferenceSpanElement.id,
    );
    const endIndex: number = characters.value.findIndex(c => c.uuid === endReferenceSpanElement.id);

    newRangeAnchorUuid.value = characters.value[startIndex - 1]?.uuid ?? null;

    deleteCharactersBetweenIndexes(startIndex, endIndex);
  }
}

function handleDeleteContentForward(event: InputEvent): void {
  const { range, type } = getSelectionData();

  let spanToDelete: HTMLSpanElement;

  if (isEditorElement(range.startContainer)) {
    if (editorRef.value.childElementCount === 0) {
      return;
    }

    spanToDelete = getParentCharacterSpan(editorRef.value.firstElementChild) as HTMLSpanElement;
    newRangeAnchorUuid.value = characters.value[0]?.uuid ?? null;

    deleteCharactersBetweenIndexes(0, 0);
  } else {
    const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

    if (type === 'Caret') {
      if (range.startOffset === 0) {
        spanToDelete = referenceSpanElement;
      } else {
        if (referenceSpanElement === editorRef.value.lastElementChild) {
          return;
        } else {
          spanToDelete = referenceSpanElement.nextElementSibling as HTMLSpanElement;
        }
      }

      const charIndex: number = characters.value.findIndex(c => c.uuid === spanToDelete.id);
      newRangeAnchorUuid.value = characters.value[charIndex - 1]?.uuid ?? null;

      deleteCharactersBetweenIndexes(charIndex, charIndex);
    } else {
      const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(
        range.startContainer,
      );
      const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
      const startIndex: number = characters.value.findIndex(
        c => c.uuid === startReferenceSpanElement.id,
      );
      const endIndex: number = characters.value.findIndex(
        c => c.uuid === endReferenceSpanElement.id,
      );

      newRangeAnchorUuid.value = characters.value[startIndex - 1]?.uuid ?? null;

      deleteCharactersBetweenIndexes(startIndex, endIndex);
    }
  }
}

function handleDeleteByCut(event: InputEvent): void {
  const { range } = getSelectionData();

  const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
  const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
  const startIndex: number = characters.value.findIndex(
    c => c.uuid === startReferenceSpanElement.id,
  );
  const endIndex: number = characters.value.findIndex(c => c.uuid === endReferenceSpanElement.id);

  newRangeAnchorUuid.value = characters.value[startIndex - 1]?.uuid ?? null;

  deleteCharactersBetweenIndexes(startIndex, endIndex);

  handleCopy();
}

function handleDeleteByDrag(event: InputEvent): void {
  // TODO: Should this be handled? Drag and drop with annotated text will be very complex
  return;
}

function handleDeleteSoftLineBackward(event: InputEvent): void {
  console.log('DeleteSoftLineBackward event:', event);
  // Handle delete soft line backward logic
}

function handleDeleteSoftLineForward(event: InputEvent): void {
  console.log('DeleteSoftLineForward event:', event);
  // Handle delete soft line forward logic
}

function handleDeleteHardLineBackward(event: InputEvent): void {
  console.log('DeleteHardLineBackward event:', event);
  // Handle delete hard line backward logic
}

function handleDeleteHardLineForward(event: InputEvent): void {
  console.log('DeleteHardLineForward event:', event);
  // Handle delete hard line forward logic
}

async function handleCopy(): Promise<void> {
  const { selection } = getSelectionData();
  const text: string = selection.toString();

  if (text.length === 0) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (error: unknown) {
    console.error('Failed to copy text to clipboard:', error);
  }
}

function createNewCharacter(char: string): ICharacter {
  // TODO: Reduce this, letterLabel/textUrl/textGuid can be dynamic and should be added on save
  return {
    text: char,
    letterLabel: collection.value.label,
    textGuid: '',
    textUrl: '',
    uuid: crypto.randomUUID(),
  };
}

// TODO: This takes very long on bigger texts -> improve
function placeCursor(): void {
  const range: Range = document.createRange();
  let element: HTMLDivElement | HTMLSpanElement | null;

  if (newRangeAnchorUuid.value) {
    element = document.getElementById(newRangeAnchorUuid.value) as HTMLSpanElement;
  } else {
    element = document.querySelector('#text') as HTMLDivElement;
  }

  if (!element) {
    return;
  }

  range.setStart(element, 1);
  range.setEnd(element, 1);
  range.collapse(true);

  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
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
            ref="editorRef"
            contenteditable="true"
            spellcheck="false"
            @beforeinput="handleInput"
            @copy="handleCopy"
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

#text > span {
  white-space-collapse: break-spaces;
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
