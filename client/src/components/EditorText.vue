<script setup lang="ts">
import { computed, ComputedRef, onMounted, onUpdated, ref } from 'vue';
import { useCharactersStore } from '../store/characters';
import EditorTextNavigation from './EditorTextNavigation.vue';
import {
  getCharacterUuidFromSpan,
  getParentCharacterSpan,
  getOuterRangeBoundaries,
  getSelectionData,
  isCaretAtBeginning,
  isCaretAtEnd,
  isEditorElement,
  removeFormatting,
} from '../utils/helper/helper';
import ToggleSwitch from 'primevue/toggleswitch';
import { useEditorStore } from '../store/editor';
import { useFilterStore } from '../store/filter';
import TextOperationError from '../utils/errors/textOperation.error';
import { useToast } from 'primevue/usetoast';
import { Character } from '../models/types';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useEventListener } from '@vueuse/core';

const { asyncOperationRunning } = defineProps<{ asyncOperationRunning: boolean }>();

onMounted(() => {
  placeCaret();
});

onUpdated(() => {
  placeCaret();
});

const { keepTextOnPagination, execCommand, placeCaret, redo, undo } = useEditorStore();
const { afterEndIndex, beforeStartIndex, snippetCharacters, totalCharacters } =
  useCharactersStore();
const { selectedOptions } = useFilterStore();

useEventListener(window, 'forceCaretPlacement', placeCaret);

const editorRef = ref<HTMLDivElement>(null);

// This calculation is needed since totalCharacters is decoupled and only updated just before saving changes.
const charCounterMessage: ComputedRef<string> = computed(() => {
  const charsBeforeCount: number = beforeStartIndex.value ? beforeStartIndex.value + 1 : 0;
  const charsAfterCount: number = afterEndIndex.value
    ? totalCharacters.value.length - afterEndIndex.value
    : 0;
  const total: number = charsBeforeCount + snippetCharacters.value.length + charsAfterCount;
  const current: number = snippetCharacters.value.length;

  return `${current.toLocaleString()} of ${total.toLocaleString()} characters`;
});

const toast: ToastServiceMethods = useToast();

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
      handleInsertFromPaste();
      break;
    case 'insertFromDrop':
      handleInsertFromDrop(event);
      break;
    case 'insertFromYank':
      handleInsertFromYank(event);
      break;

    // Text Deletion
    case 'deleteWordBackward':
      handleDeleteWordBackward();
      break;
    case 'deleteWordForward':
      handleDeleteWordForward();
      break;
    case 'deleteContentBackward':
      handleDeleteContentBackward();
      break;
    case 'deleteContentForward':
      handleDeleteContentForward();
      break;
    case 'deleteByCut':
      handleDeleteByCut();
      break;
    case 'deleteByDrag':
      handleDeleteByDrag();
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

  if (type === 'Caret') {
    let leftUuid: string | null;
    let rightUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = null;
      rightUuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtBeginning(referenceSpanElement, editorRef)) {
        leftUuid = null;
        rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
      } else {
        if (range.startOffset === 0) {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement.previousElementSibling);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
        } else {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement.nextElementSibling);
        }
      }
    }

    execCommand('insertText', { leftUuid, rightUuid, characters: [newCharacter] });
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    execCommand('replaceText', { leftUuid, rightUuid, characters: [newCharacter] });
  }
}

function handleInsertReplacementText(event: InputEvent): void {
  console.log('Replacement event:', event);

  // const newCharacter: ICharacter = {
  //   uuid: crypto.randomUUID(),
  //   text: event.data || '',
  // };
  // characters.value.push(newCharacter);
  // Additional logic for replacement can be added here
}

