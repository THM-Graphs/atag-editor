<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import { useTextSelection } from '@vueuse/core';
import EditorAnnotationForm from './EditorAnnotationForm.vue';
import { useAnnotationStore } from '../store/annotations';
import { useFilterStore } from '../store/filter';
import { getParentCharacterSpan, isEditorElement } from '../helper/helper';
import { Annotation } from '../models/types';

// Last valid selection. Is used when new selection is outside of text component
const cachedAnnotationsInSelection = ref<Annotation[]>([]);

const textSelection = useTextSelection();
const { annotations } = useAnnotationStore();
const { selectedOptions } = useFilterStore();

// TODO: This is a hack: All components need to be mounted initially, because complete rerenders
// will emit too many selectionchange events and trigger the useSelection callback function too often.
// Might cause problems when the text has a lot of annotations -> fix later
const displayedAnnotations: ComputedRef<Annotation[]> = computed(() =>
  annotations.value.filter(a => a.status !== 'deleted'),
);

const annotationsInSelection: ComputedRef<Annotation[]> = computed(() => {
  if (!isValidSelection()) {
    return cachedAnnotationsInSelection.value;
  }

  let firstSpan: HTMLSpanElement;
  let lastSpan: HTMLSpanElement;
  let annotationUuids: Set<string>;

  if (textSelection.selection.value.type === 'Caret') {
    if (
      isEditorElement(textSelection.ranges.value[0].startContainer) ||
      isEditorElement(textSelection.ranges.value[0].endContainer)
    ) {
      firstSpan = document.querySelector('#text span');
      lastSpan = firstSpan;
      annotationUuids = firstSpan ? findAnnotationUuids(firstSpan, firstSpan) : new Set();

      cachedAnnotationsInSelection.value = annotations.value.filter(a =>
        annotationUuids.has(a.data.uuid),
      );
      return cachedAnnotationsInSelection.value;
    } else {
      firstSpan = getParentCharacterSpan(textSelection.ranges.value[0].startContainer);
      lastSpan = getParentCharacterSpan(textSelection.ranges.value[0].endContainer);

      if (firstSpan === lastSpan) {
        if (textSelection.ranges.value[0].startOffset === 0) {
          firstSpan = (firstSpan.previousElementSibling as HTMLSpanElement) ?? firstSpan;
        } else if (textSelection.ranges.value[0].endOffset === 1) {
          lastSpan = (lastSpan.nextElementSibling as HTMLSpanElement) ?? lastSpan;
        }
      }
    }
  } else {
    firstSpan = getParentCharacterSpan(textSelection.ranges.value[0].startContainer);
    lastSpan = getParentCharacterSpan(textSelection.ranges.value[0].endContainer);
  }

  annotationUuids = findAnnotationUuids(firstSpan, lastSpan);

  cachedAnnotationsInSelection.value = annotations.value.filter(a =>
    annotationUuids.has(a.data.uuid),
  );

  return cachedAnnotationsInSelection.value;
});

function isValidSelection(): boolean {
  if (textSelection.ranges.value.length < 1 || textSelection.selection.value.type === 'None') {
    return false;
  }

  const commonAncestorContainer: Node | undefined | Element =
    textSelection.ranges.value[0].commonAncestorContainer;

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
    <h3>Annotations [{{ annotationsInSelection.length }}]</h3>
    <div class="annotation-list flex-grow-1 overflow-y-scroll p-1">
      <EditorAnnotationForm
        v-for="annotation in displayedAnnotations"
        :key="annotation.data.uuid"
        :annotation="annotation"
        v-show="
          annotationsInSelection.includes(annotation) &&
          selectedOptions.includes(annotation.data.type)
        "
      />
    </div>
  </div>
</template>

<style scoped></style>
