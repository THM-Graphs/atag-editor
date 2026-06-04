<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useGuidelinesStore } from '../store/guidelines';
import { useTextStore } from '../store/text';
import { capitalize } from '../utils/helper/helper';
import { PropertyConfig } from '../models/types';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Fieldset from 'primevue/fieldset';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import NodeTag from './NodeTag.vue';
import { useBookmarks } from '../composables/useBookmarks';
import { MenuItem } from 'primevue/menuitem';
import Breadcrumb from 'primevue/breadcrumb';
import { computed, ref } from 'vue';

const { text, correspondingCollection } = useTextStore();

const { bookmarks, toggleBookmark } = useBookmarks();

const breadcrumbRoot = ref<MenuItem>({
  role: 'Collection',
  label: correspondingCollection.value?.data.label,
  uuid: correspondingCollection.value?.data.uuid,
});
const breadcrumbItems = ref<MenuItem[]>([{ role: 'Content', labels: text.value.nodeLabels }]);

const isBookmarked = computed<boolean>(() => {
  return bookmarks.value.some(b => b.data.data.uuid === text.value.data.uuid);
});

function handleBookmarkAction() {
  toggleBookmark({ data: text.value, type: 'text' });
}

async function handleCopy(): Promise<void> {
  await navigator.clipboard.writeText(text.value.data.uuid);
}
</script>

<template>
  <Panel
    header="Metadata"
    class="metadata-container mb-3"
    toggleable
    collapsed
    :toggle-button-props="{
      severity: 'secondary',
      title: 'Toggle full view',
      rounded: true,
      text: true,
    }"
  >
    <template #toggleicon="{ collapsed }">
      <i :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></i>
    </template>
    <div class="mb-3">
      <div class="flex align-items-center gap-3">
        <InputText
          id="uuid"
          :disabled="true"
          :value="text.data.uuid"
          class="flex-auto w-full"
          size="small"
          spellcheck="false"
        />
        <Button
          icon="pi pi-copy"
          severity="secondary"
          size="small"
          aria-label="Copy UUID"
          title="Copy UUID"
          @click="handleCopy"
        />
      </div>
      <small>Text UUID</small>
    </div>
    <Fieldset legend="Text labels" toggleable>
      <template #toggleicon="{ collapsed }">
        <span :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></span>
      </template>
      <div class="flex gap-2">
        <div v-if="text.nodeLabels.length > 0" v-for="label in text.nodeLabels" :key="label">
          <NodeTag :content="label" type="Text" class="mr-1" />
        </div>
        <div v-else>
          <i v-if="correspondingCollection"
            >This text has no labels yet. To add some, go to the
            <RouterLink :to="`/collections/${correspondingCollection.data.uuid}`"
              >Collection page.<i class="pi pi-external-link ml-2"></i></RouterLink
          ></i>
        </div>
      </div>
    </Fieldset>

    <Fieldset legend="Ancestry path" toggleable>
      <template #toggleicon="{ collapsed }">
        <span :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></span>
      </template>
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
    </Fieldset>
  </Panel>
</template>

<style scoped>
.metadata-container {
  outline: 1px solid var(--p-primary-color);
}
</style>
