<script setup lang="ts">
import { useGuidelinesStore } from '../store/guidelines';
import EditorAnnotationButton from './EditorAnnotationButton.vue';
import { capitalize } from '../utils/helper/helper';
import { Button } from 'primevue';
import { Editor } from '@tiptap/vue-3';
import { inject, ShallowRef } from 'vue';

const { groupedAnnotationTypes } = useGuidelinesStore();

const editor = inject<ShallowRef<Editor>>('editor');

function handleClick() {
  console.log('click');

  const result = editor.value.chain().focus().setMark('highlight').run();
}
</script>

<template>
  <div class="annotation-button-pane flex flex-wrap gap-3">
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
    <Button
      icon="pi pi-star"
      severity="secondary"
      outlined
      raised
      :style="{ height: '35px', width: '35px' }"
      @click="handleClick"
    />
  </div>
</template>

<style scoped>
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
</style>
