<script setup lang="ts">
import Button from 'primevue/button';
import NodeTag from './NodeTag.vue';
import { filterDefaultLabels } from '../utils/helper/helper';
import { BaseNodeLabel, NodeStatusObject } from '../models/types';

const props = defineProps<{
  node: NodeStatusObject;
}>();

const emit = defineEmits<{
  (e: 'remove'): void;
}>();

const filteredLabels: string[] = filterDefaultLabels(props.node.node.nodeLabels);
const baseNodeLabel: BaseNodeLabel = getBaseNodeLabel(props.node.node.nodeLabels);

function getBaseNodeLabel(labels: string[]): BaseNodeLabel {
  if (labels.includes('Entity')) {
    return 'Entity';
  } else if (labels.includes('Collection')) {
    return 'Collection';
  } else if (labels.includes('Text')) {
    return 'Text';
  } else if (labels.includes('Annotation')) {
    return 'Annotation';
  } else {
    throw new Error('Node does not have a valid base label');
  }
}

function handleRemoveClick(): void {
  emit('remove');
}
</script>

<template>
  <div class="button-pane flex justify-content-between">
    <div class="node-labels-pane flex">
      <NodeTag
        class="test mr-1"
        v-for="label in filteredLabels"
        :content="label"
        :type="baseNodeLabel"
      />
    </div>
    <small class="status">{{ node!.meta.status }}</small>

    <Button
      icon="pi pi-times"
      size="small"
      severity="danger"
      title="Remove node"
      @click="handleRemoveClick"
    ></Button>
  </div>
</template>

<style scoped>
.node-card-container {
  cursor: auto;
  border: 1px solid gray;
  border-radius: 5px;
  margin-bottom: 0.5rem;
  padding: 0.5rem;

  button {
    width: 1rem;
    height: 1rem;
    padding: 10px;
  }
}
</style>
