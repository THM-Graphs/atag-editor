<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import Button from 'primevue/button';
import { useEditorStore } from '../store/editor';

const props = defineProps<{ action: 'undo' | 'redo' }>();

const { undo, redo, history, redoStack } = useEditorStore();

const title: ComputedRef<string> = computed(() =>
  props.action === 'undo' ? 'Undo last action' : 'Redo last undone action',
);

const canUndo: ComputedRef<boolean> = computed(() => history.value.length > 1);
const canRedo: ComputedRef<boolean> = computed(() => redoStack.value.length > 0);

function handleClick(): void {
  if (props.action === 'undo') {
    undo();
  } else {
    redo();
  }
}
</script>

<template>
  <Button
    icon="pi pi-undo"
    aria-label="Home"
    severity="secondary"
    :class="`w-2rem h-2rem ${props.action === 'undo' ? '' : 'mirrored'}`"
    :title="title"
    :disabled="props.action === 'undo' ? !canUndo : !canRedo"
    @click="handleClick"
  ></Button>
</template>

<style scoped>
.mirrored {
  transform: scale(-1, 1);
}
</style>
