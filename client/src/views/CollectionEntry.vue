<script setup lang="ts">
import { computed, ComputedRef, ref, watch } from 'vue';
import {
  onBeforeRouteLeave,
  RouteLocationNormalizedLoaded,
  RouterLink,
  useRoute,
} from 'vue-router';
import { useGuidelinesStore } from '../store/guidelines';
import AnnotationFormAdditionalTextSection from '../components/AnnotationFormAdditionalTextSection.vue';
import AnnotationTypeIcon from '../components/AnnotationTypeIcon.vue';
import AnnotationFormEntitiesSection from '../components/AnnotationFormEntitiesSection.vue';
import CollectionAnnotationButton from '../components/CollectionAnnotationButton.vue';
import CollectionError from '../components/CollectionError.vue';
import DataInputComponent from '../components/DataInputComponent.vue';
import DataInputGroup from '../components/DataInputGroup.vue';
import FormPropertiesSection from '../components/FormPropertiesSection.vue';
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
  AnnotationType,
  Collection,
  CollectionAccessObject,
  CollectionPostData,
  PropertyConfig,
  Text,
} from '../models/types';
import Button from 'primevue/button';
import Column from 'primevue/column';
import ConfirmPopup from 'primevue/confirmpopup';
import DataTable from 'primevue/datatable';
import Fieldset from 'primevue/fieldset';
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
import Panel from 'primevue/panel';

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
  getAvailableCollectionAnnotationConfigs,
  getAvailableTextLabels,
  getCollectionAnnotationConfig,
  getCollectionAnnotationFields,
  getCollectionConfigFields,
  initializeGuidelines,
} = useGuidelinesStore();

const collectionUuid = computed(() => route.params.uuid as string);

// ------------------------------------------------------------------------------

// TODO: Split this up into smaller refs
const collectionAccessObject = ref<CollectionAccessObject | null>(null);
const isValidCollection = ref<boolean>(false);
const initialCollectionAccessObject = ref<CollectionAccessObject | null>(null);
const mode = ref<'view' | 'edit'>('view');
const propertiesAreCollapsed = ref<boolean>(false);

// Initial pageload
const isLoading = ref<boolean>(true);
// For fetch during save/cancel action
const asyncOperationRunning = ref<boolean>(false);

const availableCollectionLabels = computed(getAvailableCollectionLabels);
const availableTextLabels = computed(getAvailableTextLabels);

useTitle(
  computed(() => `Collection | ${collectionAccessObject.value?.collection?.data.label ?? ''}`),
);

const collectionFields: ComputedRef<PropertyConfig[]> = computed(() => {
  return guidelines.value
    ? getCollectionConfigFields(collectionAccessObject.value.collection.nodeLabels)
    : [];
});

const availabeAnnotationTypes: ComputedRef<AnnotationType[]> = computed(() =>
  getAvailableCollectionAnnotationConfigs(collectionAccessObject.value.collection.nodeLabels),
);

const textsTableData: ComputedRef<TextTableEntry[]> = computed(() => {
  return collectionAccessObject.value.texts.map((text: Text) => {
    return {
      labels: text.nodeLabels,
      text: text.data.text,
      uuid: text.data.uuid,
      length: text.data.text.length,
    };
  });
});

