<script setup lang="ts">
import { ComponentPublicInstance, computed, DeepReadonly, ref, useTemplateRef, watch } from 'vue';
import Popover from 'primevue/popover';
import ButtonGroup from 'primevue/buttongroup';
import ToggleButton from 'primevue/togglebutton';
import { useBookmarks } from '../composables/useBookmarks';
import BookmarkItem from './BookmarkItem.vue';
import { Bookmark, Collection, Text } from '../models/types';
import { capitalize } from '../utils/helper/helper';
import { RouteLocationNormalized, useRoute } from 'vue-router';
import { InputText } from 'primevue';
import InputIcon from 'primevue/inputicon';
import IconField from 'primevue/iconfield';

defineExpose({
  toggle,
});

const { bookmarks } = useBookmarks();
const route: RouteLocationNormalized = useRoute();

const popover = useTemplateRef<InstanceType<typeof Popover>>('popover');
const searchbar = useTemplateRef<ComponentPublicInstance>('searchbar');

const selectedBookmarkType = ref<'collection' | 'text'>('collection');
const searchValue = ref<string>('');

watch(route, () => popover.value.hide());

watch(selectedBookmarkType, () => focusSearchBar());

const displayedItems = computed<DeepReadonly<Bookmark[]>>(() =>
  bookmarks.value.filter(bookmark => {
    const stringToCheck: string =
      selectedBookmarkType.value === 'collection'
        ? (bookmark.data as Collection).data.label
        : (bookmark.data as Text).data.text;

    if (
      bookmark.type === selectedBookmarkType.value &&
      stringToCheck.toLowerCase().includes(searchValue.value.toLocaleLowerCase())
    ) {
      return true;
    }
  }),
);

const collectionCount = computed<number>(
  () => bookmarks.value.filter(bookmark => bookmark.type === 'collection').length,
);
const textCount = computed<number>(
  () => bookmarks.value.filter(bookmark => bookmark.type === 'text').length,
);

// TODO: Hardcoded since some Primevue variables are missing somehow -> Fix when updating Primevue version?
const searchBarStylingOptions: Partial<CSSStyleDeclaration> = {
  marginTop: 'calc(-1 * (var(--p-icon-size) / 2))',
};

/**
 * Focus the searchbar HTML Input element.
 *
 * Called when the popover is toggled on or the category is switched to keep the caret in the input element.
 *
 * @returns {void} This function does not return any value.
 */
function focusSearchBar(): void {
  searchbar.value.$el?.focus();
}

/**
 * Focuses the search bar element of the popover.
 *
 * Called when the popover is shown (by emitting the component's `show` event).
 *
 * @returns {void} This function does not return any value.
 */
function onShowPopover(): void {
  focusSearchBar();
}

/**
 * Resets the search value to an empty string. Called when the user clicks on the clear button of the search bar.
 *
 * @returns {void} This function does not return any value.
 */
function resetSearch(): void {
  searchValue.value = '';
}

/**
 * Toggle the visibility of the popover.
 *
 * Exposed to and called by the button component to which the popover is attached.
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
    @show="onShowPopover"
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
    <div class="search-bar mb-3 w-full">
      <IconField>
        <InputIcon class="pi pi-search" size="small" :style="searchBarStylingOptions" />
        <InputText
          v-model="searchValue"
          ref="searchbar"
          type="text"
          size="small"
          placeholder="Filter bookmarks"
          class="w-full"
        />
        <InputIcon
          v-if="searchValue !== ''"
          class="pi pi-delete-left cursor-pointer"
          size="small"
          :style="searchBarStylingOptions"
          title="Clear search"
          @click="resetSearch"
        />
      </IconField>
    </div>
    <div class="items-pane">
      <div v-if="displayedItems.length === 0" class="text-sm font-italic text-center">
        <template v-if="searchValue === ''">
          Currently there is no bookmarked {{ capitalize(selectedBookmarkType) }}.
        </template>
        <template v-else> There are no bookmarks matching your search query. </template>
      </div>
      <BookmarkItem
        v-for="item in displayedItems"
        :bookmarkData="item as Bookmark"
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
