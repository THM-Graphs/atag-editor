<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { useCharactersStore } from '../store/characters';
import Button from 'primevue/button';
import { useAnnotationStore } from '../store/annotations';
import { useEditorStore } from '../store/editor';
import { Annotation } from '../models/types';
// import { useHistoryStore } from '../store/history';

const { action } = defineProps<{ action: 'previous' | 'next' | 'start' | 'end' }>();

const ariaLabel: ComputedRef<string> = computed(() => {
  switch (action) {
    case 'previous':
      return 'Show previous characters';
    case 'next':
      return 'Show next characters';
    case 'start':
      return 'Go to beginning of text';
    case 'end':
      return 'Go to end of text';
  }
});
const iconClass: ComputedRef<string> = computed(() => {
  switch (action) {
    case 'previous':
      return 'pi pi-angle-up';
    case 'next':
      return 'pi pi-angle-down';
    case 'start':
      return 'pi pi-angle-double-up';
    case 'end':
      return 'pi pi-angle-double-down';
  }
});
const noMoreCharacters: ComputedRef<boolean> = computed(() => {
  switch (action) {
    case 'previous':
      return beforeStartIndex.value === null;
    case 'next':
      return afterEndIndex.value === null;
    case 'start':
      return beforeStartIndex.value === null;
    case 'end':
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
  firstCharacters,
  lastCharacters,
  nextCharacters,
  previousCharacters,
} = useCharactersStore();
const { keepTextOnPagination, setNewRangeAnchorUuid, hasUnsavedChanges } = useEditorStore();
// const { initializeHistory } = useHistoryStore();

function handlePagination() {
  if (hasUnsavedChanges()) {
    window.alert('Save your changes before paginating further');
    return;
  }

  // TODO: Should the pagination mode impact the go to start/end behaviour?
  switch (action) {
    case 'previous':
      previousCharacters(paginationMode.value);
      break;
    case 'next':
      nextCharacters(paginationMode.value);
      break;
    case 'start':
      firstCharacters();
      break;
    case 'end':
      lastCharacters();
      break;
  }

  // TODO: Move this to store or helper, similar methods in EditorAnnotations.vue
  let charUuids: Set<string> = new Set();

  snippetCharacters.value.forEach(c => {
    c.annotations.forEach(a => charUuids.add(a.uuid));
  });

  annotations.value.forEach((annotation: Annotation) => {
    if (!charUuids.has(annotation.data.properties.uuid)) {
      annotation.isTruncated = false;
    } else {
      const isLeftTruncated: boolean =
        beforeStartIndex.value &&
        totalCharacters.value[beforeStartIndex.value].annotations.some(
          a => a.uuid === annotation.data.properties.uuid,
        );

      const isRightTruncated: boolean =
        afterEndIndex.value &&
        totalCharacters.value[afterEndIndex.value].annotations.some(
          a => a.uuid === annotation.data.properties.uuid,
        );

      if (isLeftTruncated || isRightTruncated) {
        annotation.isTruncated = true;
      } else {
        annotation.isTruncated = false;
      }
    }
  });

  setNewRangeAnchorUuid(snippetCharacters.value[snippetCharacters.value.length - 1]?.data.uuid);

  // initializeHistory();
}
</script>

<template>
  <Button
    size="small"
    :aria-label="ariaLabel"
    :title="ariaLabel"
    severity="secondary"
    :disabled="noMoreCharacters"
    :icon="iconClass"
    @click="handlePagination"
  ></Button>
</template>

<style scoped></style>
