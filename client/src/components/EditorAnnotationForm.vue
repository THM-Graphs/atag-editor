<script setup lang="ts">
import { nextTick, Ref, ref, watch } from 'vue';
import { templateRef } from '@vueuse/core';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { useEditorStore } from '../store/editor';
import { useGuidelinesStore } from '../store/guidelines';
import {
  camelCaseToTitleCase,
  getDefaultValueForProperty,
  toggleTextHightlighting,
} from '../utils/helper/helper';
import Button from 'primevue/button';
import ConfirmPopup from 'primevue/confirmpopup';
import InputText from 'primevue/inputtext';
import Fieldset from 'primevue/fieldset';
import Message from 'primevue/message';
import { MultiSelect } from 'primevue';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { Annotation, AnnotationType, PropertyConfig } from '../models/types';
import InputGroup from 'primevue/inputgroup';
import ICollection from '../models/ICollection';
import IText from '../models/IText';
import AnnotationFormNormdataSection from './AnnotationFormNormdataSection.vue';
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import DataInputComponent from '../components/DataInputComponent.vue';
import DataInputGroup from '../components/DataInputGroup.vue';

/**
 * Interface for relevant state information about additional texts of the annotation
 */
interface AdditionalTextInputObject {
  availableLabels: string[];
  inputElm: Ref<any>;
  inputLabels: string[];
  inputText: string;
  mode: 'edit' | 'view';
}

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
const { guidelines, getAnnotationConfig, getAnnotationFields, getCollectionConfigFields } =
  useGuidelinesStore();

const config: AnnotationType = getAnnotationConfig(annotation.data.properties.type);
const fields: PropertyConfig[] = getAnnotationFields(annotation.data.properties.type);

const propertiesAreCollapsed = ref<boolean>(false);
const additionalTextIsCollapsed = ref<boolean>(false);

const additionalTextInputObject = ref<AdditionalTextInputObject>({
  inputText: '',
  availableLabels: guidelines.value.annotations.additionalTexts,
  inputLabels: [],
  mode: 'view',
  inputElm: templateRef('additional-text-input'),
});

// Used for toggling additional text preview mode. Bit hacky for now, but works.
const additionalTextStatusObject = ref<Map<string, 'collapsed' | 'expanded'>>(new Map());

watch(
  () => annotation.data.additionalTexts,
  (newTexts, oldTexts) => {
    // Add new text if it doesn't already exist
    newTexts.forEach(text => {
      if (!additionalTextStatusObject.value.has(text.collection.data.uuid)) {
        additionalTextStatusObject.value.set(text.collection.data.uuid, 'collapsed');
      }
    });

    // Remove texts that no longer exist
    if (oldTexts) {
      oldTexts.forEach(text => {
        if (!newTexts.some(newText => newText.collection.data.uuid === text.collection.data.uuid)) {
          additionalTextStatusObject.value.delete(text.collection.data.uuid);
        }
      });
    }
  },
  { deep: true, immediate: true },
);

function changeAdditionalTextSelectionMode(mode: 'view' | 'edit'): void {
  additionalTextInputObject.value.mode = mode;

  if (mode === 'view') {
    return;
  }

  // // Wait for DOM to update before trying to focus the element
  nextTick(() => {
    // TODO: A bit hacky, replace this when upgraded to Vue 3.5?
    const inputElm: HTMLInputElement | null = additionalTextInputObject.value.inputElm.$el;

    if (!inputElm) {
      console.warn('Focus failed: Element not found');
      return;
    }

    inputElm.focus();
  });
}

/**
 * Finishes an additional text input operation one way or another (submit or cancel).
 * This resets the form and changes the mode to 'view'.
 *
 * @returns {void} This function does not return any value.
 */
function finishAdditionalTextInputOperation(): void {
  resetAdditionalTextInputForm();
  changeAdditionalTextSelectionMode('view');
}

