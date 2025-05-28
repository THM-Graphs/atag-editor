<script setup lang="ts">
import { ref } from 'vue';
import EditorHistoryButton from './EditorHistoryButton.vue';
import EditorImportButton from './EditorImportButton.vue';
import { useTextStore } from '../store/text';
import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

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
      <div>
        <EditorHistoryButton action="undo" />
        <EditorHistoryButton action="redo" />
        <EditorImportButton />
      </div>
    </div>

    <div class="flex justify-content-center">
      <Breadcrumb :home="breadcrumbRoot" :model="breadcrumbItems">
        <template #item="{ item }">
          <div v-if="item.role === 'Collection'">
            <Tag :value="item.label" severity="contrast" :title="`Collection: ${item.label}`" />
          </div>
          <div v-else>
            <Tag
              v-if="item.labels.length > 0"
              :value="item.labels.join(' | ')"
              severity="secondary"
              :title="`Text labels: ${item.labels.join(', ')}`"
            />
            <Tag v-else="" :value="'\u00A0'" severity="secondary" title="No label yet" />
          </div>
        </template>
      </Breadcrumb>
    </div>
  </div>
</template>

<style scoped></style>
