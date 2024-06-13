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
import { getParentCharacterSpan, isEditorElement } from '../helper/helper';

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
  if (insertedCharacterUUID.value) {
    placeCursorAfterSpan(insertedCharacterUUID.value);
    // Reset the insertedCharacterUUID ref
    insertedCharacterUUID.value = null;
  }
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
const insertedCharacterUUID = ref<string | null>(null);

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
  newCharacter: ICharacter,
  position: 'before' | 'after',
  referenceCharUuid?: string | undefined,
): void {
  const indexOfReferenceChar: number = referenceCharUuid
    ? characters.value.findIndex(c => c.uuid === referenceCharUuid)
    : 0;

  if (indexOfReferenceChar !== -1) {
    const indexToInsert: number = position === 'before' ? 0 : 1;
    // console.time('splice');
    characters.value.splice(indexOfReferenceChar + indexToInsert, 0, newCharacter);
    // console.timeEnd('splice');
    insertedCharacterUUID.value = newCharacter.uuid;
  } else {
    console.log('UUID not found');
  }
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

  // TODO: Set range after each operation, not only after text insertion
}

function handleInsertText(event: InputEvent): void {
  // TODO: Reduce this, letterLabel/textUrl/textGuid can be dynamic and should be added on save
  const newCharacter: ICharacter = {
    text: event.data || '',
    letterLabel: collection.value.label,
    textGuid: '',
    textUrl: '',
    uuid: crypto.randomUUID(),
  };

  const selection: Selection = window.getSelection();

  const range: Range = selection.getRangeAt(0);
  const type: string = selection.type;

  console.log(range);

  if (isEditorElement(range.startContainer)) {
    // Nothing selected -> Empty text
    console.log('No existing text yet');
    insertCharacter(newCharacter, 'after', undefined);
  } else {
    // The span element after which the new text will be added
    let referenceSpanElement: HTMLSpanElement;

    if (type === 'Caret') {
      referenceSpanElement = getParentCharacterSpan(range.startContainer);
    } else {
      // TODO: Add handling
      // text is selected -> needs to be deleted
      console.log('Some text is selected, handle this please');
      return;
    }

    const position: 'before' | 'after' = range.startOffset === 0 ? 'before' : 'after';
    insertCharacter(newCharacter, position, referenceSpanElement.id);
  }
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
  // console.log('Paste event:', event);
  // console.log(event);

  const text: string = await navigator.clipboard.readText();
  text.split('').forEach((c: string) => {
    const newCharacter: ICharacter = {
      text: c,
      letterLabel: collection.value.label,
      textGuid: '',
      textUrl: '',
      uuid: crypto.randomUUID(),
    };
    // insert character...
  });
}

function handleInsertFromDrop(event: InputEvent): void {
  console.log('Drop event:', event);
  // Handle drop logic
}

function handleInsertFromYank(event: InputEvent): void {
  console.log('Yank event:', event);
  // Handle yank logic
}

// Text Deletion Handlers
function handleDeleteWordBackward(event: InputEvent): void {
  console.log('DeleteWordBackward event:', event);
  // Handle delete word backward logic
}

function handleDeleteWordForward(event: InputEvent): void {
  console.log('DeleteWordForward event:', event);
  // Handle delete word forward logic
}

function handleDeleteContentBackward(event: InputEvent): void {
  console.log('DeleteContentBackward event:', event);
  if (characters.value.length > 0) {
    characters.value.pop();
  }
}

function handleDeleteContentForward(event: InputEvent): void {
  console.log('DeleteContentForward event:', event);
  // Handle delete content forward logic
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
  const selection: Selection = window.getSelection();
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

// TODO: This takes very long on bigger texts -> improve
function placeCursorAfterSpan(spanUUID: string): void {
  const spanElement: HTMLSpanElement | null = document.getElementById(spanUUID);

  if (!spanElement) {
    return;
  }

  const range: Range = document.createRange();

  range.setStart(spanElement, 1);
  range.setEnd(spanElement, 1);
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
