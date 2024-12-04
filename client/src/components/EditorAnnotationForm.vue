<script setup lang="ts">
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { useEditorStore } from '../store/editor';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize, toggleTextHightlighting } from '../utils/helper/helper';
import iconsMap from '../utils/helper/icons';
import Button from 'primevue/button';
import ConfirmPopup from 'primevue/confirmpopup';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { Annotation, AnnotationProperty, AnnotationType } from '../models/types';

const props = defineProps<{
  annotation: Annotation;
}>();

const { annotation } = props;

const confirm = useConfirm();

const {
  deleteAnnotation,
  expandAnnotation,
  getAnnotationInfo,
  shiftAnnotationLeft,
  shiftAnnotationRight,
  shrinkAnnotation,
} = useAnnotationStore();
const { removeAnnotationFromCharacters } = useCharactersStore();
const { newRangeAnchorUuid } = useEditorStore();
const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

const config: AnnotationType = getAnnotationConfig(annotation.data.properties.type);
const fields: AnnotationProperty[] = getAnnotationFields(annotation.data.properties.type);
const metadataCategories: string[] = config.metadata;

function handleDeleteAnnotation(event: MouseEvent, uuid: string) {
  confirm.require({
    target: event.currentTarget as HTMLButtonElement,
    message: 'Do you want to delete this annotation?',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
    },
    accept: () => {
      deleteAnnotation(uuid);
      removeAnnotationFromCharacters(uuid);
    },
    reject: () => {},
  });
}

function handleShiftLeft(): void {
  shiftAnnotationLeft(annotation);
  setRangeAnchorAtEnd();
}

function handleShiftRight(): void {
  shiftAnnotationRight(annotation);
  setRangeAnchorAtEnd();
}

function handleExpand(): void {
  expandAnnotation(annotation);
  setRangeAnchorAtEnd();
}

function handleShrink(): void {
  shrinkAnnotation(annotation);
  setRangeAnchorAtEnd();
}

function setRangeAnchorAtEnd(): void {
  const { lastCharacter } = getAnnotationInfo(annotation);
  newRangeAnchorUuid.value = lastCharacter.data.uuid;
}
</script>

<template>
  <Panel
    class="annotation-form mb-3"
    :data-annotation-uuid="annotation.data.properties.uuid"
    toggleable
    :collapsed="true"
  >
    <template #header>
      <div class="flex items-center gap-1 align-items-center">
        <div class="icon-container">
          <img
            :src="`${iconsMap[annotation.data.properties.type]}`"
            class="button-icon w-full h-full"
          />
        </div>
        <div class="annotation-type-container">
          <span class="font-bold">{{ annotation.data.properties.type }}</span>
        </div>
        <div
          class="spy pi pi-eye cursor-pointer"
          @mouseover="toggleTextHightlighting(annotation, 'on')"
          @mouseleave="toggleTextHightlighting(annotation, 'off')"
        ></div>
      </div>
      <div v-if="annotation.isTruncated" class="truncated-indicator">
        <Tag severity="warn" value="Truncated"></Tag>
      </div>
    </template>
    <!-- TODO: Make "id" attributes unique -->
    <form>
      <div class="input-container" v-for="field in fields" :key="field.name" v-show="field.visible">
        <div class="flex align-items-center gap-3 mb-3" v-show="field.visible">
          <label :for="field.name" class="w-10rem font-semibold"
            >{{ capitalize(field.name) }}
          </label>
          <InputText
            v-if="field.type === 'text'"
            :id="field.name"
            :disabled="!field.editable"
            :required="field.required"
            :invalid="field.required && !annotation.data.properties[field.name]"
            v-model="annotation.data.properties[field.name]"
            class="flex-auto w-full"
            spellcheck="false"
          />
          <Textarea
            v-else-if="field.type === 'textarea'"
            :id="field.name"
            :disabled="!field.editable"
            :required="field.required"
            :invalid="field.required && !annotation.data.properties[field.name]"
            v-model="annotation.data.properties[field.name]"
            cols="30"
            rows="5"
            class="flex-auto w-full"
          />
          <Select
            v-else-if="field.type === 'selection'"
            :id="field.name"
            :disabled="!field.editable"
            :required="field.required"
            :invalid="field.required && !annotation.data.properties[field.name]"
            v-model="annotation.data.properties[field.name]"
            :options="field.options"
            :placeholder="`Select ${field.name}`"
            class="flex-auto w-full"
          />
          <!-- <Checkbox
          v-else-if="field.type === 'checkbox'"
          v-model="annotation.data.properties[field.name]"
          :inputId="field.name"
          :name="field.name"
          :value="annotation.data.properties[field.name]"
          /> -->
          <!-- TODO: Primevue checkboxes work differently... -> create own component or match styling -->
          <input
            v-else-if="field.type === 'checkbox'"
            v-model="annotation.data.properties[field.name]"
            type="checkbox"
            :id="field.name"
            :name="field.name"
            :style="{ width: '15px', height: '15px', cursor: 'pointer' }"
          />
          <div v-else class="default-field">
            {{ annotation.data.properties[field.name] }}
          </div>
        </div>
      </div>
    </form>
    <hr />
    Metadata:
    <div v-for="category in metadataCategories">
      <p class="font-bold">{{ category }}:</p>
      <ul>
        <li v-for="entry in annotation.data.metadata[category]">
          {{ entry.label }}
        </li>
      </ul>
    </div>
    <div class="edit-buttons flex justify-content-center">
      <Button
        icon="pi pi-angle-left"
        size="small"
        severity="secondary"
        rounded
        :disabled="annotation.isTruncated"
        @click="handleShiftLeft"
      />
      <Button
        icon="pi pi-angle-right"
        size="small"
        severity="secondary"
        rounded
        :disabled="annotation.isTruncated"
        @click="handleShiftRight"
      />
      <Button
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        rounded
        :disabled="annotation.isTruncated || config.isZeroPoint"
        @click="handleExpand"
      />
      <Button
        icon="pi pi-minus"
        size="small"
        severity="secondary"
        rounded
        :disabled="annotation.isTruncated || config.isZeroPoint"
        @click="handleShrink"
      />
    </div>
    <div class="action-buttons flex justify-content-center">
      <Button
        label="Delete"
        severity="danger"
        icon="pi pi-trash"
        size="small"
        @click="handleDeleteAnnotation($event, annotation.data.properties.uuid)"
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

.created {
  background-color: lightgreen;
}

.icon-container {
  width: 20px;
  height: 20px;
}

.button-icon {
  object-fit: contain;
}
</style>
