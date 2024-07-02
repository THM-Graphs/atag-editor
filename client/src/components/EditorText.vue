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
  removeFormatting,
} from '../helper/helper';
import ICharacter from '../models/ICharacter';

onUpdated(() => {
  placeCursor();
});

const { collection } = useCollectionStore();
const {
  characters,
  deleteCharactersBetweenIndexes,
  insertCharactersAtIndex,
  replaceCharactersBetweenIndizes,
} = useCharactersStore();

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
  const newCharacter: ICharacter = createNewCharacter(event.data || '');

  const { range, type } = getSelectionData();

  if (isEditorElement(range.startContainer)) {
    newRangeAnchorUuid.value = newCharacter.uuid;
    insertCharactersAtIndex(0, [newCharacter]);
  } else {
    if (type === 'Caret') {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let index: number;

      if (isCursorAtBeginning(referenceSpanElement, editorRef)) {
        index = 0;
      } else {
        index = characters.value.findIndex(c => c.uuid === referenceSpanElement.id) + 1;
      }

      newRangeAnchorUuid.value = newCharacter.uuid;
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
        startIndex = characters.value.findIndex(c => c.uuid === startReferenceSpanElement.id);
      }

      endIndex = characters.value.findIndex(c => c.uuid === endReferenceSpanElement.id);

      newRangeAnchorUuid.value = newCharacter.uuid;
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

  const newCharacters: ICharacter[] = removeFormatting(text)
    .split('')
    .map((c: string): ICharacter => createNewCharacter(c));

  const { range, type } = getSelectionData();

  if (isEditorElement(range.startContainer)) {
    newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].uuid;
    insertCharactersAtIndex(0, newCharacters);
  } else {
    if (type === 'Caret') {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let index: number;

      if (isCursorAtBeginning(referenceSpanElement, editorRef)) {
        index = 0;
      } else {
        index = characters.value.findIndex(c => c.uuid === referenceSpanElement.id) + 1;
      }

      newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].uuid;
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
        startIndex = characters.value.findIndex(c => c.uuid === startReferenceSpanElement.id);
      }

      endIndex = characters.value.findIndex(c => c.uuid === endReferenceSpanElement.id);

      newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].uuid;
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
  const newCharacters: ICharacter[] = removeFormatting(text)
    .split('')
    .map((c: string): ICharacter => createNewCharacter(c));

  const { range, type } = getSelectionData();

  if (isEditorElement(range.startContainer)) {
    newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].uuid;
    insertCharactersAtIndex(0, newCharacters);
  } else {
    if (type === 'Caret') {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let index: number;

      if (isCursorAtBeginning(referenceSpanElement, editorRef)) {
        index = 0;
      } else {
        index = characters.value.findIndex(c => c.uuid === referenceSpanElement.id);
      }

      newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].uuid;
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
        startIndex = characters.value.findIndex(c => c.uuid === startReferenceSpanElement.id);
      }

      endIndex = characters.value.findIndex(c => c.uuid === endReferenceSpanElement.id);

      newRangeAnchorUuid.value = newCharacters[newCharacters.length - 1].uuid;
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

function handleUndo(event: KeyboardEvent): void {
  alert('undo (Ctrl + Z) is not yet implemented');
}

function handleRedo(event: KeyboardEvent): void {
  alert('redo (Ctrl + Shift + Z) is not yet implemented');
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
        @keydown.ctrl.z.exact="handleUndo"
        @keydown.ctrl.shift.z.exact="handleRedo"
      >
        <span
          v-for="character in characters"
          :key="character.uuid"
          :id="character.uuid"
          :data-uuid="character.uuid"
        >
          {{ character.text }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
</style>
