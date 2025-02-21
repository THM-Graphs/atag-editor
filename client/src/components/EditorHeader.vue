<script setup lang="ts">
import { ref } from 'vue';
import EditorImportButton from './EditorImportButton.vue';
import { useTextStore } from '../store/text';
import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';

const { text, correspondingCollection } = useTextStore();

const home = ref({ labels: '(C) ' + correspondingCollection.value.data.label });
const items = ref([{ labels: text.value.nodeLabels }]);
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
      <Breadcrumb :home="home" :model="items">
        <template #item="{ item }">
          <span v-if="item.labels.length > 0">{{ item.labels }}</span>
          <span v-else><i>No label yet</i></span>
        </template>
      </Breadcrumb>
    </div>
  </div>
</template>

<style scoped></style>
