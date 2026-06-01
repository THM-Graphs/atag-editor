<script setup lang="ts">
import Button from 'primevue/button';

const isDevelopment: boolean = import.meta.env.DEV;

const emit = defineEmits(['save', 'cancel', 'log']);

function handleSave(): void {
  emit('save');
}

function handleLog() {
  emit('log');
}

function handleCancel(): void {
  emit('cancel');
}
</script>

<template>
  <div class="editor-button-container flex justify-content-center gap-3 p-3">
    <Button aria-label="Save changes" title="Save changes" @click="handleSave">Save</Button>
    <Button
      severity="secondary"
      title="Discard changes"
      aria-label="Cancel changes"
      @click="handleCancel"
      >Cancel</Button
    >
    <Button
      v-if="isDevelopment"
      aria-label="Log doc"
      title="Log doc"
      severity="info"
      @click="handleLog"
      >Log</Button
    >
  </div>
</template>

<style scoped></style>
