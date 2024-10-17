<script setup lang="ts">
import { useGuidelinesStore } from '../store/guidelines';
import EditorAnnotationButton from './EditorAnnotationButton.vue';
import { capitalize } from '../utils/helper/helper';

const { groupedAnnotationTypes } = useGuidelinesStore();
</script>

<template>
  <div class="annotation-button-pane flex flex-wrap gap-3 py-3">
    <div
      class="group"
      v-for="(annotationTypes, category) in groupedAnnotationTypes"
      :key="category"
    >
      <div class="name font-semibold pb-2">{{ capitalize(category) }}</div>
      <div class="buttons">
        <EditorAnnotationButton
          v-for="type in annotationTypes"
          :annotationType="type.type"
          :key="type.type"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
</style>
