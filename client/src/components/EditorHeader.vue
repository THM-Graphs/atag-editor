<script setup lang="ts">
import { ref } from 'vue';
import EditorHistoryButton from './EditorHistoryButton.vue';
import EditorImportButton from './EditorImportButton.vue';
import FulltextSearchbar from './FulltextSearchbar.vue';
import { useTextStore } from '../store/text';
import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';
import NodeTag from './NodeTag.vue';

const { text, correspondingCollection } = useTextStore();

const breadcrumbRoot = ref({ role: 'Collection', label: correspondingCollection.value.data.label });
const breadcrumbItems = ref([{ role: 'Text', labels: text.value.nodeLabels }]);
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
      </div>
    </div>

    <div class="flex justify-content-center">
      <Breadcrumb :home="breadcrumbRoot" :model="breadcrumbItems">
        <template #item="{ item }">
          <div v-if="item.role === 'Collection'">
            <span severity="contrast" :title="`Collection: ${item.label}`">{{ item.label }}</span>
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
    </div>
  </div>
</template>

<style scoped></style>
