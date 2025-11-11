<script setup lang="ts">
import { computed, ComputedRef, ref, watch } from 'vue';
import Button from 'primevue/button';

import ButtonGroup from 'primevue/buttongroup';
import ToggleButton from 'primevue/togglebutton';
import { useCollectionManagerStore } from '../store/collectionManager';
import NodeTag from './NodeTag.vue';
import { useGuidelinesStore } from '../store/guidelines';
import {
  AnnotationData,
  AnnotationType,
  Collection,
  CollectionAccessObject,
  CollectionCreationData,
  CollectionPostData,
  CollectionStatusObject,
  PropertyConfig,
  Text,
} from '../models/types';
import {
  capitalize,
  cloneDeep,
  createNewTextObject,
  getDefaultValueForProperty,
} from '../utils/helper/helper';
import MultiSelect from 'primevue/multiselect';
import DataInputComponent from './DataInputComponent.vue';
import DataInputGroup from './DataInputGroup.vue';
import { ToastServiceMethods, useConfirm, useToast } from 'primevue';
import ConfirmPopup from 'primevue/confirmpopup';
import CollectionAnnotationButton from './CollectionAnnotationButton.vue';
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import Panel from 'primevue/panel';
import Fieldset from 'primevue/fieldset';
import FormPropertiesSection from './FormPropertiesSection.vue';
import AnnotationFormAdditionalTextSection from './AnnotationFormAdditionalTextSection.vue';
import AnnotationFormEntitiesSection from './AnnotationFormEntitiesSection.vue';
import TextContainer from './TextContainer.vue';
import { useAppStore } from '../store/app';
import { useRouter } from 'vue-router';

defineProps<{}>();

const router = useRouter();
const { api } = useAppStore();

const toast: ToastServiceMethods = useToast();

const {
  guidelines,
  getCollectionAnnotationFields,
  getCollectionAnnotationConfig,
  getCollectionConfigFields,
  getAllCollectionConfigFields,
  getAvailableCollectionLabels,
  getAvailableCollectionAnnotationConfigs,
} = useGuidelinesStore();
const {
  activeCollection,
  levels,
  mode: globalMode,
  setMode,
  pathToActiveCollection,
  createNewUrlPath,
} = useCollectionManagerStore();

const confirm = useConfirm();

const temporaryWorkData = ref<CollectionAccessObject | null>(null);
const initialTemporaryWorkData = ref<CollectionAccessObject | null>(null);

const temporaryTexts = ref<Text[]>([]);

// Responsible for setting inputs (non-)editable. The global mode
// determines the state of the page.
const formMode = computed<'view' | 'edit'>(() => {
  if (globalMode.value === 'create' || globalMode.value === 'edit') {
    return 'edit';
  } else {
    return 'view';
  }
});
const asyncOperationRunning = ref<boolean>(false);
const propertiesAreCollapsed = ref<boolean>(false);

const selectedView = ref<'texts' | 'details' | 'annotations'>('details');
const isTextsSelected = computed<boolean>(() => selectedView.value === 'texts');
const isDetailsSelected = computed<boolean>(() => selectedView.value === 'details');
const isAnnotationsSelected = computed<boolean>(() => selectedView.value === 'annotations');

const collectionFields: ComputedRef<PropertyConfig[]> = computed(() => {
  return guidelines.value
    ? getCollectionConfigFields(temporaryWorkData.value.collection.nodeLabels)
    : [];
});

const availableCollectionLabels = computed(getAvailableCollectionLabels);
const availabeAnnotationTypes: ComputedRef<AnnotationType[]> = computed(() =>
  getAvailableCollectionAnnotationConfigs(temporaryWorkData.value.collection.nodeLabels),
);

watch(
  () => activeCollection.value?.collection.data.uuid,
  () => {
    temporaryWorkData.value = cloneDeep(activeCollection.value);
    initialTemporaryWorkData.value = cloneDeep(activeCollection.value);

    temporaryTexts.value = [];

    // In this case, the collection data is editable directly, meaning that the data need to be enriched
    if (globalMode.value === 'create') {
      enrichCollectionData();
    }
  },
  { immediate: true },
);

