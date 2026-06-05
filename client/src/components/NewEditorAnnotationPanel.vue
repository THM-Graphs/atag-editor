<script setup lang="ts">
import { computed } from 'vue';
import EditorAnnotationFormNew from './EditorAnnotationFormNew.vue';
import { useFilterStore } from '../store/filter';
import { Annotation } from '../models/types';
import Badge from 'primevue/badge';
import { useTiptapStore } from '../store/tiptap';
import { ANNOTATION_DECORATION_KEY } from '../editors/text/extensions/annotationDecoration.ts';
import { DecorationSet } from '@tiptap/pm/view';

const { tiptap, annotations: allAnnotations } = useTiptapStore();
const { selectedOptions } = useFilterStore();

// TODO: A max number of annotations should be shown to keep UI from freezing
const annotationsInSelection = computed<Annotation[]>(() => {
  if (!tiptap.value || !tiptap.value.state.selection) {
    return [];
  }

  const { from, to } = tiptap.value.state.selection;

  const annosBetweenPositions: Annotation[] = [];

  const decorations: DecorationSet =
    ANNOTATION_DECORATION_KEY.getState(tiptap.value.view.state)?.all ?? DecorationSet.empty;

  decorations.find(from, to).forEach(decoration => {
    const uuid: string = decoration.spec._uuid;
    const annoEntry: Annotation | undefined = allAnnotations.value?.get(uuid);

    if (annoEntry) {
      annosBetweenPositions.push(annoEntry);
    }
  });

  tiptap.value.state.doc.nodesBetween(from, to, node => {
    if (node.type.name === 'zeroPointAnnotation') {
      const uuid: string = node.attrs.uuid;
      const annoEntry: Annotation | undefined = allAnnotations.value?.get(uuid);

      if (annoEntry) {
        annosBetweenPositions.push(annoEntry);
      }
    }
  });

  return annosBetweenPositions;
});
</script>

<template>
  <div class="annotation-details-panel h-full flex flex-column overflow-y-auto">
    <div class="header flex align-items-center gap-2 my-4">
      <h3 class="m-0">Annotations</h3>
      <Badge :value="annotationsInSelection.length" severity="contrast" />
    </div>
    <div class="annotation-list flex-grow-1 overflow-y-auto p-1">
      <template v-for="annotation in annotationsInSelection" :key="annotation.node.data.uuid">
        <EditorAnnotationFormNew
          :annotation="annotation"
          v-if="[...selectedOptions].includes(annotation.node.data.type)"
        />
        <div v-if="annotation.node.data.type === 'paragraph'">Paragraph</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.annotation-list {
  scrollbar-gutter: stable;
}
</style>
