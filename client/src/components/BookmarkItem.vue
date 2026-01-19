<script setup lang="ts">
import { useBookmarks } from '../composables/useBookmarks';
import { Bookmark } from '../models/types';
import router from '../router';
import NodeTag from './NodeTag.vue';
import Button from 'primevue/button';

// const emit = defineEmits(['itemSelected']);

const props = defineProps<{
  data: Bookmark;
}>();

const { removeBookmark } = useBookmarks();
const uuid: string = props.data.data.data.uuid;

function handleItemClick(): void {
  // TODO: Or emit?
  router.push(`/collections/${uuid}`);
}
</script>

<template>
  <div
    class="container flex align-items-center p-1"
    :title="`Go to collection ${props.data.data.data?.label}`"
    @click="handleItemClick"
  >
    <div class="data flex-grow-1">
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
          v-for="label in props.data.data.nodeLabels"
          :content="label"
          type="Collection"
        />
      </div>
      <div class="label font-bold">
        {{ props.data.data.data?.label }}
      </div>
    </div>
    <Button
      title="Remove bookmark"
      severity="danger"
      icon="pi pi-trash"
      size="small"
      outlined
      class="w-2rem h-2rem"
      @click.stop="removeBookmark(uuid)"
    />
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
    text-overflow: ellipsis;
  }

  .active {
    background-color: hsl(0, 0%, 75%);
  }
}
</style>
