<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEditorStore } from '../store/editor';
import { useGuidelinesStore } from '../store/guidelines';
import { toggleTextHightlighting } from '../utils/helper/helper';
import Button from 'primevue/button';
import ConfirmPopup from 'primevue/confirmpopup';
import Fieldset from 'primevue/fieldset';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { Annotation, AnnotationType, PropertyConfig } from '../models/types';
import AnnotationFormEntitiesSection from './AnnotationFormEntitiesSection.vue';
import AnnotationFormAdditionalTextSection from './AnnotationFormAdditionalTextSection.vue';
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import FormPropertiesSection from './FormPropertiesSection.vue';

const props = defineProps<{
  annotation: Annotation;
}>();

const { annotation } = props;

const confirm = useConfirm();

const { isRedrawMode, redrawData, execCommand, toggleRedrawMode } = useEditorStore();
const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

const config: AnnotationType = getAnnotationConfig(annotation.data.properties.type);
// TODO: Maybe give whole config instead of only fields...?
const propertyFields: PropertyConfig[] = getAnnotationFields(annotation.data.properties.type);

const panelIsCollapsed = ref<boolean>(true);
const propertiesAreCollapsed = ref<boolean>(false);
const previewText = computed<string>(() => {
  const sliced: string = annotation.data.properties.text?.slice(0, 10);

  return annotation.data.properties.text?.length >= 10
    ? sliced + '...'
    : annotation.data.properties.text;
});
const redrawButtonicon = computed<string>(() =>
  redrawData.value?.direction === 'on' ? 'pi pi-times' : 'pi pi-pencil',
);
const redrawButtonTitle = computed<string>(() =>
  isRedrawMode.value ? 'Cancel redraw operation' : 'Redraw annotation',
);

function handleDeleteAnnotation(event: MouseEvent): void {
  if (annotation.isTruncated) {
    return;
  }

  confirm.require({
    target: event.currentTarget as HTMLButtonElement,
    message: 'Do you want to delete this annotation?',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
      title: 'Cancel',
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
      title: 'Delete annotation',
    },
    accept: () => execCommand('deleteAnnotation', { annotation }),
    reject: () => {},
  });
}

function handleRedraw(): void {
  if (isRedrawMode.value) {
    toggleRedrawMode(null);
  } else {
    toggleRedrawMode({
      direction: 'on',
      data: { annotationUuid: annotation.data.properties.uuid },
    });
  }
}

function handleShiftLeft(): void {
  execCommand('shiftAnnotationLeft', { annotation });
}

function handleShiftRight(): void {
  execCommand('shiftAnnotationRight', { annotation });
}

function handleExpand(): void {
  execCommand('expandAnnotation', { annotation });
}

function handleShrink(): void {
  execCommand('shrinkAnnotation', { annotation });
}
</script>

<template>
  <Panel
    class="annotation-form mb-3"
    :data-annotation-uuid="annotation.data.properties.uuid"
    toggleable
    @update:collapsed="panelIsCollapsed = !panelIsCollapsed"
    :collapsed="panelIsCollapsed"
    :toggle-button-props="{
      severity: 'secondary',
      title: 'Toggle full view',
      rounded: true,
      text: true,
    }"
  >
    <template #header>
      <div class="flex items-center gap-1 align-items-center">
        <div class="icon-container">
          <AnnotationTypeIcon
            :annotationType="annotation.data.properties.subType ?? annotation.data.properties.type"
          />
        </div>
        <div class="annotation-type-container">
          <span class="font-bold">{{
            annotation.data.properties.subType ?? annotation.data.properties.type
          }}</span>
        </div>
        <div class="preview font-italic text-xs" :title="annotation.data.properties.text">
          {{ previewText }}
        </div>
        <div
          class="spy pi pi-eye cursor-pointer"
          title="Show annotated text"
          @mouseover="toggleTextHightlighting(annotation, 'on')"
          @mouseleave="toggleTextHightlighting(annotation, 'off')"
        ></div>
      </div>
      <div v-if="annotation.isTruncated" class="truncated-indicator">
        <Tag
          severity="warn"
          title="Annotation extends beyond the displayed text snippet"
          value="Truncated"
        ></Tag>
      </div>
    </template>
    <template #toggleicon="{ collapsed }">
      <i :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></i>
    </template>
    <Fieldset
      v-if="!panelIsCollapsed"
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
        v-model="annotation.data.properties"
        :fields="propertyFields"
        mode="edit"
      />
    </Fieldset>
    <AnnotationFormAdditionalTextSection
      v-if="config.hasAdditionalTexts === true && !panelIsCollapsed"
      v-model="annotation.data.additionalTexts"
      :initial-additional-texts="annotation.initialData.additionalTexts"
      mode="edit"
    />
    <AnnotationFormEntitiesSection
      v-if="config.hasEntities === true && !panelIsCollapsed"
      v-model="annotation.data.entities"
      mode="edit"
      :default-search-value="annotation.data.properties.text"
    />

    <div v-if="!panelIsCollapsed" class="edit-buttons flex justify-content-center">
      <Button
        icon="pi pi-angle-left"
        size="small"
        severity="secondary"
        rounded
        title="Move annotation left by one character"
        :disabled="annotation.isTruncated"
        @click="handleShiftLeft"
      />
      <Button
        icon="pi pi-angle-right"
        size="small"
        severity="secondary"
        rounded
        title="Move annotation right by one character"
        :disabled="annotation.isTruncated"
        @click="handleShiftRight"
      />
      <Button
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        rounded
        title="Expand annotation right by one character"
        :disabled="annotation.isTruncated || config.isZeroPoint"
        @click="handleExpand"
      />
      <Button
        icon="pi pi-minus"
        size="small"
        severity="secondary"
        rounded
        title="Shrink annotation from the right by one character"
        :disabled="annotation.isTruncated || config.isZeroPoint"
        @click="handleShrink"
      />
      <Button
        :icon="redrawButtonicon"
        :style="{ zIndex: 99999 }"
        size="small"
        severity="secondary"
        rounded
        :title="redrawButtonTitle"
        :disabled="annotation.isTruncated"
        @click="handleRedraw"
      />
    </div>
    <div v-if="!panelIsCollapsed" class="action-buttons flex justify-content-center">
      <Button
        label="Delete"
        title="Delete annotation"
        severity="danger"
        icon="pi pi-trash"
        size="small"
        :disabled="annotation.isTruncated"
        @click="handleDeleteAnnotation"
      />
    </div>
    <ConfirmPopup></ConfirmPopup>
  </Panel>
</template>

<style scoped>
.annotation-form {
  outline: 1px solid var(--p-primary-color);
}

.edited {
  background-color: rgb(191, 147, 77);
}

.deleted {
  background-color: red;
}

.existing {
  background-color: gray;
}

.preview.collapsed {
  --fade-start: 50%;
  max-height: 4rem;
  mask-image: linear-gradient(to bottom, white var(--fade-start), transparent);
  transition: max-height 500ms;
}

.preview.expanded {
  max-height: auto;
  max-height: calc-size(auto);
}

.created {
  background-color: lightgreen;
}

.icon-container {
  width: 20px;
  height: 20px;
}

.form-label {
  flex-basis: 10rem;
}

.highlight {
  background-color: yellow !important;
}

.hidden {
  display: none;
}
</style>
