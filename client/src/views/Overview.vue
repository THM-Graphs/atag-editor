<script setup lang="ts">
import { useTitle } from '@vueuse/core';
import CollectionTree from '../components/CollectionTree.vue';
import OverviewToolbar from '../components/OverviewToolbar.vue';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import ICollection from '../models/ICollection';

const toast: ToastServiceMethods = useToast();

useTitle('ATAG Editor');

function handleCollectionCreation(newCollection: ICollection): void {
  return;
  showMessage('created', `"${newCollection.label}"`);
  // getCollections();
}

function handleSearchInputChange(newInput: string): void {
  return;
}

function showMessage(operation: 'created' | 'deleted', detail?: string): void {
  toast.add({
    severity: 'success',
    summary: operation === 'created' ? 'New text created' : 'Text deleted',
    detail: detail,
    life: 2000,
  });
}
</script>

<template>
  <div class="container flex flex-column h-screen m-auto mx-3">
    <Toast />

    <h1 class="text-center text-5xl line-height-2">Collections</h1>

    <OverviewToolbar
      @collection-created="handleCollectionCreation"
      @search-input-changed="handleSearchInputChange"
    />

    <div class="pl-8 pt-5">
      <CollectionTree />
    </div>
  </div>
</template>

<style scoped>
.container {
  min-width: 800px;
}
</style>
