<script setup lang="ts">
import { computed, DeepReadonly, ref, useTemplateRef, watch } from 'vue';
import Popover from 'primevue/popover';
import ButtonGroup from 'primevue/buttongroup';
import ToggleButton from 'primevue/togglebutton';
import { useBookmarks } from '../composables/useBookmarks';
import BookmarkItem from './BookmarkItem.vue';
import { Bookmark } from '../models/types';
import { capitalize } from '../utils/helper/helper';
import { RouteLocationNormalized, useRoute } from 'vue-router';

defineExpose({
  toggle,
});

const { bookmarks } = useBookmarks();
const route: RouteLocationNormalized = useRoute();

const popover = useTemplateRef<InstanceType<typeof Popover>>('popover');

watch(route, () => popover.value.hide());

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

/**
 * Toggle the visibility of the popover.
 *
 * @param {PointerEvent} event - The event that triggered the toggle.
 * @returns {void} This function does not return any value.
 */
function toggle(event: PointerEvent): void {
  popover.value.toggle(event);
}

/**
 * Toggle the view mode of the bookmark popover between collections and texts.
 *
 * @param {string} direction - The direction to toggle the view mode. Can be either 'collection' or 'text'.
 */
function toggleBookmarkTypeView(direction: 'collection' | 'text'): void {
  selectedBookmarkType.value = direction;
}
</script>

<template>
  <Popover
    ref="popover"
    :auto-z-index="false"
    :pt="{
      root: {
        class: 'w-25rem',
        style: {
          zIndex: 'var(--z-index-max)',
        },
      },
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
          @change="toggleBookmarkTypeView('collection')"
        />
        <ToggleButton
          :model-value="selectedBookmarkType === 'text'"
          class="w-full"
          :onLabel="`Texts (${textCount})`"
          :offLabel="`Texts (${textCount})`"
          title="Show texts"
          @change="toggleBookmarkTypeView('text')"
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

      <div
        v-if="displayedItems.length > 0"
        class="disclaimer mt-4 text-xs font-italic flex align-items-center gap-2"
      >
        <i class="pi pi-exclamation-circle"></i>
        <span>
          The bookmarks are stored in your browser. If you change you device, they won't be
          available there.
        </span>
      </div>
    </div>
  </Popover>
</template>

<style scoped></style>
