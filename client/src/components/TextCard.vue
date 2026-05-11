<script setup lang="ts">
import { computed } from 'vue';
import NodeCardHeader from './NodeCardHeader.vue';
import { TextNode, NodeStatusObject, NodeStatus } from '../models/types';

const props = defineProps<{
  mode: 'edit' | 'view';
}>();

const emit = defineEmits<{
  (e: 'remove-node'): void;
}>();

const node = defineModel<NodeStatusObject<TextNode>>();

const PREVIEW_LENGTH: number = 100;

const displayedText = computed<string>(
  () =>
    node.value!.node.data.text.slice(0, PREVIEW_LENGTH) +
    (node.value!.node.data.text.length > PREVIEW_LENGTH ? '...' : ''),
);

/**
 * Handles a click event on the Card component, which will the corresponding text in a new tab. The click event is ignored
 * if the click target is part of button.
 *
 * @param {PointerEvent} event - The click event.
 * @returns {void} This function does not return any value.
 */
function handleClickContainer(event: PointerEvent): void {
  if ((event.target as HTMLElement).closest('button')) {
    return;
  }

  window.open(`/editor/${node.value!.node.data.uuid}`, '_blank', 'noopener noreferrer');
}

function handleRemoveNode(): void {
  if (node.value!.meta.status === 'added') {
    emit('remove-node');
  } else {
    setNodeStatus('removed');
  }
}

function setNodeStatus(status: NodeStatus): void {
  node.value!.meta.status = status;
}
</script>

<template>
  <div class="node-card-container" @click="handleClickContainer" title="Open text in Editor">
    <NodeCardHeader :node="node!" :mode="props.mode" @remove="handleRemoveNode" />
    <div class="text-xs">
      {{ displayedText }}
    </div>
  </div>
</template>

<style scoped>
.node-card-container {
  cursor: pointer;
  border: 1px solid gray;
  border-radius: 5px;
  margin-bottom: 0.5rem;
  padding: 0.5rem;

  & button {
    width: 1rem;
    height: 1rem;
    padding: 10px;
  }
}
</style>
