<script setup lang="ts">
import { onUpdated, ref } from 'vue';
import { useCharactersStore } from '../store/characters';
import { useCollectionStore } from '../store/collection';
import {
  findEndOfWord,
  findStartOfWord,
  getParentCharacterSpan,
  getSelectionData,
  isCursorAtBeginning,
  isEditorElement,
  objectsAreEqual,
  removeFormatting,
} from '../helper/helper';
import Button from 'primevue/button';
import ToggleSwitch from 'primevue/toggleswitch';
import { Character } from '../models/types';

onUpdated(() => {
  placeCursor();
});

const { collection, initialCollection } = useCollectionStore();
const {
  afterEndIndex,
  beforeStartIndex,
  initialCharacters,
  snippetCharacters,
  totalCharacters,
  deleteCharactersBetweenIndexes,
  insertCharactersAtIndex,
  nextCharacters,
  previousCharacters,
  replaceCharactersBetweenIndizes,
} = useCharactersStore();

const keepTextOnPagination = ref<boolean>(false);

const newRangeAnchorUuid = ref<string | null>(null);
const editorRef = ref<HTMLDivElement>(null);

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
  const newCharacter: Character = createNewCharacter(event.data || '');

  const { range, type } = getSelectionData();

  if (isEditorElement(range.startContainer)) {
    newRangeAnchorUuid.value = newCharacter.data.uuid;
    insertCharactersAtIndex(0, [newCharacter]);
  } else {
    if (type === 'Caret') {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let index: number;

      if (isCursorAtBeginning(referenceSpanElement, editorRef)) {
        index = 0;
      } else {
        index = snippetCharacters.value.findIndex(c => c.data.uuid === referenceSpanElement.id) + 1;
      }

      newRangeAnchorUuid.value = newCharacter.data.uuid;
      insertCharactersAtIndex(index, [newCharacter]);
    } else {
      const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(
        range.startContainer,
      );
      const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
      let startIndex: number;
      let endIndex: number;

      if (isCursorAtBeginning(startReferenceSpanElement, editorRef)) {
        startIndex = 0;
      } else {
        startIndex = snippetCharacters.value.findIndex(
          c => c.data.uuid === startReferenceSpanElement.id,
        );
      }

      endIndex = snippetCharacters.value.findIndex(c => c.data.uuid === endReferenceSpanElement.id);

      newRangeAnchorUuid.value = newCharacter.data.uuid;
      replaceCharactersBetweenIndizes(startIndex, endIndex, [newCharacter]);
    }
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
  const text: string = await navigator.clipboard.readText();

  const newCharacters: Character[] = removeFormatting(text)
    .split('')
    .map((c: string): Character => createNewCharacter(c));

  const { range, type } = getSelectionData();

  if (isEditorElement(range.startContainer)) {
    newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].data.uuid;
    insertCharactersAtIndex(0, newCharacters);
  } else {
    if (type === 'Caret') {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let index: number;

      if (isCursorAtBeginning(referenceSpanElement, editorRef)) {
        index = 0;
      } else {
        index = snippetCharacters.value.findIndex(c => c.data.uuid === referenceSpanElement.id) + 1;
      }

      newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].data.uuid;
      insertCharactersAtIndex(index, newCharacters);
    } else {
      const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(
        range.startContainer,
      );
      const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
      let startIndex: number;
      let endIndex: number;

      if (isCursorAtBeginning(startReferenceSpanElement, editorRef)) {
        startIndex = 0;
      } else {
        startIndex = snippetCharacters.value.findIndex(
          c => c.data.uuid === startReferenceSpanElement.id,
        );
      }

      endIndex = snippetCharacters.value.findIndex(c => c.data.uuid === endReferenceSpanElement.id);

      newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].data.uuid;
      replaceCharactersBetweenIndizes(startIndex, endIndex, newCharacters);
    }
  }
}

