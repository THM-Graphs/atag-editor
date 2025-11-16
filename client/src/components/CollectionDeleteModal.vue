<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import Button from 'primevue/button';
import { ToastServiceMethods, useToast } from 'primevue';
import { CollectionAccessObject } from '../models/types';
import { useAppStore } from '../store/app';
import { useRoute } from 'vue-router';

const emit = defineEmits(['deleted', 'canceled']);

const route = useRoute();

const { api } = useAppStore();
const toast: ToastServiceMethods = useToast();

const asyncOperationRunning = ref<boolean>(false);

// Must be computed since PrimeVue's Dialog Service does not allow custom props for components
const collection = computed<CollectionAccessObject>(() => {
  return dialogRef?.value?.data?.collection || null;
});

const deleteMessage = computed<string>(() => {
  const label: string = collection.value?.collection?.data?.label ?? '';
  const textsCount: number = collection.value?.texts?.length ?? 0;
  const annotationsCount: number = collection.value?.annotations?.length ?? 0;

  const parts: string[] = [];

  if (textsCount > 0) {
    parts.push(`${textsCount} ${textsCount === 1 ? 'Text' : 'Texts'}`);
  }

  if (annotationsCount > 0) {
    parts.push(`${annotationsCount} ${annotationsCount === 1 ? 'Annotation' : 'Annotations'}`);
  }

  const itemsPart: string = parts.length > 0 ? `, including ${parts.join(' and ')}` : '';

  return `The Collection with label "${label}" will be deleted${itemsPart}. Are you sure?`;
});

const dialogRef: any = inject('dialogRef');

watch(() => route.path, closeModal);

// ------------------------- UI stuff ------------------------

async function handleSubmitClick(): Promise<void> {
  asyncOperationRunning.value = true;

  try {
    await api.deleteCollection(collection.value.collection.data.uuid);

    closeModal();

    emit('deleted');
  } catch (error: unknown) {
    showMessage('error', error as Error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

function closeModal(): void {
  dialogRef.value.close();
}

function showMessage(result: 'success' | 'error', error?: Error) {
  toast.add({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Error saving changes',
    detail: error?.message ?? '',
    life: 2000,
  });
}

async function handleCancelClick(): Promise<void> {
  closeModal();
}
</script>

<template>
  <h2 class="w-full text-center m-0">Delete collection "{{ collection.collection.data.label }}"</h2>

  <div class="content text-center mb-2">
    <p>
      {{ deleteMessage }}
    </p>
  </div>

  <div class="button-container flex justify-content-end gap-2">
    <Button
      type="submit"
      label="Yes, delete"
      severity="danger"
      :loading="asyncOperationRunning"
      @click="handleSubmitClick"
    ></Button>
    <Button
      type="button"
      label="Cancel"
      title="Cancel"
      severity="secondary"
      @click="handleCancelClick"
    ></Button>
  </div>
</template>

<style scoped></style>
