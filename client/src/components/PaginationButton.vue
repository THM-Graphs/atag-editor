<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { useCharactersStore } from '../store/characters';
import Button from 'primevue/button';
import { useAnnotationStore } from '../store/annotations';
import { useEditorStore } from '../store/editor';
import { Annotation } from '../models/types';
import { useHistoryStore } from '../store/history';
import { capitalize } from '../helper/helper';

const { direction } = defineProps<{ direction: 'previous' | 'next' }>();

const label: ComputedRef<string> = computed(() => capitalize(direction));
const ariaLabel: ComputedRef<string> = computed(() => `Show ${direction} characters`);
const arrowDirection: ComputedRef<string> = computed(() => {
  if (direction === 'previous') {
    return 'pi pi-arrow-up';
  } else {
    return 'pi pi-arrow-down';
  }
});
const noMoreCharacters: ComputedRef<boolean> = computed(() => {
  if (direction === 'previous') {
    return beforeStartIndex.value === null;
  } else {
    return afterEndIndex.value === null;
  }
});
const paginationMode: ComputedRef<'keep' | 'replace'> = computed(() =>
  keepTextOnPagination.value === true ? 'keep' : 'replace',
);

const { annotations } = useAnnotationStore();
const {
  afterEndIndex,
  beforeStartIndex,
  snippetCharacters,
  totalCharacters,
  nextCharacters,
  previousCharacters,
} = useCharactersStore();
const { keepTextOnPagination, newRangeAnchorUuid, hasUnsavedChanges } = useEditorStore();
const { initializeHistory } = useHistoryStore();

function handlePagination(event: MouseEvent) {
  if (hasUnsavedChanges()) {
    console.log('SAVE YOUR CHANGES');
    return;
  }

  if (direction === 'previous') {
    if (beforeStartIndex.value === null) {
      return;
    }

    previousCharacters(paginationMode.value);
  } else {
    if (afterEndIndex.value === null) {
      return;
    }

    nextCharacters(paginationMode.value);
  }

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

  newRangeAnchorUuid.value =
    snippetCharacters.value[snippetCharacters.value.length - 1]?.data.uuid ?? null;

  initializeHistory();
}
</script>

<template>
  <Button
    class="w-full"
    :label="label"
    :aria-label="ariaLabel"
    severity="secondary"
    :disabled="noMoreCharacters"
    :icon="arrowDirection"
    @click="handlePagination"
  ></Button>
</template>

<style scoped></style>
