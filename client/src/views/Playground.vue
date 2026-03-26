<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3';
import { onMounted, onUnmounted } from 'vue';

import { useEditorStore } from '../store/editor';

const { tiptap, initializeTiptap, destroyTiptap } = useEditorStore();

onMounted(() => initializeTiptap());
onUnmounted(() => destroyTiptap());
</script>
<template>
  <div class="container text-center">
    <h2>Tiptap Editor</h2>

    <editor-content id="editor" :editor="tiptap" />
  </div>
</template>

<style scoped>
#editor {
  width: 80%;
  &:has(:focus-visible) {
    box-shadow: var(--box-shadow-focus);
    outline: 0;
  }
}
</style>
