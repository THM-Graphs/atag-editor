<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import { useTextSelection } from '@vueuse/core';
import EditorAnnotationForm from './EditorAnnotationForm.vue';
import { useAnnotationStore } from '../store/annotations';
import { useFilterStore } from '../store/filter';
import { areObjectsEqual, getParentCharacterSpan, isEditorElement } from '../helper/helper';
import { Annotation } from '../models/types';
import Badge from 'primevue/badge';

interface SelectionObject {
  startContainer: Node;
  endContainer: Node;
  startOffset: number;
  endOffset: number;
  type: string;
}

// Last annotations in selection. Is used when new selection is not valid (e.g. outside of text)
const cachedAnnotationsInSelection = ref<Annotation[]>([]);

// Snapshot of last valid selection. Used to prevent multiple computings and rerenders
// (see `selectionHasChanged()` documentation)
let lastSelection: SelectionObject | null = null;

const { ranges, selection } = useTextSelection();
const { annotations } = useAnnotationStore();
const { selectedOptions } = useFilterStore();

const displayedAnnotations: ComputedRef<Annotation[]> = computed(() =>
  annotations.value.filter(a => a.status !== 'deleted'),
);

// TODO: Fix bug, on cancel the counter still shows cached number
const annotationsInSelection: ComputedRef<Annotation[]> = computed(() => {
  if (!isValidSelection()) {
    return cachedAnnotationsInSelection.value;
  }

  if (!selectionHasChanged()) {
    return cachedAnnotationsInSelection.value;
  }

  let firstSpan: HTMLSpanElement;
  let lastSpan: HTMLSpanElement;
  let annotationUuids: Set<string>;

  if (selection.value.type === 'Caret') {
    if (
      isEditorElement(ranges.value[0].startContainer) ||
      isEditorElement(ranges.value[0].endContainer)
    ) {
      firstSpan = document.querySelector('#text > span');
      lastSpan = firstSpan;
    } else {
      firstSpan = getParentCharacterSpan(ranges.value[0].startContainer);
      lastSpan = getParentCharacterSpan(ranges.value[0].endContainer);

      if (firstSpan === lastSpan) {
        if (ranges.value[0].startOffset === 0) {
          firstSpan = (firstSpan.previousElementSibling as HTMLSpanElement) ?? firstSpan;
        } else if (ranges.value[0].endOffset === 1) {
          lastSpan = (lastSpan.nextElementSibling as HTMLSpanElement) ?? lastSpan;
        }
      }
    }
  } else {
    if (
      isEditorElement(ranges.value[0].startContainer) ||
      isEditorElement(ranges.value[0].endContainer)
    ) {
      firstSpan = document.querySelector('#text > span');
      lastSpan = document.querySelector('#text > span:last-of-type');
    } else {
      firstSpan = getParentCharacterSpan(ranges.value[0].startContainer);
      lastSpan = getParentCharacterSpan(ranges.value[0].endContainer);
    }
  }

  if (!firstSpan && !lastSpan) {
    // Text element is empty
    cachedAnnotationsInSelection.value = [];
  } else {
    annotationUuids = findAnnotationUuids(firstSpan, lastSpan);

    cachedAnnotationsInSelection.value = annotations.value.filter(a =>
      annotationUuids.has(a.data.uuid),
    );
  }

  return cachedAnnotationsInSelection.value;
});

/**
 * Checks if the current text selection has changed compared to the last selection.
 *
 * Used to prevent multiple computings and rerenders of AnnotationForm components since the creation
 * of the input fields triggers new `selectionchange` events.
 *
 * @return {boolean} True if the selection has changed, false otherwise
 */
function selectionHasChanged(): boolean {
  const newSelection: SelectionObject = {
    startContainer: ranges.value[0].startContainer,
    endContainer: ranges.value[0].endContainer,
    startOffset: ranges.value[0].startOffset,
    endOffset: ranges.value[0].endOffset,
    type: selection.value.type,
  };

  if (lastSelection && areObjectsEqual(lastSelection, newSelection)) {
    return false;
  }

  lastSelection = newSelection;

  return true;
}

/**
 * Checks if the current selection is valid (= inside the text component).
 *
 * @return {boolean} True if the selection is valid, false otherwise
 */
function isValidSelection(): boolean {
  if (ranges.value.length < 1 || selection.value.type === 'None') {
    return false;
  }

  const commonAncestorContainer: Node | undefined | Element =
    ranges.value[0].commonAncestorContainer;

  // Selection is outside of text component (with element node as container)
  if (commonAncestorContainer instanceof Element && !commonAncestorContainer.closest('#text')) {
    return false;
  }

  if (
    commonAncestorContainer.nodeType === Node.TEXT_NODE &&
    !commonAncestorContainer.parentElement.closest('#text')
  ) {
    return false;
  }

  return true;
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
</script>

<template>
  <div class="annotation-details-panel h-full flex flex-column overflow-y-auto">
    <div class="header flex align-items-center gap-2 my-4">
      <h3 class="m-0">Annotations</h3>
      <Badge :value="annotationsInSelection.length" severity="contrast" />
    </div>
    <div class="annotation-list flex-grow-1 overflow-y-auto p-1">
      <template v-for="annotation in displayedAnnotations" :key="annotation.data.uuid">
        <EditorAnnotationForm
          :annotation="annotation"
          v-if="
            annotationsInSelection.includes(annotation) &&
            selectedOptions.includes(annotation.data.type)
          "
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.annotation-list {
  scrollbar-gutter: stable;
}
</style>
