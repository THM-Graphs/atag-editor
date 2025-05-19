<script setup lang="ts">
import { computed, ComputedRef, onMounted, onUpdated, ref } from 'vue';
import { useCharactersStore } from '../store/characters';
import { useTextStore } from '../store/text';
import EditorTextNavigation from './EditorTextNavigation.vue';
import {
  getParentCharacterSpan,
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
// import { useHistoryStore } from '../store/history';

const { asyncOperationRunning } = defineProps<{ asyncOperationRunning: boolean }>();

onMounted(() => {
  placeCaret();
});

onUpdated(() => {
  placeCaret();
});

const { keepTextOnPagination, execCommand, placeCaret, setNewRangeAnchorUuid } = useEditorStore();
const { correspondingCollection } = useTextStore();
const {
  afterEndIndex,
  beforeStartIndex,
  snippetCharacters,
  totalCharacters,
  findEndOfWordFromUuid,
  findStartOfWordFromUuid,
  getCharacterIndexFromUuid,
} = useCharactersStore();
const { selectedOptions } = useFilterStore();
// const { pushHistoryEntry, redo, undo } = useHistoryStore();

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

setNewRangeAnchorUuid(snippetCharacters.value[snippetCharacters.value.length - 1]?.data.uuid);

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

  // pushHistoryEntry();
}

function handleInsertText(event: InputEvent): void {
  const newCharacter: Character = createNewCharacter(event.data || '');

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let uuid: string | null;

    if (isEditorElement(range.startContainer)) {
      uuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtBeginning(referenceSpanElement, editorRef)) {
        uuid = null;
      } else {
        if (range.startOffset === 0) {
          uuid = getCharacterUuidFromSpan(referenceSpanElement.previousElementSibling);
        } else {
          uuid = getCharacterUuidFromSpan(referenceSpanElement);
        }
      }
    }

    setNewRangeAnchorUuid(newCharacter.data.uuid);
    execCommand('insertText', { uuid, characters: [newCharacter] });
  } else {
    let startUuid: string | null;
    let endUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      startUuid = null;
      endUuid = null;
    } else {
      const { startSpan, endSpan } = getRangeBoundaries(range);

      if (isCaretAtBeginning(startSpan, editorRef)) {
        startUuid = null;
      } else {
        if (range.startOffset === 0) {
          startUuid = getCharacterUuidFromSpan(startSpan);
        } else {
          startUuid = getCharacterUuidFromSpan(startSpan);
        }
      }

      endUuid = getCharacterUuidFromSpan(endSpan);
    }

    setNewRangeAnchorUuid(newCharacter.data.uuid);
    execCommand('replaceText', { startUuid, endUuid, characters: [newCharacter] });
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

