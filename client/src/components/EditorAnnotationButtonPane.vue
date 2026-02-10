<script setup lang="ts">
import { useGuidelinesStore } from '../store/guidelines';
import {
  capitalize,
  getParentCharacterSpan,
  getSelectionData,
  getSpansToAnnotate,
  isEditorElement,
} from '../utils/helper/helper';
import AnnotationButton from './AnnotationButton.vue';
import { Annotation, AnnotationType, Character } from '../models/types';
import { useCharactersStore } from '../store/characters';
import { useCreateAnnotation } from '../composables/useCreateAnnotation';
import { useEditorStore } from '../store/editor';
import { useFilterStore } from '../store/filter';
import ShortcutError from '../utils/errors/shortcut.error';
import AnnotationRangeError from '../utils/errors/annotationRange.error';
import { useAppStore } from '../store/app';

const { groupedAnnotationTypes, getAnnotationConfig } = useGuidelinesStore();
const { addToastMessage } = useAppStore();
const { execCommand } = useEditorStore();
const { snippetCharacters } = useCharactersStore();
const { selectedOptions } = useFilterStore();
const { createTextAnnotation: createAnnotation } = useCreateAnnotation('Text');

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
 * Checks if the annotation type is enabled by verifying if it is included in the selected options. If not, an `ShortcutError` is thrown.
 *
 * @throws {ShortcutError} If the annotation type is not enabled in the current filter settings.
 * @returns {boolean} True if the annotation type is enabled.
 */
function isAnnotationTypeEnabled(type: string): boolean {
  if (!selectedOptions.value.includes(type)) {
    throw new ShortcutError(
      `Annotations of type "${type}" are not enabled currently. Use the Filter component to enable the type.`,
    );
  }

  return true;
}

function isSelectionValid(annotationType: string): boolean {
  const { range, type } = getSelectionData();

  const config: AnnotationType = getAnnotationConfig(annotationType);

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

function handleClick(data: { type: string; subType?: string | number }) {
  try {
    isAnnotationTypeEnabled(data.type);
    isSelectionValid(data.type);

    const selectedCharacters: Character[] = getCharactersToAnnotate();
    const newAnnotation: Annotation = createAnnotation({ ...data, characters: selectedCharacters });

    execCommand('createAnnotation', {
      annotation: newAnnotation,
      characters: selectedCharacters,
    });
  } catch (error: unknown) {
    if (error instanceof AnnotationRangeError) {
      addToastMessage({
        severity: 'warn',
        summary: 'Invalid selection',
        detail: error.message,
        life: 3000,
      });
    } else if (error instanceof ShortcutError) {
      addToastMessage({
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
</script>

<template>
  <div class="annotation-button-pane flex flex-wrap gap-3">
    <div
      class="group"
      v-for="(annotationTypes, category) in groupedAnnotationTypes"
      :key="category"
    >
      <div class="name font-semibold pb-2">{{ capitalize(category) }}</div>
      <div class="buttons">
        <AnnotationButton
          v-for="type in annotationTypes"
          :type="type.type"
          :key="type.type"
          :disabled="!selectedOptions.includes(type.type)"
          :config="getAnnotationConfig(type.type)"
          @clicked="handleClick($event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
</style>
