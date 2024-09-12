<script setup lang="ts">
import EditorOrientationBar from './EditorOrientationBar.vue';
import PaginationButton from './PaginationButton.vue';
</script>

<template>
  <div class="navigation-bar flex flex-column">
    <PaginationButton action="start" />
    <PaginationButton action="previous" />
    <EditorOrientationBar />
    <PaginationButton action="next" />
    <PaginationButton action="end" />
  </div>
</template>

<style scoped></style>
