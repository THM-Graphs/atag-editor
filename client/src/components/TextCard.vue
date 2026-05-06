<script setup lang="ts">
import { TextNode, NodeStatusObject } from '../models/types';
import Button from 'primevue/button';
import NodeTag from './NodeTag.vue';
import { computed } from 'vue';
import { filterDefaultLabels } from '../utils/helper/helper';

const props = defineProps<{
  node: NodeStatusObject<TextNode>;
}>();

const filteredLabels: string[] = filterDefaultLabels(props.node.node.nodeLabels);
const PREVIEW_LENGTH: number = 100;

const displayedText = computed<string>(
  () =>
    props.node.node.data.text.slice(0, PREVIEW_LENGTH) +
    (props.node.node.data.text.length > PREVIEW_LENGTH ? '...' : ''),
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

  window.open(`/texts/${props.node.node.data.uuid}`, '_blank', 'noopener noreferrer');
}

function handleRemoveNode() {
  throw new Error('Removing node (not yet implemented)');
}
</script>

<template>
  <div class="node-card-container" @click="handleClickContainer" title="Open text in Editor">
    <div class="button-pane flex justify-content-between">
      <div class="node-labels-pane flex">
        <NodeTag class="mr-1" v-for="label in filteredLabels" :content="label" type="Text" />
      </div>
      <Button
        icon="pi pi-times"
        size="small"
        severity="danger"
        title="Remove text"
        @click="handleRemoveNode"
      ></Button>
    </div>
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
