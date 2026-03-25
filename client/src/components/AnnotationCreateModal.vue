<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import Button from 'primevue/button';
import { useRoute } from 'vue-router';
import Fieldset from 'primevue/fieldset';
import FormPropertiesSection from './FormPropertiesSection.vue';
import AnnotationFormAdditionalTextSection from './AnnotationFormAdditionalTextSection.vue';
import AnnotationFormEntitiesSection from './AnnotationFormEntitiesSection.vue';
import { AnnotationData, AnnotationType, PropertyConfig } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';

const route = useRoute();
const dialogRef: any = inject('dialogRef');

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', annotation: AnnotationData): void;
}>();

const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

const annotationTemplate: AnnotationData = dialogRef.value.data.annotation;
const config: AnnotationType = getAnnotationConfig(annotationTemplate.properties.type);
const propertyFields: PropertyConfig[] = getAnnotationFields(annotationTemplate.properties.type);

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

    const value = annotationTemplate.properties[field.name];

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

  emit('submit', annotationTemplate);
}
</script>

<template>
  <div class="container flex flex-column">
    <h2 class="w-full m-0 text-center">
      Add new <span class="font-italic">{{ annotationTemplate.properties.type }}</span> Annotation
    </h2>

    <div class="content mb-2" v-if="annotationTemplate">
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
          v-model="annotationTemplate.properties"
          :fields="propertyFields"
          mode="edit"
        />
      </Fieldset>
      <AnnotationFormAdditionalTextSection
        v-if="config.hasAdditionalTexts === true"
        v-model="annotationTemplate.additionalTexts"
        :initial-additional-texts="[]"
        mode="edit"
      />
      <AnnotationFormEntitiesSection
        v-if="config.hasEntities === true"
        v-model="annotationTemplate.entities"
        mode="edit"
        :annotation-config="config"
        :default-search-value="annotationTemplate.properties.text"
        :initialEntities="[]"
      />
    </div>

    <div class="footer flex justify-content-center gap-2">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        title="Cancel"
        severity="secondary"
        @click="handleCancelClick"
      ></Button>
      <Button
        :disabled="!inputIsValid"
        type="submit"
        icon="pi pi-plus"
        label="Add"
        title="Add annotation"
        severity="primary"
        :loading="asyncOperationRunning"
        @click="handleSubmitClick"
      ></Button>
    </div>
  </div>
</template>

<style scoped>
.container {
  height: 100%;
}

.content {
  overflow-y: auto;
  scrollbar-gutter: stable;
  flex-grow: 1;
}
</style>
