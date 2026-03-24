<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import Button from 'primevue/button';
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
  (e: 'create'): void;
}>();

const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

const annotationToCreate: Annotation = dialogRef.value.data.annotation;
const config: AnnotationType = getAnnotationConfig(annotationToCreate.data.properties.type);
const propertyFields: PropertyConfig[] = getAnnotationFields(
  annotationToCreate.data.properties.type,
);

const asyncOperationRunning = ref<boolean>(false);
const propertiesAreCollapsed = ref<boolean>(false);

const inputIsValid = computed<boolean>(checkAnnotationValidity);

watch(() => route.path, closeModal);

// TODO: Move this to helper or something
function checkAnnotationValidity() {
  // For properties. Will be extended when rules for connected entites etc. are applied
  return propertyFields.every((field: PropertyConfig) => {
    if (!field.required) {
      return true;
    }

    const value = annotationToCreate.data.properties[field.name];

    if (value === null || value === undefined) {
      return false;
    }

    if (field.type === 'string' && value.trim().length === 0) {
      return false;
    }

    return true;
  });
}

function closeModal(): void {
  dialogRef.value.close();
}

function handleCancelClick(): void {
  closeModal();
}

function handleSubmitClick(): void {
  closeModal();

  emit('create');
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
      :disabled="!inputIsValid"
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

<style scoped>
.content {
  overflow-y: scroll;
}
</style>
