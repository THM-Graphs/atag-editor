<script setup lang="ts">
import { Editor } from '@tiptap/vue-3';
import Button from 'primevue/button';
import { inject, ShallowRef } from 'vue';

const emit = defineEmits(['save', 'cancel']);

const editor: ShallowRef<Editor, Editor> = inject('editor');

function handleSave(): void {
  emit('save');
}

function handleCancel(): void {
  emit('cancel');
}

async function handleCopy() {
  await navigator.clipboard.writeText(editor.value.getHTML());
}
</script>

<template>
  <div class="editor-button-container flex justify-content-center gap-3 p-3">
    <Button aria-label="Save changes" title="Save changes" disabled @click="handleSave"
      >Save</Button
    >
    <Button
      severity="secondary"
      title="Discard changes"
      aria-label="Cancel changes"
      @click="handleCancel"
      >Cancel</Button
    >
    <Button aria-label="" title="Copy HTML" @click="handleCopy">Copy HTML</Button>
  </div>
</template>

<style scoped></style>
