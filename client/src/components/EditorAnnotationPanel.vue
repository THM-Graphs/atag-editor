<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import EditorAnnotationForm from './EditorAnnotationForm.vue';
import { useAnnotationStore } from '../store/annotations';
import { Annotation } from '../models/types';

const { annotations } = useAnnotationStore();

// TODO: Use this for displaying forms. Currently all visible for debugging purposes
const displayedAnnotations: ComputedRef<Annotation[]> = computed(() =>
  annotations.value.filter(a => a.status !== 'deleted'),
);
</script>

<template>
  <div class="annotation-details-panel h-full flex flex-column overflow-y-auto">
    <h3>Annotations [{{ displayedAnnotations.length }}]</h3>
    <div class="annotation-list flex-grow-1 overflow-y-scroll p-1">
      <EditorAnnotationForm v-for="annotation in annotations" :annotation="annotation" />
    </div>
  </div>
</template>

<style scoped></style>
