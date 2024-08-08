<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import Panel from 'primevue/panel';
import { Annotation } from '../models/types';

const { annotations } = useAnnotationStore();
const { snippetCharacters } = useCharactersStore();

const displayedAnnotations: ComputedRef<Annotation[]> = computed(() =>
  annotations.value.filter(a => a.status !== 'deleted'),
);
</script>

<template>
  <Panel header="Annotations" class="annotations-container mb-3 overflow-y-auto" toggleable>
    <div v-for="(annotation, index) in displayedAnnotations" class="annotation-entry flex gap-2">
      <span :style="{ textWrap: 'nowrap' }">({{ index + 1 }}) {{ annotation.data.type }}</span>
      <span class="preview">
        {{
          snippetCharacters
            .filter(c => c.annotations.some(a => a.uuid === annotation.data.uuid))
            .map(c => c.data.text)
            .join('')
        }}</span
      >
    </div>
  </Panel>
</template>

<style scoped>
.annotations-container {
  outline: 1px solid var(--p-primary-color);
}

.preview {
  text-wrap: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-style: italic;
}
</style>
