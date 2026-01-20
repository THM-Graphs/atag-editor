<script setup lang="ts">
import { computed, ref } from 'vue';
import EditorHistoryButton from './EditorHistoryButton.vue';
import EditorImportButton from './EditorImportButton.vue';
import FulltextSearchbar from './FulltextSearchbar.vue';
import { useTextStore } from '../store/text';
import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';
import NodeTag from './NodeTag.vue';
import BookmarkButton from './BookmarkButton.vue';
import { useBookmarks } from '../composables/useBookmarks';
import { MenuItem } from 'primevue/menuitem';

const { text, correspondingCollection } = useTextStore();
const { bookmarks, addBookmark, removeBookmark } = useBookmarks();

const breadcrumbRoot = ref<MenuItem>({
  role: 'Collection',
  label: correspondingCollection.value.data.label,
  uuid: correspondingCollection.value.data.uuid,
});
const breadcrumbItems = ref<MenuItem[]>([{ role: 'Text', labels: text.value.nodeLabels }]);

const isBookmarked = computed<boolean>(() => {
  return bookmarks.value.some(b => b.data.data.uuid === text.value.data.uuid);
});

function handleBookmarkAction() {
  if (!isBookmarked.value) {
    addBookmark(text.value, 'text');
  } else {
    removeBookmark(text.value.data.uuid);
  }
}
</script>

<template>
  <div class="header">
    <div class="header-buttons flex justify-content-between mb-2">
      <RouterLink to="/">
        <Button
          icon="pi pi-home"
          aria-label="Home"
          class="w-2rem h-2rem"
          title="Go to overview"
        ></Button>
      </RouterLink>
      <div class="flex">
        <FulltextSearchbar />
        <EditorHistoryButton action="undo" />
        <EditorHistoryButton action="redo" />
        <EditorImportButton />
        <BookmarkButton />
      </div>
    </div>

    <div class="flex justify-content-center align-items-center">
      <Breadcrumb :home="breadcrumbRoot" :model="breadcrumbItems">
        <template #item="{ item }">
          <div v-if="item.role === 'Collection'">
            <RouterLink
              :to="`/collections/${item.uuid}`"
              severity="contrast"
              :title="`Collection: ${item.label}`"
            >
              {{ item.label }}
            </RouterLink>
          </div>
          <div v-else class="text-labels">
            <NodeTag
              v-if="item.labels.length > 0"
              v-for="label in item.labels"
              :content="label"
              type="Text"
              class="mr-1 mb-1"
            />
            <span v-else class="font-italic" title="This Text has no labels yet"
              >No Text labels yet</span
            >
          </div>
        </template>
      </Breadcrumb>
      <Button
        type="button"
        severity="secondary"
        :icon="`pi pi-bookmark${isBookmarked ? '-fill' : ''}`"
        size="small"
        :title="isBookmarked ? 'Remove text from bookmarks' : 'Add text to bookmarks'"
        @click="handleBookmarkAction"
        :pt="{
          icon: {
            style: isBookmarked ? { color: 'var(--p-primary-color)' } : {},
          },
        }"
      />
    </div>
  </div>
</template>

<style scoped></style>
