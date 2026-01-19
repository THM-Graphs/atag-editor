<script setup lang="ts">
import { computed, nextTick, Ref, ref, useTemplateRef } from 'vue';
import { useGuidelinesStore } from '../store/guidelines';
import { camelCaseToTitleCase } from '../utils/helper/helper';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Fieldset from 'primevue/fieldset';
import { AnnotationConfigEntity, Entity } from '../models/types';
import { useAppStore } from '../store/app';

/**
 *  Enriches entities item with an html key that contains the highlighted parts of the node label
 * */
type EntityEntry = Entity & { html: string };

/**
 * Interface for relevant state information about each entities category
 */
interface EntitiesSearchObject {
  [key: string]: {
    fetchedItems: EntityEntry[] | string[];
    nodeLabel: string;
    currentItem: EntityEntry | null;
    mode: 'edit' | 'view';
    elm: Ref<any>;
  };
}

const entities = defineModel<Entity[]>();

const { guidelines, getAvailableAnnotationResourceConfigs } = useGuidelinesStore();
const { api } = useAppStore();

const configs: AnnotationConfigEntity[] = getAvailableAnnotationResourceConfigs();

const categorizedEntities = computed<Record<string, Entity[]>>(() => {
  const obj: Record<string, Entity[]> = {};

  configs.forEach((config: AnnotationConfigEntity) => {
    obj[config.category] = entities.value.filter(e => e.nodeLabels.includes(config.nodeLabel));
  });

  return obj;
});

const props = defineProps<{
  mode?: 'edit' | 'view';
  defaultSearchValue?: string;
}>();

const entitiesAreCollapsed = ref<boolean>(false);
const entitiesSearchObject = ref<EntitiesSearchObject>(
  configs.reduce((object: EntitiesSearchObject, config: AnnotationConfigEntity) => {
    object[config.category] = {
      nodeLabel: guidelines.value.annotations.entities.find(r => r.category === config.category)
        .nodeLabel,
      fetchedItems: [],
      currentItem: null,
      mode: 'view',
      elm: useTemplateRef(`input-${config.category}`),
    };

    return object;
  }, {}),
);

/**
 * Adds a entity item to the specified category in the annotation's data.
 *
 * @param {EntityEntry} item - The entity item to be added.
 */
function addEntityItem(item: EntityEntry): void {
  // Omit 'html' property from entry since it was only created for rendering purposes
  const { html, ...rest } = item;
  entities.value.push(rest);
}

/**
 * Changes the mode of the entities search component for the given category. This triggers
 * re-renders in the template.
 *
 * - If set to `view`, the search bar will be hidden and its related state variables reset.
 * - If set to `edit`, the search bar will be shown and and focused.
 *
 * @param {string} category - The category for which the mode should be changed.
 * @param {'view' | 'edit'} mode - The new mode.
 */
function changeEntitiesSelectionMode(category: string, mode: 'view' | 'edit'): void {
  entitiesSearchObject.value[category].mode = mode;

  if (mode === 'view') {
    entitiesSearchObject.value[category].currentItem = null;

    return;
  }

  // Wait for DOM to update before trying to focus the element
  nextTick(() => {
    // TODO: A bit hacky, replace this when upgraded to Vue 3.5?
    // The entitiesSearchObject's "elm" property is an one-entry-array with the referenced primevue components
    // that holds the component. Is an array because since the refs are set in a loop in the template
    const elm = entitiesSearchObject.value[category].elm[0];

    if (!elm) {
      console.warn(`Focus failed: Element not found for category "${category}"`);
      return;
    }

    const inputElement: HTMLInputElement = elm.$el?.querySelector('input');

    inputElement?.focus();
  });
}

/**
 * Creates a new entity item based on the given label and adds it to the given category.
 *
 * @param {string} newLabel - The label of the new entity item
 * @param {string} category - The category to which the new item should be added
 */
function handleCreateNewEntity(newLabel: string, category: string): void {
  const nodeLabel: string | null =
    guidelines.value.annotations.entities.find(r => r.category === category)?.nodeLabel ?? null;

  const item: EntityEntry = {
    nodeLabels: nodeLabel ? [nodeLabel] : [],
    data: {
      uuid: crypto.randomUUID(),
      label: newLabel,
    },
  } as EntityEntry;

  handleEntityItemSelect(item, category);
}

/**
 * Handles the selection of a entity item by adding it to the annotation and resetting the search component.
 *  Called on selection of an item from the autocomplete dropdown pane.
 *
 * @param {EntityEntry} item - The entity item to be added.
 * @param {string} category - The category to which the item should be added.
 */
