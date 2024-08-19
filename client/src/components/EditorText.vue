<script setup lang="ts">
import { onUpdated, ref, watch } from 'vue';
import { useTextSelection } from '@vueuse/core';
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
import Button from 'primevue/button';
import ToggleSwitch from 'primevue/toggleswitch';
import { useAnnotationStore } from '../store/annotations';
import { useEditorStore } from '../store/editor';
import { useFilterStore } from '../store/filter';
import { Annotation, Character } from '../models/types';

onUpdated(() => {
  placeCursor();
});

const { newRangeAnchorUuid, selectedAnnotations, hasUnsavedChanges, placeCursor } =
  useEditorStore();
const { collection } = useCollectionStore();
const {
  afterEndIndex,
  beforeStartIndex,
  snippetCharacters,
  totalCharacters,
  deleteCharactersBetweenIndexes,
  insertCharactersAtIndex,
  nextCharacters,
  previousCharacters,
  replaceCharactersBetweenIndizes,
} = useCharactersStore();
const { annotations } = useAnnotationStore();
const { selectedOptions } = useFilterStore();
const state = useTextSelection();

const keepTextOnPagination = ref<boolean>(false);

const editorRef = ref<HTMLDivElement>(null);

watch(state.ranges, updateAnnotationFormPanel);

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

  // TODO: Move this to store or helper, similar methods in EditorAnnotations.vue

  let charUuids: Set<string> = new Set();

  snippetCharacters.value.forEach(c => {
    c.annotations.forEach(a => charUuids.add(a.uuid));
  });

  annotations.value.forEach((annotation: Annotation) => {
    if (!charUuids.has(annotation.data.uuid)) {
      annotation.isTruncated = false;
    } else {
      const isLeftTruncated: boolean =
        beforeStartIndex.value &&
        totalCharacters.value[beforeStartIndex.value].annotations.some(
          a => a.uuid === annotation.data.uuid,
        );

      const isRightTruncated: boolean =
        afterEndIndex.value &&
        totalCharacters.value[afterEndIndex.value].annotations.some(
          a => a.uuid === annotation.data.uuid,
        );

      if (isLeftTruncated || isRightTruncated) {
        annotation.isTruncated = true;
      } else {
        annotation.isTruncated = false;
      }
    }
  });
}

function handlePaginationDown(event: MouseEvent): void {
  if (hasUnsavedChanges()) {
    console.log('SAVE YOUR CHANGES');
    return;
  }

  const mode: 'keep' | 'replace' = keepTextOnPagination.value === true ? 'keep' : 'replace';

  nextCharacters(mode);

  // TODO: Move this to store or helper, similar methods in EditorAnnotations.vue

  let charUuids: Set<string> = new Set();

  snippetCharacters.value.forEach(c => {
    c.annotations.forEach(a => charUuids.add(a.uuid));
  });

  annotations.value.forEach((annotation: Annotation) => {
    if (!charUuids.has(annotation.data.uuid)) {
      annotation.isTruncated = false;
    } else {
      const isLeftTruncated: boolean =
        beforeStartIndex.value &&
        totalCharacters.value[beforeStartIndex.value].annotations.some(
          a => a.uuid === annotation.data.uuid,
        );

      const isRightTruncated: boolean =
        afterEndIndex.value &&
        totalCharacters.value[afterEndIndex.value].annotations.some(
          a => a.uuid === annotation.data.uuid,
        );

      if (isLeftTruncated || isRightTruncated) {
        annotation.isTruncated = true;
      } else {
        annotation.isTruncated = false;
      }
    }
  });
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

function findAnnotationUuids(firstChar: HTMLSpanElement, lastChar: HTMLSpanElement): Set<string> {
  const annoUuids: Set<string> = new Set();

  let current: HTMLSpanElement = firstChar;

  while (current && current !== lastChar) {
    [...current.children].forEach(c => {
      annoUuids.add((c as HTMLSpanElement).dataset.annoUuid || '');
    });

    current = current.nextElementSibling as HTMLSpanElement;
  }

  [...lastChar.children].forEach(c => {
    annoUuids.add((c as HTMLSpanElement).dataset.annoUuid || '');
  });

  return annoUuids;
}

// TODO: Move this to annotation panel directly? Uses store anyway
function updateAnnotationFormPanel(): void {
  // On initial page load there is no range
  if (state.ranges.value.length < 1 || state.selection.value.type === 'None') {
    return;
  }

  const commonAncestorContainer: Node | undefined | Element =
    state.ranges.value[0].commonAncestorContainer;

  // Selection is outside of text component (with element node as container)
  if (commonAncestorContainer instanceof Element && !commonAncestorContainer.closest('#text')) {
    console.log('outside of text component');
    return;
  }

  // Selection is outside of text component (with text node as container)
  if (
    commonAncestorContainer.nodeType === Node.TEXT_NODE &&
    !commonAncestorContainer.parentElement.closest('#text')
  ) {
    console.log('outside of text component');
    return;
  }

  let firstSpan: HTMLSpanElement;
  let lastSpan: HTMLSpanElement;
  let annotationUuids: Set<string>;

  if (state.selection.value.type === 'Caret') {
    // This happens when there is not text and the range will has to be set to the whole editor div instead of a span
    if (
      isEditorElement(state.ranges.value[0].startContainer) ||
      isEditorElement(state.ranges.value[0].endContainer)
    ) {
      firstSpan = editorRef.value.querySelector('span');
      lastSpan = firstSpan;
      annotationUuids = firstSpan ? findAnnotationUuids(firstSpan, firstSpan) : new Set();

      selectedAnnotations.value = annotations.value.filter(a => annotationUuids.has(a.data.uuid));
      return;
    } else {
      firstSpan = getParentCharacterSpan(state.ranges.value[0].startContainer);
      lastSpan = getParentCharacterSpan(state.ranges.value[0].endContainer);

      if (firstSpan === lastSpan) {
        if (state.ranges.value[0].startOffset === 0) {
          lastSpan = (firstSpan.previousElementSibling as HTMLSpanElement) ?? firstSpan;
        } else if (state.ranges.value[0].endOffset === 1) {
          lastSpan = (firstSpan.nextElementSibling as HTMLSpanElement) ?? firstSpan;
        }
      }
    }
  } else {
    firstSpan = getParentCharacterSpan(state.ranges.value[0].startContainer);
    lastSpan = getParentCharacterSpan(state.ranges.value[0].endContainer);
  }

  annotationUuids = findAnnotationUuids(firstSpan, lastSpan);
  selectedAnnotations.value = annotations.value.filter(a => annotationUuids.has(a.data.uuid));
}
</script>

<template>
  <div class="content flex flex-column flex-1 px-3 py-1 overflow-hidden">
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
            character.annotations.some(a => a.isFirstCharacter) ? 'boundary-start' : '',
            character.annotations.some(a => a.isLastCharacter) ? 'boundary-end' : '',
          ]"
        >
          {{ character.data.text
          }}<template v-for="annotation in character.annotations" :key="annotation.uuid">
            <span
              v-if="selectedOptions.includes(annotation.type)"
              :class="[
                'anno',
                annotation.isFirstCharacter || annotation.isLastCharacter ? 'boundary' : '',
                annotation.type,
              ]"
              :data-anno-uuid="annotation.uuid"
            >
            </span>
          </template>
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

#text {
  outline: 0;
}

.boundary-start {
  background-color: lightgreen !important;
}

.boundary-end {
  background-color: pink !important;
}

#text > span {
  white-space-collapse: break-spaces;
  position: relative;

  &.highlight {
    background-color: yellow;
  }
}
</style>
