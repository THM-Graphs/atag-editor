<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { buildFetchUrl } from './utils/helper/helper';
import { useStyleTag } from '@vueuse/core';
import LoadingSpinner from './components/LoadingSpinner.vue';
import { useGuidelinesStore } from './store/guidelines';

const { error: guideLinesError, fetchAndInitializeGuidelines } = useGuidelinesStore();

const isLoaded = ref<boolean>(false);

onMounted(async () => {
  await getStyles();
  await fetchAndInitializeGuidelines();

  isLoaded.value = true;
});

// TODO: Move this to app store or similar.
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
  }
}
</script>

<template>
  <LoadingSpinner v-if="!isLoaded" />
  <RouterView v-else-if="!guideLinesError" />
  <div v-else>Error fetching app configurations. Reload the page please.</div>
</template>

<style scoped></style>