async function handleInsertFromPaste(): Promise<void> {
  const text: string = await navigator.clipboard.readText();

  const newCharacters: Character[] = removeFormatting(text)
    .split('')
    .map((c: string): Character => createNewCharacter(c));

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let leftUuid: string | null;
    let rightUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = null;
      rightUuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtBeginning(referenceSpanElement, editorRef)) {
        leftUuid = null;
        rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
      } else {
        if (range.startOffset === 0) {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement.previousElementSibling);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
        } else {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement.nextElementSibling);
        }
      }
    }

    execCommand('insertText', { leftUuid, rightUuid, characters: newCharacters });
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    execCommand('replaceText', { leftUuid, rightUuid, characters: newCharacters });
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

  if (type === 'Caret') {
    let leftUuid: string | null;
    let rightUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = null;
      rightUuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtBeginning(referenceSpanElement, editorRef)) {
        leftUuid = null;
        rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
      } else {
        if (range.startOffset === 0) {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement.previousElementSibling);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement);
        } else {
          leftUuid = getCharacterUuidFromSpan(referenceSpanElement);
          rightUuid = getCharacterUuidFromSpan(referenceSpanElement.nextElementSibling);
        }
      }
    }

    execCommand('insertText', { leftUuid, rightUuid, characters: newCharacters });
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    execCommand('replaceText', { leftUuid, rightUuid, characters: newCharacters });
  }
}

function handleInsertFromYank(event: InputEvent): void {
  console.log('Yank event:', event);
  // Handle yank logic
}

