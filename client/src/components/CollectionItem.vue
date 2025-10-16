<script setup lang="ts">
import { Collection } from '../models/types';
import NodeTag from './NodeTag.vue';

const props = defineProps<{
  collection: Collection;
}>();
</script>

<template>
  <div class="container p-1">
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
}
</style>
