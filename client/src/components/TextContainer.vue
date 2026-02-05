<script setup lang="ts">
import { Text } from '../models/types';
import Card from 'primevue/card';
import NodeTag from './NodeTag.vue';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import Textarea from 'primevue/textarea';
import { useGuidelinesStore } from '../store/guidelines';
import { computed } from 'vue';
import { useBookmarks } from '../composables/useBookmarks';

const props = defineProps<{
  status: 'existing' | 'temporary';
  text: Text;
  mode: 'view' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'textAdded', text: Text): void;
  (e: 'textRemoved', text: Text): void;
}>();

const { getAvailableTextLabels } = useGuidelinesStore();
const { bookmarks, toggleBookmark } = useBookmarks();

const isBookmarked = computed<boolean>(() => {
  return bookmarks.value.some(b => b.data.data.uuid === props.text.data.uuid);
});

function handleBookmarkAction() {
  toggleBookmark({ data: props.text, type: 'text' });
}

const PREVIEW_LENGTH: number = 300;

const displayedText = computed<string>(
  () =>
    props.text.data.text.slice(0, PREVIEW_LENGTH) +
    (props.text.data.text.length > PREVIEW_LENGTH ? '...' : ''),
);

function handleRemoveText() {
  emit('textRemoved', props.text);
}

function handleAddTextClick() {
  emit('textAdded', props.text);
}

/**
 * Handles a click event on the Card component, which will the corresponding text in a new tab. The click event is ignored
 * if the click target is part of the MultiSelect component, to prevent interference with label editing.
 *
 * @param {PointerEvent} event - The click event.
 * @returns {void} This function does not return any value.
 */
function handleClickContainer(event: PointerEvent): void {
  // TODO: Change this when multiselect is moved to its own component
  if ((event.target as HTMLElement).closest('.multiselect')) {
    return;
  }

  window.open(`/texts/${props.text.data.uuid}`, '_blank', 'noopener noreferrer');
}
</script>

<template>
  <Card
    class="my-2"
    :pt="{
      root: {
        style: {
          border: '1px solid gray',
          cursor: 'pointer',
        },
      },
      body: {
        style: {
          padding: '15px',
        },
      },
    }"
    @click="handleClickContainer"
  >
    <template #title>
      <div class="header">
        <div class="button-pane flex justify-content-end">
          <Button
            type="button"
            severity="secondary"
            :icon="`pi pi-bookmark${isBookmarked ? '-fill' : ''}`"
            size="small"
            :title="isBookmarked ? 'Remove text from bookmarks' : 'Add text to bookmarks'"
            @click.stop="handleBookmarkAction"
            :pt="{
              icon: {
                style: isBookmarked ? { color: 'var(--p-primary-color)' } : {},
              },
            }"
          />
          <Button
            v-if="mode === 'edit'"
            type="button"
            icon="pi pi-times"
            severity="danger"
            outlined
            size="small"
            title="Remove text"
            @click.stop="handleRemoveText"
          />
        </div>
        <div class="node-labels-container">
          <template v-if="mode === 'view'">
            <NodeTag v-for="label in props.text.nodeLabels" :content="label" type="Text" />
          </template>

          <template v-if="mode === 'edit'">
            <MultiSelect
              size="small"
              v-model="text.nodeLabels"
              :options="getAvailableTextLabels()"
              display="chip"
              placeholder="Text labels"
              class="multiselect text-center"
              :filter="false"
              :pt="{
                root: {
                  title: `Select Text labels`,
                },
              }"
            >
              <template #chip="{ value }">
                <NodeTag type="Text" :content="value" class="mr-1" />
              </template>
            </MultiSelect>
          </template>
        </div>
      </div>
    </template>

    <template #content>
      <div v-if="props.status === 'existing'">
        <div class="text" title="Open text in Editor">
          {{ displayedText }}
        </div>
      </div>
      <div v-else>
        <Textarea v-model="text.data.text" class="w-full" placeholder="Add text" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-content-center">
        <Button
          v-if="props.status === 'temporary'"
          class="w-2"
          icon="pi pi-check"
          title="Add new text to Collection"
          @click.stop="handleAddTextClick"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.text a {
  color: inherit;
  display: block;
}

*:has(.text):hover {
  background-color: #efefef;
  transition: background-color 0.2s;
}
</style>
