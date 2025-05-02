<script setup lang="ts">
import { nextTick, Ref, ref } from 'vue';
import { templateRef } from '@vueuse/core';
import { useGuidelinesStore } from '../store/guidelines';
import { buildFetchUrl, camelCaseToTitleCase } from '../utils/helper/helper';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Fieldset from 'primevue/fieldset';
import IEntity from '../models/IEntity';

/**
 *  Enriches normdata item with an html key that contains the highlighted parts of the node label
 * */
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

const normdata = defineModel<{
  [index: string]: IEntity[];
}>();

const props = defineProps<{
  mode?: 'edit' | 'view';
}>();

const { guidelines, getAvailableAnnotationResourceConfigs } = useGuidelinesStore();

const normdataCategories: string[] = getAvailableAnnotationResourceConfigs().map(c => c.category);

const normdataAreCollapsed = ref<boolean>(false);
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

/**
 * Adds a normdata item to the specified category in the annotation's data.
 *
 * @param {NormdataEntry} item - The normdata item to be added.
 */
function addNormdataItem(item: NormdataEntry, category: string): void {
  // Omit 'html' property from entry since it was only created for rendering purposes
  const { html, ...rest } = item;
  normdata.value[category].push(rest);
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

/**
 * Removes a normdata item from the given category in the annotation's data.
 *
 * @param {NormdataEntry} item - The normdata item to be removed.
 * @param {string} category - The category from which the item should be removed.
 */
function removeNormdataItem(item: NormdataEntry, category: string): void {
  normdata.value[category] = normdata.value[category].filter(entry => entry.uuid !== item.uuid);
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
  const existingUuids: string[] = normdata.value[category].map(
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
</script>

<template>
  <Fieldset
    legend="Normdata"
    :toggleable="true"
    :toggle-button-props="{
      title: `${normdataAreCollapsed ? 'Expand' : 'Collapse'} normdata`,
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
        v-for="entry in normdata[category]"
      >
        <span>
          {{ entry.label }}
        </span>
        <Button
          v-if="props.mode === 'edit'"
          icon="pi pi-times"
          size="small"
          severity="danger"
          @click="removeNormdataItem(entry as NormdataEntry, category)"
        ></Button>
      </div>
      <Button
        v-if="props.mode === 'edit'"
        v-show="normdataSearchObject[category].mode === 'view'"
        class="mt-2 w-full h-2rem"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        label="Add item"
        @click="changeNormdataSelectionMode(category, 'edit')"
      />
      <AutoComplete
        v-if="props.mode === 'edit'"
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
</template>

<style scoped>
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

.normdata-entry {
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

.hidden {
  display: none;
}
</style>
