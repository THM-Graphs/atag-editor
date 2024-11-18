<script setup lang="ts">
import { useCharactersStore } from '../store/characters';
import { useAnnotationStore } from '../store/annotations';
import { getParentCharacterSpan, getSelectionData, isEditorElement } from '../utils/helper/helper';
import iconsMap from '../utils/helper/icons';
import { useGuidelinesStore } from '../store/guidelines';
import { useFilterStore } from '../store/filter';
// import { useHistoryStore } from '../store/history';
import { useEditorStore } from '../store/editor';
import { useShortcutsStore } from '../store/shortcuts';
import { useToast } from 'primevue/usetoast';
import AnnotationRangeError from '../utils/errors/annotationRange.error';
import { Annotation, AnnotationProperty, AnnotationType, Character } from '../models/types';
import IAnnotation from '../models/IAnnotation';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import { ToastServiceMethods } from 'primevue/toastservice';
import ShortcutError from '../utils/errors/shortcut.error';

const { annotationType } = defineProps<{ annotationType: string }>();

const { snippetCharacters, annotateCharacters, removeAnnotationFromCharacters } =
  useCharactersStore();
const { annotations, addAnnotation, deleteAnnotation } = useAnnotationStore();
const { newRangeAnchorUuid } = useEditorStore();
const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();
const { selectedOptions } = useFilterStore();
const { normalizeKeys, registerShortcut } = useShortcutsStore();
// const { pushHistoryEntry } = useHistoryStore();

const config: AnnotationType = getAnnotationConfig(annotationType);
const fields: AnnotationProperty[] = getAnnotationFields(annotationType);
const subtypeField: AnnotationProperty = fields.find(field => field.name === 'subtype');
const options: string[] = subtypeField?.options ?? [];
const dropdownOptions = options.map((option: string) => {
  return {
    label: option,
    command: () => handleDropdownClick(option),
  };
});
const toast: ToastServiceMethods = useToast();

if (config.shortcut?.length > 0) {
  const shortcutCombo: string = normalizeKeys(config.shortcut?.map(key => key.toLowerCase()) ?? []);
  registerShortcut(shortcutCombo, handleClick);
}

function handleDropdownClick(subtype: string): void {
  handleClick(subtype);
}

function handleButtonClick(): void {
  handleClick();
}

function isBetweenAnnotations(leftChar: Character, rightChar: Character): boolean {
  const leftUuid: string = leftChar.annotations.find(a => a.type === annotationType)?.uuid;
  const rightUuid: string = rightChar.annotations.find(a => a.type === annotationType)?.uuid;

  return leftUuid && rightUuid && leftUuid !== rightUuid;
}

function findAnnotationToSplit(leftChar: Character, rightChar: Character): Annotation | null {
  const leftUuid: string = leftChar.annotations.find(a => a.type === annotationType)?.uuid;
  const rightUuid: string = rightChar.annotations.find(a => a.type === annotationType)?.uuid;

  if (leftUuid && rightUuid && leftUuid === rightUuid) {
    return annotations.value.find(a => a.data.uuid === leftUuid);
  }

  return null;
}