function handleInsertFromDrop(event: InputEvent): void {
  const dataTransfer: DataTransfer = event.dataTransfer;

  if (!dataTransfer) {
    return;
  }

  const text: string = dataTransfer.getData('text');
  const newCharacters: Character[] = removeFormatting(text)
    .split('')
    .map((c: string): Character => createNewCharacter(c));

  const { range, type } = getSelectionData();

  if (isEditorElement(range.startContainer)) {
    newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].data.uuid;
    insertCharactersAtIndex(0, newCharacters);
  } else {
    if (type === 'Caret') {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let index: number;

      if (isCursorAtBeginning(referenceSpanElement, editorRef)) {
        index = 0;
      } else {
        index = snippetCharacters.value.findIndex(c => c.data.uuid === referenceSpanElement.id);
      }

      newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].data.uuid;
      insertCharactersAtIndex(index, newCharacters);
    } else {
      const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(
        range.startContainer,
      );
      const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
      let startIndex: number;
      let endIndex: number;

      if (isCursorAtBeginning(startReferenceSpanElement, editorRef)) {
        startIndex = 0;
      } else {
        startIndex = snippetCharacters.value.findIndex(
          c => c.data.uuid === startReferenceSpanElement.id,
        );
      }

      endIndex = snippetCharacters.value.findIndex(c => c.data.uuid === endReferenceSpanElement.id);

      newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].data.uuid;
      replaceCharactersBetweenIndizes(startIndex, endIndex, newCharacters);
    }
  }
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

    const charIndex: number = snippetCharacters.value.findIndex(
      c => c.data.uuid === spanToDelete.id,
    );
    const startWordIndex: number = findStartOfWord(charIndex, snippetCharacters.value);

    newRangeAnchorUuid.value = snippetCharacters.value[startWordIndex - 1]?.data.uuid ?? null;

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
    newRangeAnchorUuid.value = snippetCharacters.value[0]?.data.uuid ?? null;

    deleteCharactersBetweenIndexes(0, findEndOfWord(0, snippetCharacters.value));
  } else {
    const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

    if (type === 'Caret') {
      const charIndex: number = snippetCharacters.value.findIndex(
        c => c.data.uuid === referenceSpanElement.id,
      );
      const endWordIndex: number = findEndOfWord(charIndex, snippetCharacters.value);

      const deletionStartIndex: number = isCursorAtBeginning(referenceSpanElement, editorRef)
        ? charIndex
        : charIndex + 1;

      newRangeAnchorUuid.value = snippetCharacters.value[charIndex]?.data.uuid ?? null;
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

    const charIndex: number = snippetCharacters.value.findIndex(
      c => c.data.uuid === spanToDelete.id,
    );
    newRangeAnchorUuid.value = snippetCharacters.value[charIndex - 1]?.data.uuid ?? null;

    deleteCharactersBetweenIndexes(charIndex, charIndex);
  } else {
    const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
    const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
    const startIndex: number = snippetCharacters.value.findIndex(
      c => c.data.uuid === startReferenceSpanElement.id,
    );
    const endIndex: number = snippetCharacters.value.findIndex(
      c => c.data.uuid === endReferenceSpanElement.id,
    );

    newRangeAnchorUuid.value = snippetCharacters.value[startIndex - 1]?.data.uuid ?? null;

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
    newRangeAnchorUuid.value = snippetCharacters.value[0]?.data.uuid ?? null;

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

      const charIndex: number = snippetCharacters.value.findIndex(
        c => c.data.uuid === spanToDelete.id,
      );
      newRangeAnchorUuid.value = snippetCharacters.value[charIndex - 1]?.data.uuid ?? null;

      deleteCharactersBetweenIndexes(charIndex, charIndex);
    } else {
      const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(
        range.startContainer,
      );
      const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
      const startIndex: number = snippetCharacters.value.findIndex(
        c => c.data.uuid === startReferenceSpanElement.id,
      );
      const endIndex: number = snippetCharacters.value.findIndex(
        c => c.data.uuid === endReferenceSpanElement.id,
      );

      newRangeAnchorUuid.value = snippetCharacters.value[startIndex - 1]?.data.uuid ?? null;

      deleteCharactersBetweenIndexes(startIndex, endIndex);
    }
  }
}

