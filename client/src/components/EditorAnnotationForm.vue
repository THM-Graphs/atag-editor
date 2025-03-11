<script setup lang="ts">
import { nextTick, Ref, ref, watch } from 'vue';
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
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import {
  Annotation,
  AnnotationProperty,
  AnnotationType,
  CollectionProperty,
} from '../models/types';
import IEntity from '../models/IEntity';
import InputGroup from 'primevue/inputgroup';
import ICollection from '../models/ICollection';
import IText from '../models/IText';

type NormdataEntry = IEntity & { html: string };

/**
 * Interface for relevant state information about each normdata category
 */
interface NormdataSearchObject {
  [key: string]: {
    fetchedItems: NormdataEntry[] | string[];
    nodeLabel: string;
    currentItem: NormdataEntry | null;
    mode: 'edit' | 'view';
    elm: Ref<any>;
  };
}

/**
 * Interface for relevant state information about additional texts of the annotation
 */
interface AdditionalTextInputObject {
  availableLabels: string[];
  inputElm: Ref<any>;
  inputLabel: string;
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
const fields: AnnotationProperty[] = getAnnotationFields(annotation.data.properties.type);

const propertiesAreCollapsed = ref<boolean>(false);
const normdataAreCollapsed = ref<boolean>(false);
const additionalTextIsCollapsed = ref<boolean>(false);
const normdataCategories: string[] = guidelines.value.annotations.resources.map(r => r.category);

const normdataSearchObject = ref<NormdataSearchObject>(
  normdataCategories.reduce((object: NormdataSearchObject, category) => {
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

const additionalTextInputObject = ref<AdditionalTextInputObject>({
  inputText: '',
  availableLabels: guidelines.value.annotations.additionalTexts,
  inputLabel: guidelines.value.annotations.additionalTexts[0],
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
      if (!additionalTextStatusObject.value.has(text.data.collection.uuid)) {
        additionalTextStatusObject.value.set(text.data.collection.uuid, 'collapsed');
      }
    });

    // Remove texts that no longer exist
    if (oldTexts) {
      oldTexts.forEach(text => {
        if (!newTexts.some(newText => newText.data.collection.uuid === text.data.collection.uuid)) {
          additionalTextStatusObject.value.delete(text.data.collection.uuid);
        }
      });
    }
  },
  { deep: true, immediate: true },
);

/**
 * Adds a normdata item to the specified category in the annotation's data.
 *
 * @param {NormdataEntry} item - The normdata item to be added.
 */
function addNormdataItem(item: NormdataEntry, category: string): void {
  // Omit 'html' property from entry since it was only created for rendering purposes
  const { html, ...rest } = item;
  annotation.data.normdata[category].push(rest);
}

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
 * Changes the mode of the normdata search component for the given category. This triggers
 * re-renders in the template.
 *
 * - If set to `view`, the search bar will be hidden and its related state variables reset.
 * - If set to `edit`, the search bar will be shown and and focused.
 *
 * @param {string} category - The category for which the mode should be changed.
 * @param {'view' | 'edit'} mode - The new mode.
 */
function changeNormdataSelectionMode(category: string, mode: 'view' | 'edit'): void {
  normdataSearchObject.value[category].mode = mode;

  if (mode === 'view') {
    normdataSearchObject.value[category].currentItem = null;

    return;
  }

  // Wait for DOM to update before trying to focus the element
  nextTick(() => {
    // TODO: A bit hacky, replace this when upgraded to Vue 3.5?
    // The normdataSearchObject's "elm" property is an one-entry-array with the referenced primevue components
    // that holds the component. Is an array because since the refs are set in a loop in the template
    const elm = normdataSearchObject.value[category].elm[0];

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

/**
 * Handles the selection of a normdata item by adding it to the annotation and resetting the search component.
 *  Called on selection of an item from the autocomplete dropdown pane.
 *
 * @param {NormdataEntry} item - The normdata item to be added.
 * @param {string} category - The category to which the item should be added.
 */
function handleNormdataItemSelect(item: NormdataEntry, category: string): void {
  addNormdataItem(item, category);
  changeNormdataSelectionMode(category, 'view');
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
 * Removes a normdata item from the given category in the annotation's data.
 *
 * @param {NormdataEntry} item - The normdata item to be removed.
 * @param {string} category - The category from which the item should be removed.
 */
function removeNormdataItem(item: NormdataEntry, category: string): void {
  annotation.data.normdata[category] = annotation.data.normdata[category].filter(
    entry => entry.uuid !== item.uuid,
  );
}

/**
 * Replaces all occurrences of a search string in a given text with a highlighted HTML
 * equivalent. If the search string is empty, the original text is returned.
 *
 * @param {string} text - The text in which the search string should be found.
 * @param {string} searchStr - The string to be searched for.
 *
 * @returns {string} The text with all occurrences of the search string highlighted.
 */
function renderHTML(text: string, searchStr: string): string {
  if (searchStr !== '') {
    const regex: RegExp = new RegExp(`(${searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

    return text.replace(regex, '<span style="background-color: yellow">$1</span>');
  }

  return text;
}

/**
 * Fetches normdata items from the server whose's label matches the given search string and stores the results
 * in the corresponding normdataSearchObject entry.
 *
 * @param {string} searchString - The string to be searched for.
 * @param {string} category - The category for which the search should be performed.
 */
async function searchNormdataOptions(searchString: string, category: string): Promise<void> {
  const nodeLabel: string = normdataSearchObject.value[category].nodeLabel;
  const url: string = buildFetchUrl(`/api/resources?node=${nodeLabel}&searchStr=${searchString}`);

  const response: Response = await fetch(url);

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const fetchedNormdata: NormdataEntry[] = await response.json();

  // Show only entries that are not already part of the annotation
  const existingUuids: string[] = annotation.data.normdata[category].map(
    (entry: NormdataEntry) => entry.uuid,
  );

  const withoutDuplicates: NormdataEntry[] = fetchedNormdata.filter(
    (entry: NormdataEntry) => !existingUuids.includes(entry.uuid),
  );

  // Store HTML directly in prop to prevent unnecessary, primevue-enforced re-renders during hover
  const withHtml = withoutDuplicates.map((entry: NormdataEntry) => ({
    ...entry,
    html: renderHTML(entry.label, searchString),
  }));

  normdataSearchObject.value[category].fetchedItems = withHtml;
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
  // TODO: This should be dynamic since the key is not always 'comment'
  const defaultFields: CollectionProperty[] = getCollectionConfigFields(['Comment']);
  const newCollectionProperties: ICollection = {} as ICollection;

  defaultFields.forEach((field: CollectionProperty) => {
    // TODO: Is this needed? Or should Collection Properties always be text?
    switch (field.type) {
      case 'text':
        newCollectionProperties[field.name] = '';
        break;
      default:
        newCollectionProperties[field.name] = '';
    }
  });

  annotation.data.additionalTexts.push({
    nodeLabel: additionalTextInputObject.value.inputLabel,
    data: {
      collection: {
        ...newCollectionProperties,
        uuid: crypto.randomUUID(),
        label: `${additionalTextInputObject.value.inputLabel} for annotation ${annotation.data.properties.uuid}`,
      } as ICollection,
      text: {
        uuid: crypto.randomUUID(),
        text: additionalTextInputObject.value.inputText,
      } as IText,
    },
  });

  additionalTextInputObject.value.inputLabel = additionalTextInputObject.value.availableLabels[0];
  additionalTextInputObject.value.inputText = '';

  changeAdditionalTextSelectionMode('view');
}

function cancelAdditionalTextOperation() {
  additionalTextInputObject.value.inputLabel = additionalTextInputObject.value.availableLabels[0];
  additionalTextInputObject.value.inputText = '';

  changeAdditionalTextSelectionMode('view');
}

function handleDeleteAdditionalText(collectionUuid: string): void {
  annotation.data.additionalTexts = annotation.data.additionalTexts.filter(
    t => t.data.collection.uuid !== collectionUuid,
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
      <!-- TODO: Make "id" attributes unique -->
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
      v-if="config.hasNormdata === true"
      legend="Normdata"
      :toggleable="true"
      :toggle-button-props="{
        title: `${propertiesAreCollapsed ? 'Expand' : 'Collapse'} normdata`,
      }"
      @toggle="normdataAreCollapsed = !normdataAreCollapsed"
    >
      <template #toggleicon>
        <span :class="`pi pi-chevron-${normdataAreCollapsed ? 'down' : 'up'}`"></span>
      </template>
      <div v-for="category in normdataCategories">
        <p class="font-bold">{{ camelCaseToTitleCase(category) }}:</p>
        <div
          class="normdata-entry flex justify-content-between align-items-center"
          v-for="entry in annotation.data.normdata[category]"
        >
          <span>
            {{ entry.label }}
          </span>
          <Button
            icon="pi pi-times"
            size="small"
            severity="danger"
            @click="removeNormdataItem(entry as NormdataEntry, category)"
          ></Button>
        </div>
        <Button
          v-show="normdataSearchObject[category].mode === 'view'"
          class="mt-2 w-full h-2rem"
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          label="Add item"
          :disabled="annotation.isTruncated"
          @click="changeNormdataSelectionMode(category, 'edit')"
        />
        <AutoComplete
          v-show="normdataSearchObject[category].mode === 'edit'"
          v-model="normdataSearchObject[category].currentItem"
          dropdown
          dropdownMode="current"
          :placeholder="`Type to see suggestions`"
          :suggestions="normdataSearchObject[category].fetchedItems"
          :overlayClass="normdataSearchObject[category].mode === 'view' ? 'hidden' : ''"
          optionLabel="label"
          class="mt-2 w-full h-2rem"
          variant="filled"
          :ref="`input-${category}`"
          input-class="w-full"
          @complete="searchNormdataOptions($event.query, category)"
          @option-select="handleNormdataItemSelect($event.value, category)"
        >
          <template #header v-if="normdataSearchObject[category].fetchedItems.length > 0">
            <div class="font-medium px-3 py-2">
              {{ normdataSearchObject[category].fetchedItems.length }} Results
            </div>
          </template>
          <template #option="slotProps">
            <span v-html="slotProps.option.html" :title="slotProps.option.label"></span>
          </template>
        </AutoComplete>
      </div>
    </Fieldset>
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
        :key="additionalText.data.collection.uuid"
      >
        <div class="additional-text-entry">
          <div
            class="additional-text-header flex justify-content-between align-items-center font-semibold"
          >
            <span>
              {{ camelCaseToTitleCase(additionalText.nodeLabel) }}
            </span>
            <Button
              icon="pi pi-times"
              severity="danger"
              title="Remove this text from annotation"
              @click="handleDeleteAdditionalText(additionalText.data.collection.uuid)"
            />
          </div>
          <div class="flex align-items-center gap-2 overflow">
            <a
              :href="`/texts/${additionalText.data.text.uuid}`"
              title="Open text in new editor tab"
              class="flex align-items-center gap-1"
              target="_blank"
            >
              <div
                :class="`preview ${additionalTextStatusObject.get(additionalText.data.collection.uuid)}`"
              >
                {{ additionalText.data.text.text }}
              </div>
              <i class="pi pi-external-link"></i>
            </a>
          </div>
          <Button
            :icon="
              additionalTextStatusObject.get(additionalText.data.collection.uuid) === 'collapsed'
                ? 'pi pi-angle-double-down'
                : 'pi pi-angle-double-up'
            "
            severity="secondary"
            size="small"
            class="w-full"
            :title="
              additionalTextStatusObject.get(additionalText.data.collection.uuid) === 'collapsed'
                ? 'Show full text'
                : 'Hide full text'
            "
            @click="toggleAdditionalTextPreviewMode(additionalText.data.collection.uuid)"
          />
          <Message
            v-if="
              !annotation.initialData.additionalTexts
                .map(t => t.data.collection.uuid)
                .includes(additionalText.data.collection.uuid)
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
            <Select
              v-model="additionalTextInputObject.inputLabel"
              :options="additionalTextInputObject.availableLabels"
              title="Select label of new text"
              placeholder="Choose a label"
            />
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

.button-icon {
  object-fit: contain;
}

.form-label {
  flex-basis: 10rem;
}

.additional-text-header {
  cursor: default;
}

.normdata-entry,
.additional-text-entry {
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

.hidden {
  display: none;
}
</style>
