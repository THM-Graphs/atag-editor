<script setup lang="ts">
import { computed } from 'vue';
import { useBookmarks } from '../composables/useBookmarks';
import { Bookmark, Collection } from '../models/types';
import router from '../router';
import NodeTag from './NodeTag.vue';
import Button from 'primevue/button';

// const emit = defineEmits(['itemSelected']);

const props = defineProps<{
  data: Bookmark;
}>();

const { removeBookmark } = useBookmarks();

const uuid: string = props.data.data.data.uuid;
const isCollection: boolean = props.data.type === 'collection';

function handleItemClick(): void {
  router.push(`/${props.data.type}s/${uuid}`);
}

const htmlTitle = computed<string>(
  () =>
    `Go go ${props.data.type} ${isCollection ? (props.data.data as Collection).data.label : 'with UUID ' + props.data.data.data.uuid}`,
);

// TODO: This should be in a helper function
const PREVIEW_LENGTH: number = 100;

const displayedText = computed<string>(
  () =>
    props.data.data.data?.text.slice(0, PREVIEW_LENGTH) +
    (props.data.data.data?.text.length > PREVIEW_LENGTH ? '...' : ''),
);
</script>

<template>
  <div class="container flex align-items-center p-1" :title="htmlTitle" @click="handleItemClick">
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
      <template v-if="isCollection">
        <div class="label font-bold">
          {{ (props.data.data as Collection).data.label }}
        </div>
      </template>
      <template v-else>
        <div class="text text-sm">
          {{ displayedText }}
        </div>
      </template>
    </div>
    <Button
      title="Remove bookmark"
      severity="primary"
      icon="pi pi-bookmark-fill"
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
