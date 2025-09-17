<script setup lang="ts">
import { onMounted } from 'vue';
import LoadingSpinner from './components/LoadingSpinner.vue';
import { useAppStore } from './store/app';

const { error: appError, isFetching: isAppFetching, initializeApp } = useAppStore();

onMounted(async () => {
  await initializeApp();
});
</script>

<template>
  <LoadingSpinner v-if="isAppFetching" />
  <RouterView v-else-if="!appError" />
  <div v-else>Error fetching app configurations. Reload the page please.</div>
</template>

<style scoped></style>