function handleDeleteAnnotation(event: MouseEvent, uuid: string): void {
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

/**
 * Resets the additional text input form (select input and text input). This prepares the form for new input.
 * Called when the form is submitted or cancelled.
 *
 * @returns {void} This function does not return any value.
 */
function resetAdditionalTextInputForm(): void {
  additionalTextInputObject.value.inputLabels = [];
  additionalTextInputObject.value.inputText = '';
}

function setRangeAnchorAtEnd(): void {
  const { lastCharacter } = getAnnotationInfo(annotation);
  newRangeAnchorUuid.value = lastCharacter.data.uuid;
}

/**
 * Toggles the view modeof an additional text entry. By default, the whole text is shown as preview to keep
 * the form compact, but can be expanded on button click.
 *
 * @param {string} uuid - The UUID of the additional text for which the mode should be toggled.
 */
function toggleAdditionalTextPreviewMode(uuid: string): void {
  const currentViewMode: 'collapsed' | 'expanded' = additionalTextStatusObject.value.get(uuid);
  additionalTextStatusObject.value.set(
    uuid,
    currentViewMode === 'collapsed' ? 'expanded' : 'collapsed',
  );
}

function addAdditionalText(): void {
  const nodeLabels: string[] = additionalTextInputObject.value.inputLabels;
  const defaultFields: PropertyConfig[] = getCollectionConfigFields(nodeLabels);
  const newCollectionProperties: ICollection = {} as ICollection;

  defaultFields.forEach((field: PropertyConfig) => {
    newCollectionProperties[field.name] =
      field?.required === true ? getDefaultValueForProperty(field.type) : null;
  });

  annotation.data.additionalTexts.push({
    collection: {
      nodeLabels,
      data: {
        ...newCollectionProperties,
        uuid: crypto.randomUUID(),
        label: `${nodeLabels.join(' | ')} for annotation ${annotation.data.properties.uuid}`,
      } as ICollection,
    },
    text: {
      // TODO: Text node labels should be made selectable too in the future
      nodeLabels: [],
      data: {
        uuid: crypto.randomUUID(),
        text: additionalTextInputObject.value.inputText,
      } as IText,
    },
  });

  finishAdditionalTextInputOperation();
}

function cancelAdditionalTextOperation(): void {
  finishAdditionalTextInputOperation();
}

function handleDeleteAdditionalText(collectionUuid: string): void {
  annotation.data.additionalTexts = annotation.data.additionalTexts.filter(
    t => t.collection.data.uuid !== collectionUuid,
  );
}
</script>

<template>
  <Panel
    class="annotation-form mb-3"
    :data-annotation-uuid="annotation.data.properties.uuid"
    toggleable
    :collapsed="true"
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
          <AnnotationTypeIcon :annotationType="annotation.data.properties.type" />
        </div>
        <div class="annotation-type-container">
          <span class="font-bold">{{ annotation.data.properties.type }}</span>
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
      <form>
        <div
          v-for="field in fields"
          :key="field.name"
          class="flex align-items-center gap-3 mb-3"
          v-show="field.visible"
        >
          <label :for="field.name" class="form-label font-semibold"
            >{{ camelCaseToTitleCase(field.name) }}
          </label>
          <DataInputGroup
            v-if="field.type === 'array'"
            v-model="annotation.data.properties[field.name]"
            :config="field"
          />
          <DataInputComponent
            v-else
            v-model="annotation.data.properties[field.name]"
            :config="field"
          />
        </div>
      </form>
    </Fieldset>
    <AnnotationFormNormdataSection
      v-if="config.hasNormdata === true"
      v-model="annotation.data.normdata"
    />
    <Fieldset
      v-if="config.hasAdditionalTexts === true"
      legend="Additional texts"
      :toggle-button-props="{
        title: `${propertiesAreCollapsed ? 'Expand' : 'Collapse'} additional texts`,
      }"
      :toggleable="true"
      @toggle="additionalTextIsCollapsed = !additionalTextIsCollapsed"
    >
      <template #toggleicon>
        <span :class="`pi pi-chevron-${additionalTextIsCollapsed ? 'down' : 'up'}`"></span>
      </template>
      <template
        v-for="additionalText in annotation.data.additionalTexts"
        :key="additionalText.collection.data.uuid"
      >
        <div class="additional-text-entry">
          <div class="additional-text-header flex justify-content-between align-items-center">
            <span v-if="additionalText.collection.nodeLabels.length > 0" class="font-semibold">{{
              additionalText.collection.nodeLabels
                .map((l: string) => camelCaseToTitleCase(l))
                .join(' | ')
            }}</span>
            <span v-else class="font-italic"> No label provided yet... </span>
            <Button
              icon="pi pi-times"
              severity="danger"
              title="Remove this text from annotation"
              @click="handleDeleteAdditionalText(additionalText.collection.data.uuid)"
            />
          </div>
          <div class="flex align-items-center gap-2 overflow">
            <a
              :href="`/texts/${additionalText.text.data.uuid}`"
              title="Open text in new editor tab"
              class="flex align-items-center gap-1"
              target="_blank"
            >
              <div
                :class="`preview ${additionalTextStatusObject.get(additionalText.collection.data.uuid)}`"
              >
                {{ additionalText.text.data.text }}
              </div>
              <i class="pi pi-external-link"></i>
            </a>
          </div>
          <Button
            :icon="
              additionalTextStatusObject.get(additionalText.collection.data.uuid) === 'collapsed'
                ? 'pi pi-angle-double-down'
                : 'pi pi-angle-double-up'
            "
            severity="secondary"
            size="small"
            class="w-full"
            :title="
              additionalTextStatusObject.get(additionalText.collection.data.uuid) === 'collapsed'
                ? 'Show full text'
                : 'Hide full text'
            "
            @click="toggleAdditionalTextPreviewMode(additionalText.collection.data.uuid)"
          />
          <Message
            v-if="
              !annotation.initialData.additionalTexts
                .map(t => t.collection.data.uuid)
                .includes(additionalText.collection.data.uuid)
            "
            severity="warn"
          >
            Save changes to edit new text...
          </Message>
        </div>

        <hr />
      </template>
      <div>
        <Button
          v-show="additionalTextInputObject.mode === 'view'"
          class="mt-2 w-full h-2rem"
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          label="Add text"
          title="Add new additional text entry"
          :disabled="annotation.isTruncated"
          @click="changeAdditionalTextSelectionMode('edit')"
        />
        <form
          v-show="additionalTextInputObject.mode === 'edit'"
          @submit.prevent="addAdditionalText"
        >
          <InputGroup>
            <MultiSelect
              v-model="additionalTextInputObject.inputLabels"
              :options="additionalTextInputObject.availableLabels"
              display="chip"
              placeholder="Select collection labels"
              class="text-center"
              :filter="false"
            >
              <template #chip="{ value }">
                <Tag :value="value" severity="contrast" class="mr-1" />
              </template>
            </MultiSelect>
            <InputText
              ref="additional-text-input"
              required
              v-model="additionalTextInputObject.inputText"
              placeholder="Enter text"
              title="Enter text"
            />
            <Button
              type="submit"
              icon="pi pi-check"
              severity="secondary"
              size="small"
              title="Add new text"
            />
            <Button
              type="button"
              icon="pi pi-times"
              severity="secondary"
              size="small"
              title="Cancel"
              @click="cancelAdditionalTextOperation"
            />
          </InputGroup>
        </form>
      </div>
    </Fieldset>
    <div class="edit-buttons flex justify-content-center">
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
    </div>
    <div class="action-buttons flex justify-content-center">
      <Button
        label="Delete"
        title="Delete annotation"
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

.x {
  background-color: white;
  outline: 0;

  &:not(:hover) {
    border-color: transparent;
  }
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

.additional-text-header {
  cursor: default;
}

.highlight {
  background-color: yellow !important;
}

.hidden {
  display: none;
}
</style>
