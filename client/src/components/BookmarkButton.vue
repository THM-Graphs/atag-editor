<script setup lang="ts">
import { computed, DeepReadonly, ref, useTemplateRef, watch } from 'vue';
import Button from 'primevue/button';
import Popover from 'primevue/popover';
import ButtonGroup from 'primevue/buttongroup';
import ToggleButton from 'primevue/togglebutton';
import { useBookmarks } from '../composables/useBookmarks';
import BookmarkItem from './BookmarkItem.vue';
import { Bookmark } from '../models/types';
import { capitalize } from '../utils/helper/helper';
import { RouteLocationNormalized, useRoute } from 'vue-router';

const { bookmarks } = useBookmarks();

const route: RouteLocationNormalized = useRoute();

watch(route, () => bookmarkPopover.value.hide());

const selectedBookmarkType = ref<'collection' | 'text'>('collection');
const displayedItems = computed<DeepReadonly<Bookmark[]>>(() =>
  bookmarks.value.filter(bookmark => bookmark.type === selectedBookmarkType.value),
);

const collectionCount = computed<number>(
  () => bookmarks.value.filter(bookmark => bookmark.type === 'collection').length,
);
const textCount = computed<number>(
  () => bookmarks.value.filter(bookmark => bookmark.type === 'text').length,
);

const bookmarkPopover = useTemplateRef('op');

const toggle = event => {
  bookmarkPopover.value.toggle(event);
};

function toggleViewMode(direction: 'collection' | 'text'): void {
  selectedBookmarkType.value = direction;
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
          :model-value="selectedBookmarkType === 'collection'"
          class="w-full"
          :onLabel="`Collections (${collectionCount})`"
          :offLabel="`Collections (${collectionCount})`"
          title="Show collections"
          badge="2"
          @change="toggleViewMode('collection')"
        />
        <ToggleButton
          :model-value="selectedBookmarkType === 'text'"
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
        Currently there is no bookmarked {{ capitalize(selectedBookmarkType) }}.
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

<style scoped></style>
