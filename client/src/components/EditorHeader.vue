<script setup lang="ts">
import EditorHistoryButton from './EditorHistoryButton.vue';
import EditorImportButton from './EditorImportButton.vue';
import FulltextSearchbar from './FulltextSearchbar.vue';
import Button from 'primevue/button';
import BookmarkButton from './BookmarkButton.vue';
import EditorExportButton from './EditorExportButton.vue';
import EditorSwitchButton from './EditorSwitchButton.vue';
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
      <div class="flex">
        <FulltextSearchbar />
        <EditorHistoryButton action="undo" />
        <EditorHistoryButton action="redo" />
        <EditorImportButton />
        <EditorExportButton />
        <BookmarkButton />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
