<script setup lang="ts">
import Button from 'primevue/button';
import { useDialog } from 'primevue';
import { useAppStore } from '../store/app';
import ExportModal from './ExportModal.vue';

const dialog = useDialog();

const { createModalInstance, destroyModalInstance } = useAppStore();

function openExportModal(): void {
  createModalInstance(
    dialog.open(ExportModal, {
      props: {
        modal: true,
        closable: false,
        closeOnEscape: false,
        style: { width: '30rem' },
      },
      onClose: () => destroyModalInstance(),
    }),
  );
}
</script>

<template>
  <Button
    icon="pi pi-file-export"
    severity="secondary"
    outlined
    class="h-2rem mr-1"
    title="Export JSON"
    label="Export"
    @click="openExportModal"
  ></Button>
</template>

<style scoped>
.drop-area {
  border: 2px dashed var(--p-primary-500);
}
</style>
