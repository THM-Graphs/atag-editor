<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppStore } from './store/app';
import DatabaseConnectionError from './utils/errors/databaseConnection.error';
import LoadingSpinner from './components/LoadingSpinner.vue';
import DynamicDialog from 'primevue/dynamicdialog';
import Toast from 'primevue/toast';
import { ToastServiceMethods, useToast } from 'primevue';

const { error: appError, isFetching: isAppFetching, initializeApp, registerToast } = useAppStore();
const toast: ToastServiceMethods = useToast();

onMounted(async () => {
  registerToast(toast);

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
  <Toast />
</template>

<style scoped></style>