function handleDeleteByCut(event: InputEvent): void {
  const { range } = getSelectionData();

  const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
  const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
  const startIndex: number = snippetCharacters.value.findIndex(
    c => c.data.uuid === startReferenceSpanElement.id,
  );
  const endIndex: number = snippetCharacters.value.findIndex(
    c => c.data.uuid === endReferenceSpanElement.id,
  );

  newRangeAnchorUuid.value = snippetCharacters.value[startIndex - 1]?.data.uuid ?? null;

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

function handleUndo(event: KeyboardEvent): void {
  alert('undo (Ctrl + Z) is not yet implemented');
}

function handleRedo(event: KeyboardEvent): void {
  alert('redo (Ctrl + Shift + Z) is not yet implemented');
}

function handlePaginationUp(event: MouseEvent): void {
  if (hasUnsavedChanges()) {
    console.log('SAVE YOUR CHANGES');
    return;
  }

  const mode: 'keep' | 'replace' = keepTextOnPagination.value === true ? 'keep' : 'replace';

  previousCharacters(mode);
}

function handlePaginationDown(event: MouseEvent): void {
  if (hasUnsavedChanges()) {
    console.log('SAVE YOUR CHANGES');
    return;
  }

  const mode: 'keep' | 'replace' = keepTextOnPagination.value === true ? 'keep' : 'replace';

  nextCharacters(mode);
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

function createNewCharacter(char: string): Character {
  return {
    data: {
      text: char,
      letterLabel: collection.value.label,
      uuid: crypto.randomUUID(),
    },
    annotations: [],
  };
}

// TODO: This is duplicate, also exists in Editor.vue
function hasUnsavedChanges(): boolean {
  // Compare collection properties
  if (!objectsAreEqual(collection.value, initialCollection.value)) {
    return true;
  }

  // Compare charactfers length
  if (snippetCharacters.value.length !== initialCharacters.value.length) {
    return true;
  }

  // Compare characters values
  for (let index = 0; index < snippetCharacters.value.length; index++) {
    if (
      !objectsAreEqual(snippetCharacters.value[index].data, initialCharacters.value[index].data)
    ) {
      return true;
    }
  }

  return false;
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
  <div class="content flex flex-column flex-1 px-3 py-1 overflow-hidden">
    <div>
      Total: {{ totalCharacters.length }} <br />
      Current snippet: {{ snippetCharacters.length }} <br />
      beforeStartIndex: {{ beforeStartIndex }} <br />
      afterEndIndex: {{ afterEndIndex }}
    </div>
    <div class="flex justify-content-end">
      <label class="label">Keep text on pagination</label>
      <ToggleSwitch v-model="keepTextOnPagination" />
    </div>
    <div class="counter text-right mb-1">
      <small
        >{{ snippetCharacters.length }} character{{
          snippetCharacters.length !== 1 ? 's' : ''
        }}</small
      >
    </div>
    <div>
      <Button
        class="w-full"
        label="Previous"
        aria-label="Show previous characters"
        severity="secondary"
        icon="pi pi-arrow-up"
        @click="handlePaginationUp"
      ></Button>
    </div>
    <div class="text-container h-full p-2 overflow-auto">
      <div
        id="text"
        class="min-h-full"
        ref="editorRef"
        contenteditable="true"
        spellcheck="false"
        @beforeinput="handleInput"
        @copy="handleCopy"
        @keydown.ctrl.z.exact="handleUndo"
        @keydown.ctrl.shift.z.exact="handleRedo"
      >
        <span
          v-for="character in snippetCharacters"
          :key="character.data.uuid"
          :id="character.data.uuid"
          :data-uuid="character.data.uuid"
          :class="[
            character.annotations.length > 0 ? 'annotated' : '',
            character.annotations.some(a => a.isFirstCharacter || a.isLastCharacter)
              ? 'boundary'
              : '',
          ]"
        >
          {{ character.data.text }}
        </span>
      </div>
    </div>
    <div>
      <Button
        class="w-full"
        label="Next"
        aria-label="Show next characters"
        severity="secondary"
        icon="pi pi-arrow-down"
        @click="handlePaginationDown"
      ></Button>
    </div>
  </div>
</template>

<style scoped>
.text-container {
  background-color: white;
  border-radius: 3px;
  outline: 1px solid var(--color-focus);

  &:has(:focus-visible) {
    box-shadow: var(--box-shadow-focus);
    outline: 0;
  }
}

span.annotated {
  background-color: rgb(233, 197, 89);
}

span.boundary {
  background-color: rgb(166, 125, 0);
}

#text {
  outline: 0;
}

#text > span {
  white-space-collapse: break-spaces;
}
</style>
