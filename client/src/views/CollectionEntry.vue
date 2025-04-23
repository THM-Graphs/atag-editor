<script setup lang="ts">
import { computed, ComputedRef, onMounted, ref } from 'vue';
import {
  onBeforeRouteLeave,
  RouteLocationNormalizedLoaded,
  RouterLink,
  useRoute,
} from 'vue-router';
import { useGuidelinesStore } from '../store/guidelines';
import CollectionError from '../components/CollectionError.vue';
import DataInputComponent from '../components/DataInputComponent.vue';
import DataInputGroup from '../components/DataInputGroup.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import {
  areSetsEqual,
  buildFetchUrl,
  capitalize,
  cloneDeep,
  getDefaultValueForProperty,
} from '../utils/helper/helper';
import { IGuidelines } from '../models/IGuidelines';
import {
  AnnotationData,
  CollectionAccessObject,
  CollectionPostData,
  PropertyConfig,
  Text,
} from '../models/types';
import Button from 'primevue/button';
import Column from 'primevue/column';
import ConfirmPopup from 'primevue/confirmpopup';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Tag from 'primevue/tag';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useTitle } from '@vueuse/core';
import Fieldset from 'primevue/fieldset';
import Panel from 'primevue/panel';
import { camelCaseToTitleCase } from '../utils/helper/helper';

type TextTableEntry = {
  labels: string[];
  length: number;
  text: string;
  uuid: string;
};

const route: RouteLocationNormalizedLoaded = useRoute();
const toast: ToastServiceMethods = useToast();
const confirm = useConfirm();
const {
  guidelines,
  getAllCollectionConfigFields,
  getAvailableCollectionLabels,
  getAvailableTextLabels,
  getCollectionConfigFields,
  initializeGuidelines,
} = useGuidelinesStore();

const collectionUuid: string = route.params.uuid as string;

const collectionAccessObject = ref<CollectionAccessObject | null>(null);
const isValidCollection = ref<boolean>(false);
const initialCollectionAccessObject = ref<CollectionAccessObject | null>(null);
const mode = ref<'view' | 'edit'>('view');

// Initial pageload
const isLoading = ref<boolean>(true);
// For fetch during save/cancel action
const asyncOperationRunning = ref<boolean>(false);

const availableCollectionLabels = computed(getAvailableCollectionLabels);
const availableTextLabels = computed(getAvailableTextLabels);
useTitle(
  computed(() => `Collection | ${collectionAccessObject.value?.collection.data.label ?? ''}`),
);

const fields: ComputedRef<PropertyConfig[]> = computed(() => {
  return guidelines.value
    ? getCollectionConfigFields(collectionAccessObject.value.collection.nodeLabels)
    : [];
});

const tableData: ComputedRef<TextTableEntry[]> = computed(() => {
  return collectionAccessObject.value.texts.map((text: Text) => {
    return {
      labels: text.nodeLabels,
      text: text.data.text,
      uuid: text.data.uuid,
      length: text.data.text.length,
    };
  });
});

onBeforeRouteLeave(() => preventUserFromRouteLeaving());

