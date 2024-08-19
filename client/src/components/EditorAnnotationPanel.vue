<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import EditorAnnotationForm from './EditorAnnotationForm.vue';
import { useAnnotationStore } from '../store/annotations';
import { useEditorStore } from '../store/editor';
import { useFilterStore } from '../store/filter';
import { Annotation } from '../models/types';

const { annotations } = useAnnotationStore();
const { selectedAnnotations } = useEditorStore();
const { selectedOptions } = useFilterStore();

// TODO: This is a hack: All components need to be mounted initially, because complete rerenders
// will emit too many selectionchange events and trigger the useSelection callback function too often.
// Might cause problems when the text has a lot of annotations -> fix later
const displayedAnnotations: ComputedRef<Annotation[]> = computed(() =>
  annotations.value.filter(a => a.status !== 'deleted'),
);
</script>

<template>
  <div class="annotation-details-panel h-full flex flex-column overflow-y-auto">
    <h3>Annotations [{{ selectedAnnotations.length }}]</h3>
    <div class="annotation-list flex-grow-1 overflow-y-scroll p-1">
      <EditorAnnotationForm
        v-for="annotation in displayedAnnotations"
        :annotation="annotation"
        v-show="
          selectedAnnotations.includes(annotation) && selectedOptions.includes(annotation.data.type)
        "
      />
    </div>
  </div>
</template>

<style scoped></style>
