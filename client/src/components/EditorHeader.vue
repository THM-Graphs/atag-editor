<script setup lang="ts">
import EditorImportButton from './EditorImportButton.vue';
import { useTextStore } from '../store/text';
import Button from 'primevue/button';

const { text } = useTextStore();
</script>

<template>
  <div class="header">
    <div class="header-buttons flex justify-content-between mb-2">
      <RouterLink to="/">
        <Button
          icon="pi pi-home"
          aria-label="Home"
          class="w-2rem h-2rem"
          title="Go to overview"
        ></Button>
      </RouterLink>
      <div>
        <EditorImportButton />
      </div>
    </div>
    <div class="label flex justify-content-center text-center">
      {{ text.nodeLabel ?? 'no Text label provided yet :/' }}
    </div>
  </div>
</template>

<style scoped></style>
