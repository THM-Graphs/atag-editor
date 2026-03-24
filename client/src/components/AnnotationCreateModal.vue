<script setup lang="ts">
import { computed, inject, onMounted, ref, toRef, watch } from 'vue';
import Button from 'primevue/button';
import { useAppStore } from '../store/app';
import { useRoute } from 'vue-router';
import Fieldset from 'primevue/fieldset';
import FormPropertiesSection from './FormPropertiesSection.vue';
import AnnotationFormAdditionalTextSection from './AnnotationFormAdditionalTextSection.vue';
import AnnotationFormEntitiesSection from './AnnotationFormEntitiesSection.vue';
import { Annotation, AnnotationType, PropertyConfig } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';

const route = useRoute();
const dialogRef: any = inject('dialogRef');

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created'): void;
}>();

const { addToastMessage } = useAppStore();
const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

const annotationToCreate: Annotation = dialogRef.value.data.annotation;
const config: AnnotationType = getAnnotationConfig(annotationToCreate.data.properties.type);
const propertyFields: PropertyConfig[] = getAnnotationFields(
  annotationToCreate.data.properties.type,
);

const asyncOperationRunning = ref<boolean>(false);
const propertiesAreCollapsed = ref<boolean>(false);

watch(() => route.path, closeModal);

// function closeModal(): void {
//   emit('close');
// }

function closeModal(): void {
  dialogRef.value.close();
}

// function showMessage(result: 'success' | 'error', error?: Error) {
//   addToastMessage({
//     severity: result,
//     summary: result === 'success' ? 'Changes saved successfully' : 'Error saving changes',
//     detail: error?.message ?? '',
//     life: 2000,
//   });
// }
// const isMounted = computed(() => {
//   if (annotationToCreate.value !== null) {
//     console.log('exists');
//     return true;
//   } else {
//     console.log('DOJES NOT EXIST');
//     return false;
//   }
// });

function handleCancelClick(): void {
  closeModal();
}

async function handleSubmitClick(): Promise<void> {
  asyncOperationRunning.value = true;

  try {
    // await api.deleteCollection(collection.value.collection.data.uuid);

    closeModal();

    emit('created');
  } catch (error: unknown) {
    // showMessage('error', error as Error);
  } finally {
    asyncOperationRunning.value = false;
  }
}
</script>

<template>
  <h2 class="w-full text-center m-0">
    Create new
    <span class="font-italic">{{ annotationToCreate.data.properties.type }}</span> Annotation
  </h2>

  <div class="content text-center mb-2" v-if="annotationToCreate">
    <Fieldset
      legend="Properties"
      :toggle-button-props="{
        title: `${propertiesAreCollapsed ? 'Expand' : 'Collapse'} properties`,
      }"
      :toggleable="true"
      @toggle="propertiesAreCollapsed = !propertiesAreCollapsed"
    >
      <template #toggleicon>
        <span :class="`pi pi-chevron-${propertiesAreCollapsed ? 'down' : 'up'}`"></span>
      </template>
      <FormPropertiesSection
        v-model="annotationToCreate.data.properties"
        :fields="propertyFields"
        mode="edit"
      />
    </Fieldset>
    <AnnotationFormAdditionalTextSection
      v-if="config.hasAdditionalTexts === true"
      v-model="annotationToCreate.data.additionalTexts"
      :initial-additional-texts="annotationToCreate.initialData.additionalTexts"
      mode="edit"
    />
    <AnnotationFormEntitiesSection
      v-if="config.hasEntities === true"
      v-model="annotationToCreate.data.entities"
      mode="edit"
      :annotation-config="config"
      :default-search-value="annotationToCreate.data.properties.text"
      :initialEntities="annotationToCreate.initialData.entities"
    />
  </div>

  <div class="button-container flex justify-content-end gap-2">
    <Button
      type="submit"
      label="Create"
      severity="success"
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
