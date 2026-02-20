<script setup lang="ts">
import { inject, watch, computed } from 'vue';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { useExport } from '../composables/useExport';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import { useEditorStore } from '../store/editor';

const route: RouteLocationNormalizedLoaded = useRoute();

const { exportedJson, status, errorMessages, buildJson, copyToClipboard, downloadJson, reset } =
  useExport();
const { hasUnsavedChanges } = useEditorStore();

const textHasUnsavedChanges = hasUnsavedChanges();

const dialogRef: any = inject('dialogRef');

const copyLabel = computed<string>(() => (status.value === 'copied' ? 'Copied!' : 'Copy'));
const copyIcon = computed<string>(() => (status.value === 'copied' ? 'pi pi-check' : 'pi pi-copy'));

watch(() => route.path, closeModal);

// Build the JSON as soon as the modal is opened
buildJson();

function handleCopyClick(): void {
  copyToClipboard();
}

function handleDownloadClick(): void {
  downloadJson();
}

function handleCloseClick(): void {
  reset();
  closeModal();
}

function closeModal(): void {
  dialogRef.value.close();
}
</script>

<template>
  <h2 class="w-full text-center m-0">Export as Standoff JSON</h2>

  <div class="flex flex-column gap-3 mt-3">
    <Message v-for="msg of errorMessages" :key="msg.id" :severity="msg.severity" closable>
      {{ msg.content }}
    </Message>

    <Message
      v-if="textHasUnsavedChanges"
      severity="warn"
      icon="pi pi-exclamation-circle"
      class="w-full my-2"
      closable
    >
      When there are unsaved changes, they will not be exported. Please save your work before
      exporting to ensure everything is exported correctly.
    </Message>

    <Textarea
      :model-value="exportedJson"
      rows="14"
      class="w-full"
      readonly
      spellcheck="false"
      placeholder="No data to export."
    />

    <div class="flex justify-content-center gap-2">
      <ButtonGroup>
        <Button
          :label="copyLabel"
          :icon="copyIcon"
          severity="success"
          title="Copy JSON to clipboard"
          :disabled="!exportedJson"
          @click="handleCopyClick"
        />
        <Button
          label="Download"
          icon="pi pi-download"
          severity="success"
          title="Download as standoff-export.json"
          :disabled="!exportedJson"
          @click="handleDownloadClick"
        />
      </ButtonGroup>

      <Button label="Close" severity="secondary" title="Close" @click="handleCloseClick" />
    </div>
  </div>
</template>
