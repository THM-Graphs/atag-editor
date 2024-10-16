<script setup lang="ts">
import { useCharactersStore } from '../store/characters';
import { useAnnotationStore } from '../store/annotations';
import { getParentCharacterSpan, getSelectionData } from '../utils/helper/helper';
import iconsMap from '../utils/helper/icons';
import { useGuidelinesStore } from '../store/guidelines';
import { useFilterStore } from '../store/filter';
// import { useHistoryStore } from '../store/history';
import { useEditorStore } from '../store/editor';
import { useToast } from 'primevue/usetoast';
import AnnotationRangeError from '../utils/errors/annotationRange.error';
import { Annotation, AnnotationProperty, Character } from '../models/types';
import IAnnotation from '../models/IAnnotation';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import { ToastServiceMethods } from 'primevue/toastservice';

const { annotationType } = defineProps<{ annotationType: string }>();

const { snippetCharacters, annotateCharacters } = useCharactersStore();
const { addAnnotation } = useAnnotationStore();
const { newRangeAnchorUuid } = useEditorStore();
const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();
const { selectedOptions } = useFilterStore();
// const { pushHistoryEntry } = useHistoryStore();

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

function handleDropdownClick(subtype: string) {
  handleClick(subtype);
}

function handleButtonClick() {
  handleClick();
}

function handleClick(dropdownOption?: string) {
  try {
    isSelectionValid();

    const selectedCharacters: Character[] = getSelectedCharacters();
    const newAnnotation: Annotation = createNewAnnotation(
      annotationType,
      dropdownOption,
      selectedCharacters,
    );

    addAnnotation(newAnnotation);
    annotateCharacters(selectedCharacters, newAnnotation);
    // pushHistoryEntry();
    newRangeAnchorUuid.value = selectedCharacters[selectedCharacters.length - 1].data.uuid;
  } catch (error) {
    if (error instanceof AnnotationRangeError) {
      toast.add({
        severity: 'warn',
        summary: 'Invalid selection',
        detail: error.message,
        life: 3000,
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
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

  if (type === 'Caret') {
    throw new AnnotationRangeError('Select some text to annotate.');
  }

  // TODO: Create zero-point annotations only with caret selection? More intuitive...affects more parts of the functionality
  if (type === 'Range' && getAnnotationConfig(annotationType)?.isZeroPoint) {
    const firstSpan: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
    const lastSpan: HTMLSpanElement = getParentCharacterSpan(range.endContainer);

    if (firstSpan.nextElementSibling !== lastSpan) {
      throw new AnnotationRangeError(
        'For zero-point annotations, select EXACTLY TWO characters to annotate',
      );
    }
  }

  return true;
}

function createNewAnnotation(type: string, subtype: string | undefined, characters: Character[]) {
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

function getSelectedCharacters(): Character[] {
  const { range } = getSelectionData();

  const firstSpan: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
  const lastSpan: HTMLSpanElement = getParentCharacterSpan(range.endContainer);

  const selectedCharacterSpans: HTMLSpanElement[] = findSpansWithinBoundaries(
    firstSpan as HTMLSpanElement,
    lastSpan as HTMLSpanElement,
  );

  const uuids: string[] = selectedCharacterSpans.map((span: HTMLSpanElement) => span.id);

  const characters: Character[] = snippetCharacters.value.filter((c: Character) =>
    uuids.includes(c.data.uuid),
  );

  return characters;
}

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
