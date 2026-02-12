<script setup lang="ts">
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize } from '../utils/helper/helper';
import AnnotationButton from './AnnotationButton.vue';
import { Annotation, AnnotationType, Character } from '../models/types';
import { useCharactersStore } from '../store/characters';
import { useCreateAnnotation } from '../composables/useCreateAnnotation';
import { useEditorStore } from '../store/editor';
import { useFilterStore } from '../store/filter';
import ShortcutError from '../utils/errors/shortcut.error';
import AnnotationRangeError from '../utils/errors/annotationRange.error';
import { useAppStore } from '../store/app';
import { useValidateTextSelection } from '../composables/useValidateTextSelection';

const { groupedAnnotationTypes, getAnnotationConfig } = useGuidelinesStore();
const { addToastMessage } = useAppStore();
const { execCommand } = useEditorStore();
const { getCharactersInSelection } = useCharactersStore();
const { selectedOptions } = useFilterStore();
const { createTextAnnotation: createAnnotation } = useCreateAnnotation('Text');
const { isValid: isSelectionValid } = useValidateTextSelection();

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

function handleClick(data: { type: string; subType?: string | number }) {
  try {
    const config: AnnotationType = getAnnotationConfig(data.type);

    isAnnotationTypeEnabled(data.type);
    isSelectionValid(config);

    const selectedCharacters: Character[] = getCharactersInSelection();
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
