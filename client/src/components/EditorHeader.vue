<script setup lang="ts">
import { ref } from 'vue';
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
        <EditorImportButton />
      </div>
    </div>

    <div class="flex justify-content-center">
      <Breadcrumb :home="breadcrumbRoot" :model="breadcrumbItems">
        <template #item="{ item }">
          <div v-if="item.role === 'Collection'">
            <span>
              {{ item.label }}
            </span>
          </div>
          <div v-else>
            <template v-if="item.labels.length > 0" v-for="label in item.labels">
              <Tag :value="label" severity="secondary" class="mr-1" />
            </template>
            <span v-else><i>No label yet</i></span>
          </div>
        </template>
      </Breadcrumb>
    </div>
  </div>
</template>

<style scoped></style>
