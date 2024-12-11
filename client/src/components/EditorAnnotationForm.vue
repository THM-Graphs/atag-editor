<script setup lang="ts">
import { nextTick, Ref, ref } from 'vue';
import { templateRef } from '@vueuse/core';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { useEditorStore } from '../store/editor';
import { useGuidelinesStore } from '../store/guidelines';
import {
  buildFetchUrl,
  camelCaseToTitleCase,
  toggleTextHightlighting,
} from '../utils/helper/helper';
import iconsMap from '../utils/helper/icons';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import ConfirmPopup from 'primevue/confirmpopup';
import InputText from 'primevue/inputtext';
import Fieldset from 'primevue/fieldset';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { Annotation, AnnotationProperty, AnnotationType } from '../models/types';
import IActorRole from '../models/IActorRole';
import IConcept from '../models/IConcept';
import IEntity from '../models/IEntity';

type MetadataEntry = IActorRole & IConcept & IEntity & { html: string };

/**
 * Interface for relevant state information about each metadata category
 */
interface MetadataSearchObject {
  [key: string]: {
    fetchedItems: MetadataEntry[] | string[];
    nodeLabel: string;
    currentItem: MetadataEntry | null;
    mode: 'edit' | 'view';
    elm: Ref<any>;
  };
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
const { guidelines, getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

const config: AnnotationType = getAnnotationConfig(annotation.data.properties.type);
const fields: AnnotationProperty[] = getAnnotationFields(annotation.data.properties.type);
const propertiesAreCollapsed = ref<boolean>(false);
const metadataAreCollapsed = ref<boolean>(false);
const metadataCategories: string[] = config.metadata ?? [];

const metadataSearchObject = ref<MetadataSearchObject>(
  metadataCategories.reduce((object: MetadataSearchObject, category) => {
    object[category] = {
      nodeLabel: guidelines.value.annotations.resources.find(r => r.category === category)
        .nodeLabel,
      fetchedItems: [],
      currentItem: null,
      mode: 'view',
      // TODO: Use useTemplateRef when upgraded to Vue 3.5
      elm: templateRef(`input-${category}`),
    };

    return object;
  }, {}),
);

function addMetadataItem(item: MetadataEntry, category: string): void {
  // console.log('Clicked item:', item, category);
  console.log(metadataSearchObject.value[category].currentItem);

  annotation.data.metadata[category].push(item);
  metadataSearchObject.value[category].currentItem = null;
  changeMetadataSelectionMode(category, 'view');
}

function changeMetadataSelectionMode(category: string, mode: 'view' | 'edit'): void {
  metadataSearchObject.value[category].mode = mode;
  // TODO: A bit hacky, replace this when upgraded to Vue 3.5?
  const elm = metadataSearchObject.value[category].elm[0];
  console.log(elm);

  if (mode === 'view') {
    return;
  }

  // Wait for DOM to update before trying to focus the element
  nextTick(() => {
    // The metadataSearchObject's "elm" property is an one-entry-array with the referenced primevue components
    // that holds the component. Is an array because since the refs are set in a loop in the template (TODO: Fix later, bit hacky)
    const elm = metadataSearchObject.value[category].elm[0];

    if (!elm) {
      console.warn(`Focus failed: Element not found for category "${category}"`);
      return;
    }

    const inputElement: HTMLInputElement = elm.$el?.querySelector('input');

    inputElement?.focus();
  });
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

function removeMetadataItem(item: MetadataEntry, category: string): void {
  annotation.data.metadata[category] = annotation.data.metadata[category].filter(
    entry => entry.uuid !== item.uuid,
  );
}

async function searchMetadataOptions(searchString: string, category: string): Promise<void> {
  console.log(searchString, category);
  const nodeLabel: string = metadataSearchObject.value[category].nodeLabel;
  const url: string = buildFetchUrl(`/api/resources?node=${nodeLabel}&searchStr=${searchString}`);

  const response: Response = await fetch(url);

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const fetchedMetadata: MetadataEntry[] = await response.json();

  // Show only entries that are not already part of the annotation
  const existingUuids: string[] = annotation.data.metadata[category].map(
    (entry: MetadataEntry) => entry.uuid,
  );
  const withoutDuplicates: MetadataEntry[] = fetchedMetadata.filter(
    (entry: MetadataEntry) => !existingUuids.includes(entry.uuid),
  );

  // Store HTML directly in prop to prevent unnecessary, primevue-enforced re-renders during hover
  const withHtml = withoutDuplicates.map((entry: MetadataEntry) => ({
    ...entry,
    html: renderHTML(entry.label, searchString),
  }));

  metadataSearchObject.value[category].fetchedItems = withHtml;
}

function setRangeAnchorAtEnd(): void {
  const { lastCharacter } = getAnnotationInfo(annotation);
  newRangeAnchorUuid.value = lastCharacter.data.uuid;
}

function renderHTML(text: string, searchStr: string): string {
  if (searchStr !== '') {
    const regex: RegExp = new RegExp(`(${searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

    return text.replace(regex, '<span style="background-color: yellow">$1</span>');
  }

  return text;
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
    <Fieldset
      legend="Properties"
      :toggleable="true"
      @toggle="propertiesAreCollapsed = !propertiesAreCollapsed"
    >
      <template #toggleicon>
        <span :class="`pi pi-chevron-${propertiesAreCollapsed ? 'down' : 'up'}`"></span>
      </template>
      <!-- TODO: Make "id" attributes unique -->
      <form>
        <div
          v-for="field in fields"
          :key="field.name"
          class="flex align-items-center gap-3 mb-3"
          v-show="field.visible"
        >
          <label :for="field.name" class="w-10rem font-semibold"
            >{{ camelCaseToTitleCase(field.name) }}
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
      </form>
    </Fieldset>
    <Fieldset
      v-if="config.metadata"
      legend="Metadata"
      :toggleable="true"
      @toggle="metadataAreCollapsed = !metadataAreCollapsed"
    >
      <template #toggleicon>
        <span :class="`pi pi-chevron-${metadataAreCollapsed ? 'down' : 'up'}`"></span>
      </template>
      <div v-for="category in metadataCategories">
        <p class="font-bold">{{ camelCaseToTitleCase(category) }}:</p>
        <div
          class="metadata-entry flex justify-content-between align-items-center"
          v-for="entry in annotation.data.metadata[category]"
        >
          <span>
            {{ entry.label }}
          </span>
          <Button
            icon="pi pi-times"
            size="small"
            severity="danger"
            @click="removeMetadataItem(entry as MetadataEntry, category)"
          ></Button>
        </div>
        <Button
          v-show="metadataSearchObject[category].mode === 'view'"
          class="mt-2 w-full h-2rem"
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          label="Add item"
          :disabled="annotation.isTruncated"
          @click="changeMetadataSelectionMode(category, 'edit')"
        />
        <AutoComplete
          v-show="metadataSearchObject[category].mode === 'edit'"
          v-model="metadataSearchObject[category].currentItem"
          dropdown
          dropdownMode="current"
          :placeholder="`Type to see suggestions`"
          :suggestions="metadataSearchObject[category].fetchedItems"
          optionLabel="label"
          class="mt-2 w-full h-2rem"
          variant="filled"
          :ref="`input-${category}`"
          :overlayClass="metadataSearchObject[category].mode === 'view' ? 'hidden' : ''"
          input-class="w-full"
          @complete="searchMetadataOptions($event.query, category)"
          @option-select="addMetadataItem($event.value, category)"
        >
          <template #header v-if="metadataSearchObject[category].fetchedItems.length > 0">
            <div class="font-medium px-3 py-2">
              {{ metadataSearchObject[category].fetchedItems.length }} Results
            </div>
          </template>
          <template #option="slotProps">
            <span v-html="slotProps.option.html"></span>
          </template>
        </AutoComplete>
      </div>
    </Fieldset>
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

.button-icon {
  object-fit: contain;
}

.metadata-entry {
  border: 1px solid gray;
  border-radius: 5px;
  margin-bottom: 0.5rem;
  padding: 0.5rem;

  & button {
    width: 1rem;
    height: 1rem;
    padding: 10px;
  }
}

.highlight {
  background-color: yellow !important;
}
</style>
