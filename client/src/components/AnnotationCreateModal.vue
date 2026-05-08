<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import Button from 'primevue/button';
import { useRoute } from 'vue-router';
import Fieldset from 'primevue/fieldset';
import FormPropertiesSection from './FormPropertiesSection.vue';
import { Annotation, AnnotationType, PropertyConfig } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import AnnotationFormAdditionalNodesSection from './AnnotationFormAdditionalNodesSection.vue';

const route = useRoute();
const dialogRef: any = inject('dialogRef');

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', annotation: Annotation): void;
}>();

const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

const annotationTemplate: Annotation = dialogRef.value.data.annotation;
const config: AnnotationType = getAnnotationConfig(annotationTemplate.node.data.type);
const propertyFields: PropertyConfig[] = getAnnotationFields(annotationTemplate.node.data.type);

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

    const value = annotationTemplate.node.data[field.name];

    if (value === null || value === undefined) {
      return false;
    }

    if (field.type === 'string' && (value as string).trim().length === 0) {
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
      Add new <span class="font-italic">{{ annotationTemplate.node.data.type }}</span> Annotation
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
          v-model="annotationTemplate.node.data"
          :fields="propertyFields"
          mode="edit"
        />
      </Fieldset>
      <AnnotationFormAdditionalNodesSection
        :mode="'edit'"
        :annotation-config="config"
        v-model="annotationTemplate.connectedNodes"
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