onMounted(async (): Promise<void> => {
  await getCollection();

  if (isValidCollection.value) {
    await getGuidelines();
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  isLoading.value = false;
});

/**
 * Fills in any missing collection properties with the type-specific default value.
 *
 * Called when entering edit mode to create a full data object from which the dynamically rendered fields
 * can get their values from.
 *
 * @returns {void} This function does not return any value.
 */
function enrichCollectionData(): void {
  const allPossibleFields: PropertyConfig[] = getAllCollectionConfigFields();

  allPossibleFields.forEach(field => {
    if (!(field.name in collectionAccessObject.value.collection.data)) {
      collectionAccessObject.value.collection.data[field.name] =
        field?.required === true ? getDefaultValueForProperty(field.type) : null;
    }
  });
}

async function getGuidelines(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/guidelines`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedGuidelines: IGuidelines = await response.json();

    initializeGuidelines(fetchedGuidelines);
  } catch (error: unknown) {
    console.error('Error fetching guidelines:', error);
  }
}

function handleAddNewText(): void {
  const newText: Text = {
    nodeLabels: [],
    data: {
      uuid: crypto.randomUUID(),
      text: '',
    },
  };

  collectionAccessObject.value.texts.push(newText);
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  preventUserFromPageLeaving(event);
}

async function handleCopy(): Promise<void> {
  await navigator.clipboard.writeText(collectionAccessObject.value.collection.data.uuid);
}

async function handleDeleteText(uuid: string) {
  confirm.require({
    target: event.currentTarget as HTMLButtonElement,
    message: 'Do you want to delete this text?',
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
      collectionAccessObject.value.texts = collectionAccessObject.value.texts.filter(
        (text: Text) => text.data.uuid !== uuid,
      );
    },
    reject: () => {},
  });
}

async function handleCancelChanges(): Promise<void> {
  collectionAccessObject.value = cloneDeep(initialCollectionAccessObject.value);
  toggleEditMode();
}

async function handleSaveChanges(): Promise<void> {
  asyncOperationRunning.value = true;

  try {
    await saveCollection();

    initialCollectionAccessObject.value = cloneDeep(collectionAccessObject.value);

    toggleEditMode();
    showMessage('success');
  } catch (error: unknown) {
    showMessage('error', error as Error);
    console.error('Error updating collection:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

function hasUnsavedChanges(): boolean {
  // Compare collection node labels
  if (
    !areSetsEqual(
      new Set(collectionAccessObject.value.collection.nodeLabels),
      new Set(initialCollectionAccessObject.value.collection.nodeLabels),
    )
  ) {
    return true;
  }

  // Compare collection properties
  if (
    JSON.stringify(collectionAccessObject.value.collection.data) !==
    JSON.stringify(initialCollectionAccessObject.value.collection.data)
  ) {
    return true;
  }

  // Compare texts. JSON.stringify can be used since the order of the array entries matters
  if (
    JSON.stringify(collectionAccessObject.value.texts) !==
    JSON.stringify(initialCollectionAccessObject.value.texts)
  ) {
    return true;
  }

  return false;
}

function preventUserFromPageLeaving(event: BeforeUnloadEvent): string {
  if (!isValidCollection.value) {
    return;
  }

  if (!hasUnsavedChanges()) {
    return;
  }

  event.preventDefault();

  const confirmationMessage = 'Do you really want to leave? You have unsaved changes.';
  event.returnValue = confirmationMessage;

  return confirmationMessage;
}

function preventUserFromRouteLeaving(): boolean {
  if (!isValidCollection.value) {
    return true;
  }

  if (!hasUnsavedChanges()) {
    return true;
  }

  // TODO: Use PrimeVue confirmation dialog instead of browser default?
  const answer: boolean = window.confirm('Do you really want to leave? you have unsaved changes');

  // cancel the navigation and stay on the same page
  if (!answer) {
    return false;
  }
}

async function saveCollection(): Promise<void> {
  removeUnnecessaryDataBeforeSave();

  const collectionPostData: CollectionPostData = {
    data: collectionAccessObject.value,
    initialData: initialCollectionAccessObject.value,
  };

  const url: string = buildFetchUrl(
    `/api/collections/${collectionAccessObject.value.collection.data.uuid}`,
  );

  const response: Response = await fetch(url, {
    method: 'POST',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(collectionPostData),
  });

  if (!response.ok) {
    throw new Error('Could not be saved, try again...');
  }
}

function showMessage(result: 'success' | 'error', error?: Error) {
  toast.add({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Error saving changes',
    detail: error?.message ?? '',
    life: 2000,
  });
}

function toggleEditMode(): void {
  if (mode.value === 'view') {
    enrichCollectionData();
  }

  mode.value = mode.value === 'view' ? 'edit' : 'view';
}

/**
 * Called before saving the collection to remove any data entries that are not configured
 * according to the current node labels of the collection.
 *
 * This is necessary since on edit mode toggling the data object was filled with empty data entries temporarily
 * to form a data pool for the dynamically rendered input fields (see `enrichCollectionData`).
 *
 * @returns {void} This function does not return any value.
 */
function removeUnnecessaryDataBeforeSave(): void {
  // Get configured field names that are allowed to be saved
  const configuredFieldNames: string[] = getCollectionConfigFields(
    collectionAccessObject.value.collection.nodeLabels,
  ).map(f => f.name);

  // Remove data entries that are not configured
  Object.keys(collectionAccessObject.value.collection.data).forEach(key => {
    if (!configuredFieldNames.includes(key) && key !== 'uuid') {
      delete collectionAccessObject.value.collection.data[key];
    }
  });
}

async function getCollection(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/collections/${collectionUuid}`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollectionAccessObject: any = await response.json();
    fetchedCollectionAccessObject.annotations = fetchedCollectionAccessObject.annotations.map(
      (annotation: AnnotationData) => {
        return {
          characterUuids: [],
          data: cloneDeep(annotation),
          endUuid: '',
          initialData: cloneDeep(annotation),
          isTruncated: false,
          startUuid: '',
          status: 'existing',
        };
      },
    );
    console.log('Fetched collection:', fetchedCollectionAccessObject);
    collectionAccessObject.value = fetchedCollectionAccessObject;
    initialCollectionAccessObject.value = cloneDeep(fetchedCollectionAccessObject);
    isValidCollection.value = true;
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}

function shiftText(textUuid: string, direction: 'up' | 'down') {
  const texts: Text[] = collectionAccessObject.value.texts;
  const text: Text = texts.find(t => t.data.uuid === textUuid);
  const index: number = texts.indexOf(text);

  const isFirst: boolean = index === 0;
  const isLast: boolean = index === texts.length - 1;

  if ((isFirst && direction === 'up') || (isLast && direction === 'down')) {
    return;
  }

  const swapIndex = direction === 'up' ? index - 1 : index + 1;

  [texts[index], texts[swapIndex]] = [texts[swapIndex], texts[index]];
}
</script>

<template>
  <LoadingSpinner v-if="isLoading === true" />
  <CollectionError v-else-if="isValidCollection === false" :uuid="collectionUuid" />
  <div v-else class="container h-screen m-auto flex flex-column">
    <div class="absolute overlay w-full h-full" v-if="asyncOperationRunning">
      <LoadingSpinner />
    </div>
    <Toast />
    <ConfirmPopup />
    <div class="header-buttons flex justify-content-between mb-2 pl-2 pt-2">
      <RouterLink to="/">
        <Button
          icon="pi pi-home"
          aria-label="Home"
          class="w-2rem h-2rem"
          title="Go to overview"
        ></Button>
      </RouterLink>
    </div>
    <div class="header flex align-items-center justify-content-center gap-3">
      <h2 class="info mt-0">
        {{ collectionAccessObject?.collection.data.label }}
      </h2>
    </div>
    <Splitter
      class="flex-grow-1 overflow-y-auto gap-2"
      :pt="{
        gutter: {
          style: {
            width: '4px',
          },
        },
        gutterHandle: {
          style: {
            width: '6px',
            position: 'absolute',
            backgroundColor: 'darkgray',
            height: '40px',
          },
        },
      }"
    >
      <SplitterPanel :size="10" class="overflow-y-auto">
        <div class="properties-pane w-full">
          <h2 class="text-center">Collection labels</h2>
          <div v-if="mode === 'edit'" class="flex justify-content-center">
            <MultiSelect
              v-model="collectionAccessObject.collection.nodeLabels"
              :options="availableCollectionLabels"
              display="chip"
              placeholder="Select labels"
              :filter="false"
            >
              <template #chip="{ value }">
                <Tag :value="value" severity="contrast" class="mr-1" />
              </template>
            </MultiSelect>
          </div>
          <div v-else class="flex gap-2 justify-content-center">
            <template
              v-if="collectionAccessObject.collection.nodeLabels.length > 0"
              v-for="label in collectionAccessObject.collection.nodeLabels"
              :key="label"
            >
              <Tag :value="label" severity="contrast" class="mr-1" />
            </template>
            <div v-else>
              <i>This Collection has no labels yet.</i>
            </div>
          </div>

          <h2 class="text-center">Properties</h2>
          <form>
            <div class="flex align-items-center gap-3 mb-3">
              <InputText
                id="uuid"
                :disabled="true"
                :value="collectionAccessObject.collection.data.uuid"
                class="flex-auto w-full"
                size="small"
                spellcheck="false"
              />
              <Button
                icon="pi pi-copy"
                severity="secondary"
                size="small"
                aria-label="Copy UUID"
                title="Copy UUID"
                @click="handleCopy"
              />
            </div>
            <div class="input-container" v-for="field in fields">
              <div class="flex align-items-center gap-3 mb-3">
                <label :for="field.name" class="w-10rem font-semibold"
                  >{{ capitalize(field.name) }}
                </label>
                <DataInputGroup
                  v-if="field.type === 'array'"
                  v-model="collectionAccessObject.collection.data[field.name]"
                  :config="field"
                  :mode="mode"
                />
                <DataInputComponent
                  v-else
                  v-model="collectionAccessObject.collection.data[field.name]"
                  :config="field"
                  :mode="mode"
                />
              </div>
            </div>
          </form>
          <h2 class="text-center">Annotations</h2>
          <Panel
            v-for="annotation in collectionAccessObject.annotations"
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
                <div class="annotation-type-container">
                  <span class="font-bold">{{ annotation.data.properties.type }}</span>
                </div>
              </div>
            </template>
            <template #toggleicon="{ collapsed }">
              <i :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></i>
            </template>
            <Fieldset legend="Properties">
              <form>
                <div
                  v-for="field in guidelines.collections.types
                    .find(t => t.additionalLabel === 'Letter')
                    .annotations.types.find(a => a.type === annotation.data.properties.type)
                    .properties"
                  :key="field.name"
                  class="flex align-items-center gap-3 mb-3"
                  v-show="field.visible"
                >
                  {{ field }}
                  <label :for="field.name" class="form-label font-semibold"
                    >{{ camelCaseToTitleCase(field.name) }}
                  </label>
                  <DataInputGroup
                    v-if="field.type === 'array'"
                    v-model="annotation.data.properties[field.name] as any"
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
            <!-- <Fieldset
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
                  <div
                    class="additional-text-header flex justify-content-between align-items-center"
                  >
                    <span
                      v-if="additionalText.collection.nodeLabels.length > 0"
                      class="font-semibold"
                      >{{
                        additionalText.collection.nodeLabels
                          .map((l: string) => camelCaseToTitleCase(l))
                          .join(' | ')
                      }}</span
                    >
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
                      additionalTextStatusObject.get(additionalText.collection.data.uuid) ===
                      'collapsed'
                        ? 'pi pi-angle-double-down'
                        : 'pi pi-angle-double-up'
                    "
                    severity="secondary"
                    size="small"
                    class="w-full"
                    :title="
                      additionalTextStatusObject.get(additionalText.collection.data.uuid) ===
                      'collapsed'
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
            <ConfirmPopup></ConfirmPopup> -->
          </Panel>
        </div>
      </SplitterPanel>
      <SplitterPanel class="overflow-y-auto">
        <div class="texts-pane w-full">
          <h2 class="text-center">Texts ({{ collectionAccessObject.texts.length }})</h2>
          <div class="text-pane-content">
            <DataTable
              :value="tableData"
              scrollable
              scrollHeight="flex"
              resizableColumns
              rowHover
              tableStyle="table-layout: fixed;"
              size="small"
            >
              <Column field="labels" header="Labels" headerStyle="width: 12rem">
                <template #body="{ data }">
                  <!-- TODO: Remove filter. Can be fixed when Primevue version is upgraded -->
                  <MultiSelect
                    v-if="mode === 'edit'"
                    v-model="
                      collectionAccessObject.texts.find(t => t.data.uuid === data.uuid).nodeLabels
                    "
                    :options="availableTextLabels"
                    display="chip"
                    placeholder="Select labels"
                    :filter="false"
                  >
                    <template #chip="{ value }">
                      <Tag :value="value" severity="secondary" class="mr-1" />
                    </template>
                  </MultiSelect>
                  <span v-else class="cell-info">
                    <div class="box flex" style="flex-wrap: wrap">
                      <Tag
                        v-for="label in data.labels"
                        :value="label"
                        severity="secondary"
                        class="mr-1 mb-1 inline-block"
                      />
                    </div>
                  </span>
                </template>
              </Column>
              <Column field="text" header="Text">
                <template #body="{ data }">
                  <RouterLink
                    class="cell-link block w-full"
                    :to="`/texts/${data.uuid}`"
                    title="Open Text in Editor"
                  >
                    <span v-if="data.text.length > 0">{{ data.text }}</span>
                    <i v-else>No text yet...</i>
                  </RouterLink>
                </template>
              </Column>
              <Column field="length" header="Length" headerStyle="width: 5rem">
                <template #body="{ data }">
                  <span class="cell-info">{{ data.length.toLocaleString() }}</span>
                </template>
              </Column>
              <Column v-if="mode === 'edit'" field="actions" headerStyle="width: 7rem">
                <template #body="{ data }">
                  <div class="flex gap-2">
                    <div style="display: flex; flex-direction: column">
                      <Button
                        v-if="mode === 'edit'"
                        :disabled="
                          collectionAccessObject.texts.findIndex(t => t.data.uuid === data.uuid) ===
                          0
                        "
                        class="h-1rem"
                        title="Move text up"
                        severity="secondary"
                        icon="pi pi-chevron-up"
                        size="small"
                        @click="shiftText(data.uuid, 'up')"
                      /><Button
                        v-if="mode === 'edit'"
                        :disabled="
                          collectionAccessObject.texts.findIndex(t => t.data.uuid === data.uuid) ===
                          collectionAccessObject.texts.length - 1
                        "
                        class="h-1rem"
                        title="Move text down"
                        severity="secondary"
                        icon="pi pi-chevron-down"
                        size="small"
                        @click="shiftText(data.uuid, 'down')"
                      />
                    </div>
                    <Button
                      v-if="mode === 'edit'"
                      title="Delete text"
                      severity="danger"
                      icon="pi pi-trash"
                      size="small"
                      @click="handleDeleteText(data.uuid)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <Button
              v-show="mode === 'edit'"
              label="Add new text"
              title="Add new text to collection"
              icon="pi pi-plus"
              style="display: block; margin: 1rem auto"
              @click="handleAddNewText"
            ></Button>
          </div>
        </div>
      </SplitterPanel>
    </Splitter>

    <div class="action-button-container flex justify-content-center gap-3 p-3">
      <Button
        v-if="mode === 'view'"
        severity="contrast"
        aria-label="Edit collection"
        title="Edit collection"
        icon="pi pi-pencil"
        label="Edit"
        @click="toggleEditMode"
      />
      <Button
        v-if="mode === 'edit'"
        :loading="asyncOperationRunning"
        aria-label="Save changes"
        title="Save changes"
        label="Save"
        @click="handleSaveChanges"
      />
      <Button
        v-if="mode === 'edit'"
        severity="secondary"
        title="Discard changes"
        aria-label="Cancel changes"
        label="Cancel"
        @click="handleCancelChanges"
      />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  z-index: 99999;
}

.properties-pane,
.texts-pane {
  padding: 1rem;
}

.text-box {
  border: 2px solid grey;
}
</style>
