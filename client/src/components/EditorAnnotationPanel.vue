<script setup lang="ts">
import { computed, ComputedRef, inject, ref, ShallowRef } from 'vue';
import { useTextSelection } from '@vueuse/core';
import EditorAnnotationForm from './EditorAnnotationForm.vue';
import { useAnnotationStore } from '../store/annotations';
import { useFilterStore } from '../store/filter';
import { useEditorStore } from '../store/editor';
import { areObjectsEqual, isEditorElement } from '../utils/helper/helper';
import { Annotation } from '../models/types';
import Badge from 'primevue/badge';
import { Editor } from '@tiptap/vue-3';

interface SelectionObject {
  startContainer: Node;
  endContainer: Node;
  startOffset: number;
  endOffset: number;
  type: string;
}

const cachedAnnotationsInSelection = ref<Annotation[]>([]);
let lastSelection: SelectionObject | null = null;

const { isRedrawMode } = useEditorStore();
const { ranges, selection } = useTextSelection();
const { snippetAnnotations } = useAnnotationStore();
const { selectedOptions } = useFilterStore();

const editor = inject('editor') as ShallowRef<Editor, Editor>;

const displayedAnnotations: ComputedRef<Annotation[]> = computed(() =>
  snippetAnnotations.value.filter(a => a.status !== 'deleted'),
);

const annotationsInSelection: ComputedRef<Annotation[]> = computed(() => {
  if (isRedrawMode.value) {
    return cachedAnnotationsInSelection.value;
  }

  if (!isValidSelection()) {
    return cachedAnnotationsInSelection.value;
  }

  if (!selectionHasChanged()) {
    return cachedAnnotationsInSelection.value;
  }

  // Get annotation UUIDs from Tiptap editor
  const annotationUuids = findAnnotationUuidsInSelection();
  console.log(annotationUuids);

  cachedAnnotationsInSelection.value = snippetAnnotations.value.filter(a =>
    annotationUuids.has(a.data.properties.uuid),
  );

  return cachedAnnotationsInSelection.value;
});

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

function isValidSelection(): boolean {
  if (ranges.value.length < 1 || selection.value.type === 'None') {
    return false;
  }

  const commonAncestorContainer: Node | undefined | Element =
    ranges.value[0].commonAncestorContainer;

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

/**
 * Find all annotation UUIDs in the current selection using Tiptap's editor state
 */
function findAnnotationUuidsInSelection(): Set<string> {
  const uuids = new Set<string>();

  if (!editor?.value) {
    return uuids;
  }

  const { from, to } = editor.value.state.selection;

  // Traverse the document between selection positions
  editor.value.state.doc.nodesBetween(from, to, (node, pos) => {
    node.marks.forEach(mark => {
      console.log(mark);
      if (mark.type.name === 'annotation' && mark.attrs.uuid) {
        uuids.add(mark.attrs.uuid);
      }
    });
  });

  return uuids;
}

/**
 * Alternative: Find annotation UUIDs from the DOM
 * Use this if you need to work with the rendered HTML instead of editor state
 */
function findAnnotationUuidsFromDOM(): Set<string> {
  const uuids = new Set<string>();

  if (ranges.value.length < 1) {
    return uuids;
  }

  const range = ranges.value[0];
  const container = range.commonAncestorContainer;

  // Get the container element
  let containerElement: Element;
  if (container.nodeType === Node.TEXT_NODE) {
    containerElement = container.parentElement;
  } else {
    containerElement = container as Element;
  }

  // Find all annotation spans within or around the selection
  const annotationSpans = containerElement.querySelectorAll('span[data-annotation-uuid]');

  annotationSpans.forEach((span: HTMLSpanElement) => {
    const uuid = span.getAttribute('data-annotation-uuid');
    if (uuid) {
      uuids.add(uuid);
    }
  });

  // Also check if the container itself is an annotation
  if (containerElement instanceof HTMLElement) {
    const uuid = containerElement.getAttribute('data-annotation-uuid');
    if (uuid) {
      uuids.add(uuid);
    }
  }

  // Walk up the tree to catch parent annotations
  let parent = containerElement.parentElement;
  while (parent && parent.closest('#text')) {
    const uuid = parent.getAttribute('data-annotation-uuid');
    if (uuid) {
      uuids.add(uuid);
    }
    parent = parent.parentElement;
  }

  return uuids;
}
</script>

<template>
  <div class="annotation-details-panel h-full flex flex-column overflow-y-auto">
    <div class="header flex align-items-center gap-2 my-4">
      <h3 class="m-0">Annotations</h3>
      <Badge :value="annotationsInSelection.length" severity="contrast" />
    </div>
    <div class="annotation-list flex-grow-1 overflow-y-auto p-1">
      <template v-for="annotation in displayedAnnotations" :key="annotation.data.properties.uuid">
        <EditorAnnotationForm
          :annotation="annotation"
          v-if="
            annotationsInSelection.includes(annotation) &&
            selectedOptions.includes(annotation.data.properties.type)
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