// Text Deletion Handlers
function handleDeleteWordBackward(): void {
  // If there is no text, nothing should happen
  if (snippetCharacters.value.length === 0) {
    return;
  }

  const { range, type } = getSelectionData();

  // TODO: In Firefox, the range type is always Caret -> Overwrite default behaviour?
  // See https://www.reddit.com/r/firefox/comments/gxj9qd/does_anyone_else_find_that_ctrlbackspace_on/
  if (type === 'Caret') {
    if (isEditorElement(range.startContainer)) {
      return;
    }

    const spanToDelete: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

    if (isCaretAtBeginning(spanToDelete, editorRef)) {
      return;
    }

    const { rightUuid } = getOuterRangeBoundaries(range);

    try {
      execCommand('deleteWordBefore', { rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        toast.add({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  } else {
    handleDeleteContentBackward();
  }
}
function handleDeleteWordForward(): void {
  // If there is no text, nothing should happen
  if (snippetCharacters.value.length === 0) {
    return;
  }

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let leftUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtEnd(referenceSpanElement, editorRef)) {
        console.log('Caret is at end');
        return;
      }

      leftUuid = isCaretAtBeginning(referenceSpanElement, editorRef)
        ? null
        : getCharacterUuidFromSpan(referenceSpanElement);
    }

    try {
      execCommand('deleteWordAfter', { leftUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        toast.add({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  } else {
    handleDeleteContentForward();
  }
}

function handleDeleteContentBackward(): void {
  // If there is no text, nothing should happen
  // TODO: Would be cleaner to do this in the store and use DOM methods herein component...
  if (snippetCharacters.value.length === 0) {
    console.log('Caret is at beginning');
    return;
  }

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    if (isEditorElement(range.startContainer)) {
      return;
    }

    const spanToDelete: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

    if (isCaretAtBeginning(spanToDelete, editorRef)) {
      console.log('Caret is at beginning');
      return;
    }

    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    try {
      execCommand('deleteText', { leftUuid, rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        toast.add({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    try {
      execCommand('deleteText', { leftUuid, rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        toast.add({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  }
}

function handleDeleteContentForward(): void {
  // If there is no text, nothing should happen
  if (snippetCharacters.value.length === 0) {
    return;
  }

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let leftUuid: string | null;
    let rightUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      leftUuid = getCharacterUuidFromSpan(editorRef.value.firstElementChild);
      rightUuid = getCharacterUuidFromSpan(editorRef.value.lastElementChild);
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let spanToDelete: HTMLSpanElement;

      if (range.startOffset === 0) {
        spanToDelete = referenceSpanElement;
      } else {
        if (referenceSpanElement === editorRef.value.lastElementChild) {
          return;
        } else {
          spanToDelete = referenceSpanElement.nextElementSibling as HTMLSpanElement;
        }
      }

      leftUuid = getCharacterUuidFromSpan(spanToDelete.previousElementSibling);
      rightUuid = getCharacterUuidFromSpan(spanToDelete.nextElementSibling);
    }

    try {
      execCommand('deleteText', { leftUuid, rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        toast.add({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  } else {
    const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

    try {
      execCommand('deleteText', { leftUuid, rightUuid });
    } catch (e: unknown) {
      if (e instanceof TextOperationError) {
        toast.add({
          severity: e.severity,
          summary: 'Invalid Text Operation',
          detail: e.message,
          life: 3000,
        });
      }
    }
  }
}

function handleDeleteByCut(): void {
  const { range } = getSelectionData();

  const { leftUuid, rightUuid } = getOuterRangeBoundaries(range);

  try {
    execCommand('deleteText', { leftUuid, rightUuid });
  } catch (e: unknown) {
    if (e instanceof TextOperationError) {
      toast.add({
        severity: e.severity,
        summary: 'Invalid Text Operation',
        detail: e.message,
        life: 3000,
      });
    }
  }

  handleCopy();
}

function handleDeleteByDrag(): void {
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

function handleKeydown(event: KeyboardEvent) {
  if (!event.ctrlKey || event.key.toLowerCase() !== 'z') {
    return;
  }

  if (event.shiftKey) {
    redo();
    return;
  } else {
    undo();
    return;
  }
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
      uuid: crypto.randomUUID(),
      text: char,
    },
    annotations: [],
  };
}
</script>

<template>
  <div class="flex justify-content-end">
    <label class="label">Keep text on pagination</label>
    <ToggleSwitch title="Switch pagination mode" v-model="keepTextOnPagination" />
  </div>
  <div class="counter text-right mb-1">
    <small>{{ charCounterMessage }}</small>
  </div>
  <!-- TODO: Restructure/rename this mess -->
  <div class="content flex flex-column flex-1 px-3 py-1 overflow-hidden">
    <div class="text-container h-full p-2 flex gap-1 overflow-hidden">
      <div class="scroll-container flex-1 overflow-y-scroll">
        <div
          id="text"
          class="min-h-full"
          :class="asyncOperationRunning ? 'async-overlay' : ''"
          ref="editorRef"
          contenteditable="true"
          spellcheck="false"
          @beforeinput="handleInput"
          @copy="handleCopy"
          @keydown="handleKeydown"
        >
          <span
            v-for="character in snippetCharacters"
            :key="character.data.uuid"
            :id="character.data.uuid"
          >
            {{ character.data.text
            }}<template v-for="annotation in character.annotations" :key="annotation.uuid">
              <span
                v-if="selectedOptions.includes(annotation.type)"
                :class="[
                  'anno',
                  annotation.isFirstCharacter ? 'start' : '',
                  annotation.isLastCharacter ? 'end' : '',
                  annotation.type,
                  annotation.subType,
                ]"
                :data-anno-uuid="annotation.uuid"
              >
              </span>
            </template>
          </span>
        </div>
      </div>
      <EditorTextNavigation />
    </div>
  </div>
</template>

<style scoped>
.scroll-container {
  background-color: white;
  border-radius: 3px;
  outline: 1px solid var(--color-focus);

  /* IE, Edge and Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */

  /* Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }

  &:has(:focus-visible) {
    box-shadow: var(--box-shadow-focus);
    outline: 0;
  }
}

#text {
  outline: 0;
  line-height: 1.75rem;
  caret-color: black;
}

#text.async-overlay {
  background-color: white;
  opacity: 0.6;
}

#text > span {
  white-space-collapse: break-spaces;
  position: relative;

  &.highlight {
    background-color: yellow;
  }
}
</style>