function handleEntityItemSelect(item: EntityEntry, category: string): void {
  addEntityItem(item);
  changeEntitiesSelectionMode(category, 'view');
}

/**
 * Removes a entity item from the annotation's data.
 *
 * @param {EntityEntry} item - The entity item to be removed.
 */
function removeEntityItem(item: EntityEntry): void {
  entities.value = entities.value.filter(entry => entry.data.uuid !== item.data.uuid);
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
 * Fetches entity items from the server whose's label matches the given search string and stores the results
 * in the corresponding entitiesSearchObject entry.
 *
 * @param {string} searchString - The string to be searched for.
 * @param {string} category - The category for which the search should be performed.
 */
async function searchEntitiesOptions(searchString: string, category: string): Promise<void> {
  const nodeLabel: string = entitiesSearchObject.value[category].nodeLabel;

  const fetchedEntities: Entity[] = await api.getEntities(nodeLabel, searchString);

  // Show only entries that are not already part of the annotation
  const existingUuids: string[] = entities.value.map((entry: EntityEntry) => entry.data.uuid);

  const withoutDuplicates: Entity[] = fetchedEntities.filter(
    (entry: Entity) => !existingUuids.includes(entry.data.uuid),
  );

  // Store HTML directly in prop to prevent unnecessary, primevue-enforced re-renders during hover
  const withHtml: EntityEntry[] = withoutDuplicates.map((entry: Entity) => ({
    ...entry,
    html: renderHTML(entry.data.label, searchString),
  }));

  entitiesSearchObject.value[category].fetchedItems = withHtml;
}
</script>

<template>
  <Fieldset
    legend="Entities"
    :toggleable="true"
    :toggle-button-props="{
      title: `${entitiesAreCollapsed ? 'Expand' : 'Collapse'} entities`,
    }"
    @toggle="entitiesAreCollapsed = !entitiesAreCollapsed"
  >
    <template #toggleicon>
      <span :class="`pi pi-chevron-${entitiesAreCollapsed ? 'down' : 'up'}`"></span>
    </template>

    <div v-for="category in Object.keys(categorizedEntities)">
      <p class="font-bold">{{ camelCaseToTitleCase(category) }}:</p>
      <div
        class="entities-entry flex justify-content-between align-items-center"
        v-for="entry in categorizedEntities[category]"
      >
        <span>
          {{ entry.data.label }}
        </span>
        <Button
          v-if="props.mode === 'edit'"
          icon="pi pi-times"
          size="small"
          severity="danger"
          @click="removeEntityItem(entry as EntityEntry)"
        ></Button>
      </div>
      <Button
        v-if="props.mode === 'edit'"
        v-show="entitiesSearchObject[category].mode === 'view'"
        class="mt-2 w-full h-2rem"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        label="Add item"
        @click="changeEntitiesSelectionMode(category, 'edit')"
      />
      <AutoComplete
        :default-value="props.defaultSearchValue"
        :complete-on-focus="props.defaultSearchValue ? true : false"
        v-if="props.mode === 'edit'"
        v-show="entitiesSearchObject[category].mode === 'edit'"
        v-model="entitiesSearchObject[category].currentItem"
        dropdown
        dropdownMode="current"
        :placeholder="`Type to see suggestions`"
        :suggestions="entitiesSearchObject[category].fetchedItems"
        :overlayClass="entitiesSearchObject[category].mode === 'view' ? 'hidden' : ''"
        optionLabel="label"
        class="mt-2 w-full h-2rem"
        variant="filled"
        :ref="`input-${category}`"
        input-class="w-full"
        @complete="searchEntitiesOptions($event.query, category)"
        @option-select="handleEntityItemSelect($event.value, category)"
      >
        <template #header v-if="entitiesSearchObject[category].fetchedItems.length > 0">
          <div class="font-medium px-3 py-2">
            {{ entitiesSearchObject[category].fetchedItems.length }} Results
          </div>
        </template>
        <template #option="slotProps">
          <span v-html="slotProps.option.html" :title="slotProps.option.label"></span>
        </template>
        <template #empty>
          <div class="font-italic text-center mb-1">No results found</div>
          <Button
            icon="pi pi-plus"
            class="w-full"
            size="small"
            label="Create new entity"
            severity="secondary"
            title="Add new entity to annotation"
            @click="
              handleCreateNewEntity(entitiesSearchObject[category].elm[0].inputValue, category)
            "
          ></Button>
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

.entities-entry {
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