watch(
  () => route.params.uuid,
  async (newUuid: string): Promise<void> => {
    isLoading.value = true;

    collectionAccessObject.value = {} as CollectionAccessObject;

    // Fetch parent collection details only if a UUID is present
    if (newUuid) {
      await getCollection();
    }

    if (isValidCollection.value || newUuid === '') {
      await getGuidelines();
      await getTexts();
      await getAnnotations();

      initialCollectionAccessObject.value = cloneDeep(collectionAccessObject.value);

      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    isLoading.value = false;
  },
  {
    immediate: true,
  },
);

onBeforeRouteLeave(() => preventUserFromRouteLeaving());

function deleteAnnotation(uuid: string): void {
  collectionAccessObject.value.annotations = collectionAccessObject.value.annotations.filter(
    a => a.properties.uuid !== uuid,
  );
}

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

function handleAddNewAnnotation(newAnnotation: AnnotationData): void {
  console.log(newAnnotation);

  collectionAccessObject.value.annotations.push(newAnnotation);
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
    accept: () => deleteAnnotation(uuid),
    reject: () => {},
  });
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

  // Compare annotations

  const currentAnnotations: AnnotationData[] = collectionAccessObject.value.annotations;
  const initialAnnotations: AnnotationData[] = initialCollectionAccessObject.value.annotations;

  // Compare annotations length
  if (currentAnnotations.length !== initialAnnotations.length) {
    return true;
  }

  // Compare annotation data
  for (let i = 0; i < currentAnnotations.length; i++) {
    const currentAnnotation: AnnotationData = currentAnnotations[i];
    const initialAnnotation: AnnotationData = initialAnnotations.find(
      a => a.properties.uuid === currentAnnotation.properties.uuid,
    );

    // Return true if initial annotation was not found
    if (!initialAnnotation) {
      return true;
    }

    const entityUuids: Set<string> = new Set(
      Object.values(currentAnnotation.entities)
        .flat()
        .map(m => m.uuid),
    );
    const initialEntityUuids: Set<string> = new Set(
      Object.values(initialAnnotation.entities)
        .flat()
        .map(m => m.uuid),
    );

    const additionalTextUuids: Set<string> = new Set(
      currentAnnotation.additionalTexts.map(at => at.collection.data.uuid),
    );

    const initialAdditionalTextUuids: Set<string> = new Set(
      initialAnnotation.additionalTexts.map(at => at.collection.data.uuid),
    );

    if (
      JSON.stringify(currentAnnotation.properties) !==
        JSON.stringify(currentAnnotation.properties) ||
      !areSetsEqual(entityUuids, initialEntityUuids) ||
      !areSetsEqual(initialAdditionalTextUuids, additionalTextUuids)
    ) {
      console.log(`Annotation at index ${i} has changed data.`);
      return true;
    }
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
    const url: string = buildFetchUrl(`/api/collections/${collectionUuid.value}`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollection: Collection = await response.json();

    isValidCollection.value = true;
    collectionAccessObject.value.collection = fetchedCollection;
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}

async function getTexts(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/collections/${collectionUuid.value}/texts`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedTexts: Text[] = await response.json();

    collectionAccessObject.value.texts = fetchedTexts;
  } catch (error: unknown) {
    console.error('Error fetching texts for collection:', error);
  }
}

async function getAnnotations(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/collections/${collectionUuid.value}/annotations`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedAnnotations: AnnotationData[] = await response.json();

    collectionAccessObject.value.annotations = fetchedAnnotations;
  } catch (error: unknown) {
    console.error('Error fetching annotations for collection:', error);
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
    <div class="header-buttons flex justify-content-between mx-2 pl-2 pt-2">
      <RouterLink to="/">
        <Button
          icon="pi pi-home"
          aria-label="Home"
          class="w-2rem h-2rem"
          title="Go to overview"
        ></Button>
      </RouterLink>
      <div class="flex">
        <RouterLink :to="`/collection-manager/${collectionAccessObject.collection.data.uuid}`">
          <Button
            icon="pi pi-sitemap"
            severity="secondary"
            title="Open this collection in Collection Manager"
            label="Open in collection manager"
            aria-label="Open this collection in Collection Manager"
          ></Button>
        </RouterLink>
      </div>
    </div>
    <h2 class="text-center">
      {{ collectionAccessObject?.collection.data.label }}
    </h2>
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
            <div class="input-container" v-for="field in collectionFields">
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
          <div v-if="mode === 'edit'" class="annotation-button-pane flex flex-wrap gap-3 py-3">
            <CollectionAnnotationButton
              v-for="type in availabeAnnotationTypes"
              :annotationType="type.type"
              :collection-node-labels="collectionAccessObject.collection.nodeLabels"
              :mode="mode"
              @add-annotation="handleAddNewAnnotation"
            />
          </div>
          <Panel
            v-for="annotation in collectionAccessObject.annotations"
            class="annotation-form mb-3"
            :data-annotation-uuid="annotation.properties.uuid"
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
                  <AnnotationTypeIcon :annotationType="annotation.properties.type" />
                </div>
                <div class="annotation-type-container">
                  <span class="font-bold">{{ annotation.properties.type }}</span>
                </div>
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
              <FormPropertiesSection
                v-model="annotation.properties"
                :fields="
                  getCollectionAnnotationFields(
                    collectionAccessObject.collection.nodeLabels,
                    annotation.properties.type,
                  )
                "
                :mode="mode"
              />
            </Fieldset>
            <AnnotationFormAdditionalTextSection
              v-if="
                getCollectionAnnotationConfig(
                  collectionAccessObject.collection.nodeLabels,
                  annotation.properties.type,
                ).hasAdditionalTexts === true
              "
              :mode="mode"
              v-model="annotation.additionalTexts"
              :initial-additional-texts="
                initialCollectionAccessObject.annotations.find(
                  a => a.properties.uuid === annotation.properties.uuid,
                )?.additionalTexts ?? []
              "
            />
            <AnnotationFormEntitiesSection
              v-if="
                getCollectionAnnotationConfig(
                  collectionAccessObject.collection.nodeLabels,
                  annotation.properties.type,
                ).hasEntities === true
              "
              :mode="mode"
              v-model="annotation.entities"
            />
            <div class="action-buttons flex justify-content-center">
              <Button
                v-if="mode === 'edit'"
                label="Delete"
                title="Delete annotation"
                severity="danger"
                icon="pi pi-trash"
                size="small"
                @click="handleDeleteAnnotation($event, annotation.properties.uuid)"
              />
            </div>
            <ConfirmPopup></ConfirmPopup>
          </Panel>
        </div>
      </SplitterPanel>
      <SplitterPanel class="overflow-y-auto">
        <div class="texts-pane w-full">
          <h2 class="text-center">Texts ({{ collectionAccessObject.texts.length }})</h2>
          <div class="text-pane-content">
            <DataTable
              :value="textsTableData"
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

.icon-container {
  width: 20px;
  height: 20px;
}
</style>
