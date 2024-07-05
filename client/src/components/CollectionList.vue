<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue';
import ICollection from '../models/ICollection';

defineProps<{
  collections: ICollection[] | null;
}>();
</script>

<template>
  <div class="list-container overflow-y-auto mb-3 flex-grow-1">
    <LoadingSpinner v-if="!collections" />
    <ul v-else>
      <li class="list-item text-xl m-3" v-for="collection in collections" :key="collection.uuid">
        <div class="title">
          <RouterLink
            :to="`/texts/${collection.uuid}`"
            v-tooltip.hover.top="{ value: collection.label, showDelay: 10 }"
            class="block w-full p-3 white-space-nowrap overflow-hidden text-overflow-ellipsis"
            >{{ collection.label }}
          </RouterLink>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list-item {
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px -1px rgba(0, 0, 0, 0.1);
  border-radius: 6px;

  &:hover {
    box-shadow:
      0 1px 3px 0 rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.1);
    background-color: #f5f5f5;
  }
}
</style>