function handleClick(dropdownOption?: string): void {
  try {
    isAnnotationTypeEnabled();
    isSelectionValid();

    // For paragraph annotations
    if (config.isSeparator) {
      const { range } = getSelectionData();
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let leftSpan: HTMLSpanElement;
      let rightSpan: HTMLSpanElement;
      let previousCharacters: Character[] = [];
      let nextCharacters: Character[] = [];

      if (range.startOffset === 0) {
        leftSpan = referenceSpanElement.previousElementSibling as HTMLSpanElement;
        rightSpan = referenceSpanElement;
      } else {
        leftSpan = referenceSpanElement;
        rightSpan = referenceSpanElement.nextElementSibling as HTMLSpanElement;
      }

      const leftCharIndex = snippetCharacters.value.findIndex(c => c.data.uuid === leftSpan.id);
      const rightCharIndex = snippetCharacters.value.findIndex(c => c.data.uuid === rightSpan.id);
      const leftChar = snippetCharacters.value[leftCharIndex];
      const rightChar = snippetCharacters.value[rightCharIndex];

      if (isBetweenAnnotations(leftChar, rightChar)) {
        throw new AnnotationRangeError(
          `An empty ${annotationType} annotation cannot be created between two existing annotations`,
        );
      }

      // Indicates whether to split the annotation the caret is currently inside of
      const annotationToSplit: Annotation | null = findAnnotationToSplit(leftChar, rightChar);

      // Throw error if annotation is truncated (whole annotated text must be loaded)
      if (annotationToSplit?.isTruncated) {
        throw new AnnotationRangeError(
          'The annotation is truncated. Please load the full annotation first.',
        );
      }

      // Remove annotation that is being split
      if (annotationToSplit) {
        removeAnnotationFromCharacters(annotationToSplit.data.uuid);
        deleteAnnotation(annotationToSplit.data.uuid);
      }

      let current: Character = leftChar;
      let index: number = leftCharIndex;
      let newAnnotation: Annotation = null;

      // Annotate previous characters

      while (current && !current.annotations.some(a => a.type === annotationType) && index >= 0) {
        previousCharacters.unshift(current);
        index--;
        current = snippetCharacters.value[index];
      }

      newAnnotation = createNewAnnotation(annotationType, dropdownOption, previousCharacters);

      addAnnotation(newAnnotation);
      annotateCharacters(previousCharacters, newAnnotation);

      // Annotate next characters

      current = rightChar;
      index = rightCharIndex;

      while (
        current &&
        !current.annotations.some(a => a.type === annotationType) &&
        index <= snippetCharacters.value.length - 1
      ) {
        nextCharacters.push(current);
        index++;
        current = snippetCharacters.value[index];
      }

      newAnnotation = createNewAnnotation(annotationType, dropdownOption, nextCharacters);

      addAnnotation(newAnnotation);
      annotateCharacters(nextCharacters, newAnnotation);

      newRangeAnchorUuid.value = previousCharacters[previousCharacters.length - 1].data.uuid;
    } else {
      const selectedCharacters: Character[] = getCharactersToAnnotate();
      const newAnnotation: Annotation = createNewAnnotation(
        annotationType,
        dropdownOption,
        selectedCharacters,
      );

      addAnnotation(newAnnotation);
      annotateCharacters(selectedCharacters, newAnnotation);
      // pushHistoryEntry();
      newRangeAnchorUuid.value = selectedCharacters[selectedCharacters.length - 1].data.uuid;
    }
  } catch (error) {
    if (error instanceof AnnotationRangeError) {
      toast.add({
        severity: 'warn',
        summary: 'Invalid selection',
        detail: error.message,
        life: 3000,
      });
    } else if (error instanceof ShortcutError) {
      toast.add({
        severity: 'warn',
        summary: 'Annotation type not enabled',
        detail: error.message,
        life: 3000,
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Checks if the annotation type is enabled by verifying if it is included in the selected options. If not, an `ShortcutError` is thrown.
 *
 * @throws {ShortcutError} If the annotation type is not enabled in the current filter settings.
 * @returns {boolean} True if the annotation type is enabled.
 */
function isAnnotationTypeEnabled(): boolean {
  if (!selectedOptions.value.includes(annotationType)) {
    throw new ShortcutError(
      `Annotations of type "${config.type}" are not enabled currently. Use the Filter component to enable the type.`,
    );
  }

  return true;
}

function isSelectionValid(): boolean {
  const { range, type } = getSelectionData();

  if (!range || type === 'None') {
    throw new AnnotationRangeError('No valid text selected.');
  }

  const commonAncestorContainer: Node | undefined | Element = range.commonAncestorContainer;

  if (commonAncestorContainer instanceof Element && !commonAncestorContainer.closest('#text')) {
    throw new AnnotationRangeError('Selection is outside the text component.');
  }

  if (
    commonAncestorContainer.nodeType === Node.TEXT_NODE &&
    !commonAncestorContainer.parentElement.closest('#text')
  ) {
    throw new AnnotationRangeError('Text selection is outside the text component.');
  }

  if (type === 'Caret' && !config.isZeroPoint && !config.isSeparator) {
    throw new AnnotationRangeError('Select some text to annotate.');
  }

  if ((type === 'Caret' && config.isZeroPoint) || config.isSeparator) {
    if (isEditorElement(range.startContainer)) {
      throw new AnnotationRangeError(
        'For creating zero-point annotations, place the caret between two characters',
      );
    } else {
      const parentSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      const caretIsAtBeginning: boolean =
        range.startOffset === 0 && !parentSpanElement.previousElementSibling;
      const caretIsAtEnd: boolean =
        range.startOffset === 1 && !parentSpanElement.nextElementSibling;

      if (caretIsAtBeginning || caretIsAtEnd) {
        if (config.isZeroPoint) {
          throw new AnnotationRangeError(
            'To create zero-point annotations, place the caret between two characters',
          );
        }
        if (config.isSeparator) {
          throw new AnnotationRangeError(
            `To create ${annotationType} annotations, the caret can not be at the start or end`,
          );
        }
      }
    }
  }

  if (type === 'Range' && config.isZeroPoint) {
    throw new AnnotationRangeError(
      'To create zero-point annotations, place the caret between two characters',
    );
  }

  if (type === 'Range' && config.isSeparator) {
    throw new AnnotationRangeError(
      `To create ${annotationType} annotations, place the caret between two characters`,
    );
  }

  return true;
}

function createNewAnnotation(
  type: string,
  subtype: string | undefined,
  characters: Character[],
): Annotation {
  const fields: AnnotationProperty[] = getAnnotationFields(type);
  const data: IAnnotation = {} as IAnnotation;

  // TODO: Improve this function, too many empty strings and duplicate field settings
  // Base properties
  fields.forEach((field: AnnotationProperty) => {
    switch (field.type) {
      case 'text':
        data[field.name] = '';
        break;
      case 'textarea':
        data[field.name] = '';
        break;
      case 'selection':
        data[field.name] = field.options[0] ?? '';
        break;
      case 'checkbox':
        data[field.name] = false;
        break;
      default:
        data[field.name] = '';
    }
  });

  // Other fields (can only be set during save (indizes), must be set explicitly (uuid, text) etc.)
  data.type = type;
  data.startIndex = 0;
  data.endIndex = 0;
  data.text = characters.map((char: Character) => char.data.text).join('');
  data.uuid = crypto.randomUUID();

  // Set subtype only when a subtype property is defined in guidelines
  // If it is, set it to the given parameter subtype or use the default value if no parameter is passed
  if (subtypeField) {
    data.subtype = subtype ?? data.subtype;
  }

  const newAnnotation: Annotation = {
    characterUuids: characters.map((char: Character) => char.data.uuid),
    data: data,
    initialData: data,
    isTruncated: false,
    startUuid: characters[0].data.uuid,
    endUuid: characters[characters.length - 1].data.uuid,
    status: 'created',
  };

  return newAnnotation;
}

/**
 * Get the HTML span elements that the user wants to annotate. If selection is of type 'Range', all spans between
 * the range's start and end container are returned. If selection is of type 'Caret', the span elements to the left and right
 * of the caret are returned (this is the case for zero-point annotations). The `isSelectionValid` function takes care of the existence
 * of previous and next elements.
 *
 * @returns {HTMLSpanElement[]} An array of HTML span elements to annotate.
 */
function getSpansToAnnotate(): HTMLSpanElement[] {
  const { range, type } = getSelectionData();
  let spans: HTMLSpanElement[] = [];

  if (type === 'Range') {
    const firstSpan: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
    const lastSpan: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
    spans = findSpansWithinBoundaries(firstSpan, lastSpan);
  }

  if (type === 'Caret') {
    const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
    let leftSpan: HTMLSpanElement;
    let rightSpan: HTMLSpanElement;

    if (range.startOffset === 0) {
      leftSpan = referenceSpanElement.previousElementSibling as HTMLSpanElement;
      rightSpan = referenceSpanElement;
    } else {
      leftSpan = referenceSpanElement;
      rightSpan = referenceSpanElement.nextElementSibling as HTMLSpanElement;
    }

    spans = [leftSpan, rightSpan];
  }

  return spans;
}

/**
 * Return the characters that the user wants to annotate. This is the selection as an array of Character objects.
 *
 * @returns {Character[]} The characters that the user wants to annotate.
 */
function getCharactersToAnnotate(): Character[] {
  const spans: HTMLSpanElement[] = getSpansToAnnotate();
  const uuids: string[] = spans.map((span: HTMLSpanElement) => span.id);
  const characters: Character[] = snippetCharacters.value.filter((c: Character) =>
    uuids.includes(c.data.uuid),
  );

  return characters;
}

/**
 * Finds all HTML span elements between two given span elements. Used for iterating over the DOM when the selection is of type 'Range'.
 *
 * @param {HTMLSpanElement} firstChar The first span element to include in the result.
 * @param {HTMLSpanElement} lastChar The last span element to include in the result.
 *
 * @returns {HTMLSpanElement[]} An array of all span elements between (and including) the given `firstChar` and `lastChar`.
 */
function findSpansWithinBoundaries(
  firstChar: HTMLSpanElement,
  lastChar: HTMLSpanElement,
): HTMLSpanElement[] {
  const spans: HTMLSpanElement[] = [];
  let current: HTMLSpanElement = firstChar;

  while (current && current !== lastChar) {
    spans.push(current);
    current = current.nextElementSibling as HTMLSpanElement;
  }

  spans.push(lastChar);

  return spans;
}
</script>

<template>
  <Button
    v-if="!subtypeField"
    class="button-annotation"
    severity="secondary"
    outlined
    raised
    :disabled="!selectedOptions.includes(annotationType)"
    :data-annotation-type="annotationType"
    v-tooltip.hover.top="{ value: annotationType, showDelay: 50 }"
    @click="handleButtonClick"
  >
    <template #icon>
      <!-- TODO: Should this come from annotation type config? -->
      <img
        :src="`${iconsMap[annotationType]}`"
        :title="annotationType"
        :alt="annotationType"
        class="button-icon w-full h-full"
      />
    </template>
  </Button>
  <SplitButton
    v-else
    severity="secondary"
    outlined
    raised
    :style="{ width: '3.5rem' }"
    :model="dropdownOptions"
    :disabled="!selectedOptions.includes(annotationType)"
    v-tooltip.hover.top="{ value: annotationType, showDelay: 50 }"
    @click="handleButtonClick"
  >
    <span class="flex dropdownOption-center font-bold">
      <img
        :src="`${iconsMap[annotationType]}`"
        :title="annotationType"
        :alt="annotationType"
        :style="{ height: '1rem', marginRight: '0.5rem' }"
      />
    </span>
  </SplitButton>
</template>

<style scoped>
.button-annotation {
  width: 35px;
  height: 35px;
}

.button-icon {
  object-fit: contain;
}
</style>