function clearTemporaryTexts(): void {
  temporaryTexts.value = [];
}

function deleteAnnotation(uuid: string): void {
  temporaryWorkData.value.annotations = temporaryWorkData.value.annotations.filter(
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
    if (!(field.name in temporaryWorkData.value.collection.data)) {
      temporaryWorkData.value.collection.data[field.name] =
        field?.required === true ? getDefaultValueForProperty(field.type) : null;
    }
  });

  console.log(temporaryWorkData.value.collection.data);
}

function handleAddNewAnnotation(newAnnotation: AnnotationData): void {
  temporaryWorkData.value.annotations.push(newAnnotation);
}

function handleAddText(newText: Text) {
  temporaryTexts.value = temporaryTexts.value.filter(t => t.data.uuid !== newText.data.uuid);

  temporaryWorkData.value.texts.push(newText);
}

async function handleAddTextClick(): Promise<void> {
  const newText: Text = createNewTextObject();

  temporaryTexts.value.push(newText);
}

function handleClickEditButton(): void {
  enrichCollectionData();
  setMode('edit');
}

async function handleDiscardChanges(): Promise<void> {
  temporaryWorkData.value = cloneDeep(initialTemporaryWorkData.value);

  clearTemporaryTexts();

  setMode('view');
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

function handleRemoveText(text: Text, status: 'existing' | 'temporary'): void {
  if (status === 'existing') {
    temporaryWorkData.value.texts = temporaryWorkData.value.texts.filter(
      t => t.data.uuid !== text.data.uuid,
    );
  } else {
    temporaryTexts.value = temporaryTexts.value.filter(t => t.data.uuid !== text.data.uuid);
  }
}

async function createCollection() {
  const parentCollection: Collection | null =
    pathToActiveCollection.value[pathToActiveCollection.value.length - 2] ?? null;

  const creationData: CollectionCreationData = {
    ...temporaryWorkData.value,
    parentCollection,
  };

  const createdCollection: Collection = await api.createCollection(creationData);

  // TODO: Hack for now, fix
  temporaryWorkData.value.collection.data.uuid = createdCollection.data.uuid;
  initialTemporaryWorkData.value.collection.data.uuid = createdCollection.data.uuid;

  const updateData: CollectionPostData = {
    data: temporaryWorkData.value,
    initialData: initialTemporaryWorkData.value,
  };

  const updated: Collection = await api.updateCollection(
    temporaryWorkData.value.collection.data.uuid,
    updateData,
  );

  // Set returned collection data to column list item
  const pathIndex: number = pathToActiveCollection.value.length - 1;
  let collectionInColumn: CollectionStatusObject | null =
    levels.value[pathIndex].collections.find(c => c.data.data.uuid === updated.data.uuid) ?? null;

  // TODO: Fix this
  if (collectionInColumn) {
    collectionInColumn.data.data = updated.data;
    collectionInColumn.data.nodeLabels = updated.nodeLabels;
    collectionInColumn.status = 'existing';
  }

  // Set mode to view
  setMode('view');

  // Update route (created collection must be in focus and children displayed)
  router.push({ query: { path: createNewUrlPath(updated.data.uuid, pathIndex) } });
}

async function handleApplyChanges(): Promise<void> {
  asyncOperationRunning.value = true;

  try {
    if ((globalMode.value = 'create')) {
      await createCollection();
    } else {
      await saveCollection();
    }

    initialTemporaryWorkData.value = cloneDeep(temporaryWorkData.value);

    clearTemporaryTexts();
    showMessage('success');
    setMode('view');
  } catch (error: unknown) {
    showMessage('error', error as Error);
    console.error('Error updating collection:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
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
    temporaryWorkData.value.collection.nodeLabels,
  ).map(f => f.name);

  // Remove data entries that are not configured
  Object.keys(temporaryWorkData.value.collection.data).forEach(key => {
    if (!configuredFieldNames.includes(key) && key !== 'uuid') {
      delete temporaryWorkData.value.collection.data[key];
    }
  });
}

async function saveCollection(): Promise<void> {
  removeUnnecessaryDataBeforeSave();

  const collectionPostData: CollectionPostData = {
    data: temporaryWorkData.value,
    initialData: initialTemporaryWorkData.value,
  };

  await api.updateCollection(temporaryWorkData.value.collection.data.uuid, collectionPostData);
}

function showMessage(result: 'success' | 'error', error?: Error) {
  toast.add({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Error saving changes',
    detail: error?.message ?? '',
    life: 2000,
  });
}

function toggleViewMode(direction: 'texts' | 'details' | 'annotations'): void {
  selectedView.value = direction;
}

// function toggleEditMode(): void {
//   if (mode.value === 'view') {
//     enrichCollectionData();
//   }

//   mode.value = mode.value === 'view' ? 'edit' : 'view';
// }
</script>

<template>
  <div
    v-if="temporaryWorkData"
    class="edit-pane-container h-full flex flex-column align-items-center text-center p-2"
  >
    <div class="status text-left">
      <div>Global: {{ globalMode }}</div>
      <div>Component: {{ formMode }}</div>
    </div>
    <div class="main flex-grow-1 flex flex-column w-full">
      <h3>{{ temporaryWorkData.collection.data.label }}</h3>
      <ButtonGroup class="w-full flex">
        <ToggleButton
          :model-value="isDetailsSelected"
          class="w-full"
          onLabel="Details"
          offLabel="Details"
          onIcon="pi pi-info-circle"
          offIcon="pi pi-info-circle"
          title="Show Collection details"
          @change="toggleViewMode('details')"
        />
        <ToggleButton
          :model-value="isAnnotationsSelected"
          class="w-full"
          onLabel="Annotations"
          offLabel="Annotations"
          onIcon="pi pi-pencil"
          offIcon="pi pi-pencil"
          title="Show Annotations"
          @change="toggleViewMode('annotations')"
        />
        <ToggleButton
          :model-value="isTextsSelected"
          class="w-full"
          onLabel="Texts"
          offLabel="Texts"
          onIcon="pi pi-align-justify"
          offIcon="pi pi-align-justify"
          title="Show Texts"
          @change="toggleViewMode('texts')"
        />
      </ButtonGroup>

      <div class="content">
        <div v-show="isDetailsSelected" class="properties-pane">
          <h3 class="text-center">Labels</h3>
          <div v-if="formMode === 'edit'" class="flex justify-content-center">
            <MultiSelect
              v-model="temporaryWorkData.collection.nodeLabels"
              :options="availableCollectionLabels"
              display="chip"
              placeholder="Select labels"
              :filter="false"
            >
              <template #chip="{ value }">
                <NodeTag :content="value" type="Collection" class="mr-1" />
              </template>
            </MultiSelect>
          </div>
          <div v-else class="flex gap-2 justify-content-center">
            <template
              v-if="temporaryWorkData.collection.nodeLabels.length > 0"
              v-for="label in temporaryWorkData.collection.nodeLabels"
              :key="label"
            >
              <NodeTag :content="label" type="Collection" class="mr-1" />
            </template>
            <div v-else>
              <i>This Collection has no labels yet.</i>
            </div>
          </div>

          <h3 class="text-center">Properties</h3>
          <pre class="text-left">{{ temporaryWorkData.collection.data }}</pre>

          <form>
            <div class="input-container" v-for="field in collectionFields">
              <div class="flex align-items-center gap-3 mb-3">
                <label :for="field.name" class="w-10rem font-semibold"
                  >{{ capitalize(field.name) }}
                </label>
                <DataInputGroup
                  v-if="field.type === 'array'"
                  v-model="temporaryWorkData.collection.data[field.name]"
                  :config="field"
                  :mode="formMode"
                />
                <DataInputComponent
                  v-else
                  v-model="temporaryWorkData.collection.data[field.name]"
                  :config="field"
                  :mode="formMode"
                />
              </div>
            </div>
          </form>
        </div>

        <div v-show="isAnnotationsSelected" class="annotations-pane">
          <div v-if="formMode === 'edit'" class="annotation-button-pane flex flex-wrap gap-3 py-3">
            <CollectionAnnotationButton
              v-for="type in availabeAnnotationTypes"
              :annotationType="type.type"
              :collection-node-labels="temporaryWorkData.collection.nodeLabels"
              :mode="formMode"
              @add-annotation="handleAddNewAnnotation"
            />
          </div>

          <Panel
            v-for="annotation in temporaryWorkData.annotations"
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
                    temporaryWorkData.collection.nodeLabels,
                    annotation.properties.type,
                  )
                "
                :mode="formMode"
              />
            </Fieldset>
            <AnnotationFormAdditionalTextSection
              v-if="
                getCollectionAnnotationConfig(
                  temporaryWorkData.collection.nodeLabels,
                  annotation.properties.type,
                ).hasAdditionalTexts === true
              "
              :mode="formMode"
              v-model="annotation.additionalTexts"
              :initial-additional-texts="
                initialTemporaryWorkData.annotations.find(
                  a => a.properties.uuid === annotation.properties.uuid,
                )?.additionalTexts ?? []
              "
            />
            <AnnotationFormEntitiesSection
              v-if="
                getCollectionAnnotationConfig(
                  temporaryWorkData.collection.nodeLabels,
                  annotation.properties.type,
                ).hasEntities === true
              "
              :mode="formMode"
              v-model="annotation.entities"
            />
            <div class="action-buttons flex justify-content-center">
              <Button
                v-if="formMode === 'edit'"
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
        <div v-show="isTextsSelected" class="texts-pane text-left">
          <TextContainer
            v-for="text in temporaryWorkData.texts"
            :text="text"
            :mode="formMode"
            status="existing"
            @text-removed="handleRemoveText(text, 'existing')"
          />
          <TextContainer
            v-for="text in temporaryTexts"
            :text="text"
            :mode="formMode"
            status="temporary"
            @text-added="handleAddText(text)"
            @text-removed="handleRemoveText(text, 'temporary')"
          />
          <Button
            v-if="formMode === 'edit'"
            class="mt-2 w-full h-2rem"
            icon="pi pi-plus"
            size="small"
            severity="secondary"
            label="Add text"
            title="Add new text"
            @click="handleAddTextClick"
          />
        </div>
      </div>
    </div>

    <div class="buttons flex justify-content-center gap-2">
      <Button
        v-if="formMode === 'view'"
        icon="pi pi-pencil"
        label="Edit"
        @click="handleClickEditButton"
      ></Button>
      <Button
        v-if="formMode === 'edit'"
        :loading="asyncOperationRunning"
        :icon="globalMode === 'create' ? 'pi pi-plus' : 'pi pi-save'"
        :label="globalMode === 'create' ? 'Create' : 'Save'"
        @click="handleApplyChanges"
      ></Button>
      <Button
        v-if="formMode === 'edit'"
        :disabled="asyncOperationRunning"
        icon="pi pi-times"
        label="Cancel"
        severity="secondary"
        @click="handleDiscardChanges"
      ></Button>
    </div>
  </div>
</template>

<style scoped>
.edit-pane-container {
  outline: 1px solid grey;
}

.edit-pane-container,
.edit-pane-container * {
  position: relative;
  z-index: var(--z-index-edit-pane);
}

.edit-pane-container,
.main {
  overflow-y: hidden;
}

.content {
  flex-grow: 1;
  overflow-y: auto;
}

.icon-container {
  width: 20px;
  height: 20px;
}
</style>
