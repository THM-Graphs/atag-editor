<script setup lang="ts">
import { Collection } from '../models/types';
import NodeTag from './NodeTag.vue';

const emit = defineEmits(['itemSelected']);

const props = defineProps<{
  collection: Collection;
  isActive: boolean;
}>();

function handleItemClick(): void {
  // Emit the event with the collection data
  emit('itemSelected', props.collection.data.uuid);
}
</script>

<template>
  <div class="container p-1" :class="props.isActive ? 'active' : ''" @click="handleItemClick">
    <div class="labels">
      <NodeTag v-for="label in props.collection.nodeLabels" :content="label" type="Collection" />
    </div>
    <div class="label font-bold">
      {{ props.collection.data.label }}
    </div>
  </div>
</template>

<style scoped>
.container {
  outline: 1px solid grey;
  cursor: pointer;

  &:hover {
    background-color: rgb(213, 213, 213);
  }

  .active {
    background-color: green;
  }
}
</style>