async function handleInsertFromPaste(): Promise<void> {
  const text: string = await navigator.clipboard.readText();

  const newCharacters: Character[] = removeFormatting(text)
    .split('')
    .map((c: string): Character => createNewCharacter(c));

  const { range, type } = getSelectionData();

  if (type === 'Caret') {
    let uuid: string | null;

    if (isEditorElement(range.startContainer)) {
      uuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtBeginning(referenceSpanElement, editorRef)) {
        uuid = null;
      } else {
        if (range.startOffset === 0) {
          uuid = getCharacterUuidFromSpan(referenceSpanElement.previousElementSibling) ?? null;
        } else {
          uuid = getCharacterUuidFromSpan(referenceSpanElement);
        }
      }
    }

    setNewRangeAnchorUuid(newCharacters[newCharacters.length - 1].data.uuid);
    execCommand('insertText', { uuid, characters: newCharacters });
  } else {
    let startUuid: string | null;
    let endUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      startUuid = null;
      endUuid = null;
    } else {
      const { startSpan, endSpan } = getRangeBoundaries(range);

      if (isCaretAtBeginning(startSpan, editorRef)) {
        startUuid = null;
      } else {
        if (range.startOffset === 0) {
          startUuid = getCharacterUuidFromSpan(startSpan);
        } else {
          startUuid = getCharacterUuidFromSpan(startSpan.nextElementSibling);
        }
      }

      endUuid = getCharacterUuidFromSpan(endSpan);
    }

    setNewRangeAnchorUuid(newCharacters[newCharacters.length - 1].data.uuid);
    execCommand('replaceText', { startUuid, endUuid, characters: newCharacters });
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
    let uuid: string | null;

    if (isEditorElement(range.startContainer)) {
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtBeginning(referenceSpanElement, editorRef)) {
        uuid = null;
      } else {
        if (range.startOffset === 0) {
          uuid = getCharacterUuidFromSpan(referenceSpanElement.previousElementSibling) ?? null;
        } else {
          uuid = getCharacterUuidFromSpan(referenceSpanElement);
        }
      }
    }

    setNewRangeAnchorUuid(newCharacters[newCharacters.length - 1].data.uuid);
    execCommand('insertText', { uuid, characters: newCharacters });
  } else {
    let startUuid: string | null;
    let endUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      startUuid = null;
      endUuid = null;
    } else {
      const { startSpan, endSpan } = getRangeBoundaries(range);

      if (isCaretAtBeginning(startSpan, editorRef)) {
        startUuid = null;
      } else {
        if (range.startOffset === 0) {
          startUuid = getCharacterUuidFromSpan(startSpan);
        } else {
          startUuid = getCharacterUuidFromSpan(startSpan.nextElementSibling);
        }
      }

      endUuid = getCharacterUuidFromSpan(endSpan);
    }

    setNewRangeAnchorUuid(newCharacters[newCharacters.length - 1].data.uuid);
    execCommand('replaceText', { startUuid, endUuid, characters: newCharacters });
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

    const charUuid: string = getCharacterUuidFromSpan(spanToDelete);
    // TODO: This is kept for now to get the correct range anchor uuid. Remove after implementing edit history
    const startWordUuid: string | null = findStartOfWordFromUuid(charUuid);
    const startWordIndex = getCharacterIndexFromUuid(startWordUuid);

    setNewRangeAnchorUuid(snippetCharacters.value[startWordIndex - 1]?.data.uuid);

    try {
      // deleteWordBeforeUuid(charUuid);
      execCommand('deleteWordBefore', { uuid: charUuid });
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
    let deletionStartUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      deletionStartUuid = null;
    } else {
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);

      if (isCaretAtEnd(referenceSpanElement, editorRef)) {
        console.log('Caret is at end');
        return;
      }

      deletionStartUuid = isCaretAtBeginning(referenceSpanElement, editorRef)
        ? getCharacterUuidFromSpan(referenceSpanElement)
        : getCharacterUuidFromSpan(referenceSpanElement.nextElementSibling);
    }

    // TODO: This is kept for now to get the correct range anchor uuid. Remove after implementing edit history
    const endWordUuid: string | null = findEndOfWordFromUuid(deletionStartUuid);

    setNewRangeAnchorUuid(endWordUuid);

    try {
      execCommand('deleteWordAfter', { uuid: deletionStartUuid });
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

    const charIndex: number = getCharacterIndex(spanToDelete);
    const charUuid: string = getCharacterUuidFromSpan(spanToDelete);

    setNewRangeAnchorUuid(snippetCharacters.value[charIndex - 1]?.data.uuid);

    try {
      // deleteCharactersWithinUuidRange(charUuid, charUuid);
      execCommand('deleteText', { startUuid: charUuid, endUuid: charUuid });
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
    let startIndex: number;
    let startUuid: string | null;
    let endUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      startIndex = 0;
      startUuid = null;
      endUuid = null;
    } else {
      const { startSpan, endSpan } = getRangeBoundaries(range);
      startIndex = getCharacterIndex(startSpan);
      startUuid = getCharacterUuidFromSpan(startSpan);
      endUuid = getCharacterUuidFromSpan(endSpan);
    }

    setNewRangeAnchorUuid(snippetCharacters.value[startIndex - 1]?.data.uuid);

    try {
      // deleteCharactersWithinUuidRange(startUuid, endUuid);
      execCommand('deleteText', { startUuid, endUuid });
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
    let charUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      charUuid = editorRef.value.firstElementChild?.id ?? null;
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

      charUuid = getCharacterUuidFromSpan(spanToDelete);
    }

    setNewRangeAnchorUuid(charUuid);

    try {
      // deleteCharactersWithinUuidRange(charUuid, charUuid);
      execCommand('deleteText', { startUuid: charUuid, endUuid: charUuid });
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
    let startIndex: number;
    let startUuid: string | null;
    let endUuid: string | null;

    if (isEditorElement(range.startContainer)) {
      startIndex = 0;
      startUuid = null;
      endUuid = null;
    } else {
      const { startSpan, endSpan } = getRangeBoundaries(range);
      startIndex = getCharacterIndex(startSpan);
      startUuid = getCharacterUuidFromSpan(startSpan);
      endUuid = getCharacterUuidFromSpan(endSpan);
    }

    setNewRangeAnchorUuid(snippetCharacters.value[startIndex - 1]?.data.uuid);

    try {
      // deleteCharactersWithinUuidRange(startUuid, endUuid);
      execCommand('deleteText', { startUuid, endUuid });
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

  let startIndex: number;
  let startUuid: string | null;
  let endUuid: string | null;

  if (isEditorElement(range.startContainer)) {
    startIndex = 0;
    startUuid = null;
    endUuid = null;
  } else {
    const { startSpan, endSpan } = getRangeBoundaries(range);
    startIndex = getCharacterIndex(startSpan);
    startUuid = getCharacterUuidFromSpan(startSpan);
    endUuid = getCharacterUuidFromSpan(endSpan);
  }

  setNewRangeAnchorUuid(snippetCharacters.value[startIndex - 1]?.data.uuid);

  try {
    // deleteCharactersWithinUuidRange(startUuid, endUuid);
    execCommand('deleteText', { startUuid, endUuid });
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
    // redo();
    return;
  } else {
    // undo();
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
      text: char,
      letterLabel: correspondingCollection.value.data.label,
      uuid: crypto.randomUUID(),
    },
    annotations: [],
  };
}

/**
 * Extracts the start and end span elements from a given Range and return an object with two properties,
 * `startSpan` and `endSpan`, which contain the start and end span elements, respectively.
 *
 * @param {Range} range A Range object
 * @returns {Object} An object with two properties, `startSpan` and `endSpan`, which contain the start and end span elements, respectively.
 */
function getRangeBoundaries(range: Range): {
  startSpan: HTMLSpanElement;
  endSpan: HTMLSpanElement;
} {
  const startReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
  const endReferenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.endContainer);

  return { startSpan: startReferenceSpanElement, endSpan: endReferenceSpanElement };
}

function getCharacterIndex(span: HTMLSpanElement): number {
  return snippetCharacters.value.findIndex(c => c.data.uuid === span.id);
}

function getCharacterUuidFromSpan(span: HTMLSpanElement | Element | null): string | null {
  return span?.id ?? null;
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
                  annotation.subtype,
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
