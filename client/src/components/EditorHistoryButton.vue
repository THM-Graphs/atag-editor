<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import Button from 'primevue/button';
import { useTiptapStore } from '../store/tiptap';

const { tiptap } = useTiptapStore();

const props = defineProps<{ action: 'undo' | 'redo' }>();

const title: ComputedRef<string> = computed(() =>
  props.action === 'undo' ? 'Undo last action' : 'Redo last undone action',
);

function handleClick(): void {
  if (props.action === 'undo') {
    tiptap.value?.commands.undo();
  } else {
    tiptap.value?.commands.redo();
  }
}
</script>

<template>
  <Button
    icon="pi pi-undo"
    aria-label="Home"
    severity="secondary"
    :class="`w-2rem h-2rem btn-${props.action}`"
    :title="title"
    :disabled="false"
    @click="handleClick"
  ></Button>
</template>

<style scoped>
.btn-undo {
  margin-right: 1px;
}
.btn-redo {
  transform: scale(-1, 1);
  margin-right: 5px;
}
</style>
