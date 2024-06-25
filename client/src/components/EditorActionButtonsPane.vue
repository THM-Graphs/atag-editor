<script setup lang="ts">
import Button from 'primevue/button';

const emit = defineEmits(['save', 'cancel']);

function handleSave(): void {
  emit('save');
}

function handleCancel(): void {
  emit('cancel');
}
</script>

<template>
  <div class="editor-button-container flex justify-content-center gap-3 p-3">
    <Button aria-label="Save changes" @click="handleSave">Save</Button>
    <Button severity="secondary" aria-label="Cancel changes" @click="handleCancel">Cancel</Button>
  </div>
</template>

<style scoped></style>
