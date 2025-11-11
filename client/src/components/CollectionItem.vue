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
    @click="handleItemClick"
  >
    <div class="labels">
      <NodeTag
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
  outline: 1px solid grey;
  cursor: pointer;

  &:hover {
    background-color: hsl(0, 0%, 90%);
  }

  .active {
    background-color: hsl(0, 0%, 75%);
  }
}
</style>
