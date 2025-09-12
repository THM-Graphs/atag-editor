<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { buildFetchUrl } from './utils/helper/helper';
import { useStyleTag } from '@vueuse/core';
import LoadingSpinner from './components/LoadingSpinner.vue';

const isLoaded = ref<boolean>(false);

onMounted(async () => {
  await getStyles();
});

async function getStyles() {
  try {
    const url: string = buildFetchUrl('/api/styles');
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to load stylesheet');
    }

    const css: string = await response.text();

    useStyleTag(css, { id: 'custom-styles' });
  } catch (error) {
    console.error('Error loading stylesheet:', error);
  } finally {
    isLoaded.value = true;
  }
}
</script>

<template>
  <RouterView v-if="isLoaded" />
  <LoadingSpinner v-else />
</template>

<style scoped></style>
