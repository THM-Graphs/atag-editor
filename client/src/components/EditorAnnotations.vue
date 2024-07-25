<script setup lang="ts">
import Panel from 'primevue/panel';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';

const { annotations } = useAnnotationStore();
const { snippetCharacters } = useCharactersStore();
</script>

<template>
  <Panel header="Annotations" class="annotations-container mb-3" toggleable>
    <div v-for="(annotation, index) in annotations" class="annotation-entry flex gap-2">
      <span>({{ index + 1 }}) {{ annotation.teiType }}</span>
      <span>
        {{
          snippetCharacters
            .filter(c => c.annotations.some(a => a.uuid === annotation.uuid))
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
</style>
