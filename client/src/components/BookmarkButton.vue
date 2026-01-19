<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import Button from 'primevue/button';
import Popover from 'primevue/popover';
import ButtonGroup from 'primevue/buttongroup';
import ToggleButton from 'primevue/togglebutton';
import { useBookmarks } from '../composables/useBookmarks';
import BookmarkItem from './BookmarkItem.vue';
import { Bookmark } from '../models/types';
import { capitalize } from '../utils/helper/helper';

const { bookmarks } = useBookmarks();

const selectedView = ref<'collection' | 'text'>('collection');
const displayedItems = computed(() =>
  bookmarks.value.filter(bookmark => bookmark.type === selectedView.value),
);

const collectionCount = computed(
  () => bookmarks.value.filter(bookmark => bookmark.type === 'collection').length,
);
const textCount = computed(
  () => bookmarks.value.filter(bookmark => bookmark.type === 'text').length,
);

const bookmarkPopover = useTemplateRef('op');

const toggle = event => {
  bookmarkPopover.value.toggle(event);
};

function toggleViewMode(direction: 'collection' | 'text'): void {
  selectedView.value = direction;
}
</script>

<template>
  <Button
    type="button"
    severity="secondary"
    label="Bookmarks"
    icon="pi pi-bookmark-fill"
    size="small"
    @click="toggle"
  />

  <!-- TODO: Put popover in separate component? -->

  <Popover
    ref="op"
    :pt="{
      root: 'w-25rem',
    }"
  >
    <div class="tab-buttons mb-2">
      <ButtonGroup class="w-full flex">
        <ToggleButton
          :model-value="selectedView === 'collection'"
          class="w-full"
          :onLabel="`Collections (${collectionCount})`"
          :offLabel="`Collections (${collectionCount})`"
          title="Show collections"
          badge="2"
          @change="toggleViewMode('collection')"
        />
        <ToggleButton
          :model-value="selectedView === 'text'"
          class="w-full"
          :onLabel="`Texts (${textCount})`"
          :offLabel="`Texts (${textCount})`"
          title="Show texts"
          badge="2"
          @change="toggleViewMode('text')"
        />
      </ButtonGroup>
    </div>
    <div class="items-pane">
      <div v-if="displayedItems.length === 0" class="text-sm font-italic text-center">
        Currently there is no bookmarked {{ capitalize(selectedView) }}.
      </div>
      <BookmarkItem
        v-for="item in displayedItems"
        :data="item as Bookmark"
        :type="item.type"
        :key="item.data.data.uuid"
      />
    </div>
  </Popover>
</template>

<style scoped>
.drop-area {
  border: 2px dashed var(--p-primary-500);
}
</style>
