<script setup lang="ts">
import { CollectionStatusObject } from '../models/types';
import NodeTag from './NodeTag.vue';

const emit = defineEmits(['itemSelected']);

const props = defineProps<{
  collection: CollectionStatusObject;
  isActive: boolean;
}>();

function handleItemClick(): void {
  // Emit the event with the collection data
  emit('itemSelected', props.collection.data.data.uuid);
}
</script>

<template>
  <div
    class="container p-1"
    :class="{ active: props.isActive, temporary: props.collection.status === 'temporary' }"
    :title="`Click to show details of ${props.collection.data.data.label}`"
    @click="handleItemClick"
  >
    <div class="labels">
      <NodeTag
        :style="{
          fontSize: '0.7rem',
          backgroundColor: 'white',
          fontWeight: 'normal',
          color: 'black',
          padding: '2px 2px',
          lineHeight: '100%',
          border: '1px solid black',
        }"
        class="test mr-1"
        v-for="label in props.collection.data.nodeLabels"
        :content="label"
        type="Collection"
      />
    </div>
    <div class="label font-bold">
      {{ props.collection.data.data.label }}
    </div>
  </div>
</template>

<style scoped>
.container {
  border-bottom: 1px solid grey;
  cursor: pointer;

  &:hover {
    background-color: hsl(0, 0%, 90%);
  }

  .label {
    height: 1.5rem;
    font-size: 0.9rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .active {
    background-color: hsl(0, 0%, 75%);
  }
}
</style>
