<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppStore } from './store/app';
import DatabaseConnectionError from './utils/errors/databaseConnection.error';
import LoadingSpinner from './components/LoadingSpinner.vue';
import DynamicDialog from 'primevue/dynamicdialog';

const { error: appError, isFetching: isAppFetching, initializeApp } = useAppStore();

onMounted(async () => {
  await initializeApp();
});
</script>

<template>
  <LoadingSpinner v-if="isAppFetching" />
  <RouterView v-else-if="!appError" />
  <template v-else>
    <div v-if="appError instanceof DatabaseConnectionError">
      The connection to the database could not be established. Reload the page please.
    </div>
    <div v-else>Error fetching app configurations and/or stylesheets. Reload the page please.</div>
  </template>

  <DynamicDialog />
</template>

<style scoped></style>
