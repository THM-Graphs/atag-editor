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
  CollectionAccessObject,
  PropertyConfig,
} from '../models/types';
import { capitalize, cloneDeep } from '../utils/helper/helper';
import MultiSelect from 'primevue/multiselect';
import DataInputComponent from './DataInputComponent.vue';
import DataInputGroup from './DataInputGroup.vue';
import { useConfirm } from 'primevue';
import ConfirmPopup from 'primevue/confirmpopup';
import CollectionAnnotationButton from './CollectionAnnotationButton.vue';
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import Panel from 'primevue/panel';
import Fieldset from 'primevue/fieldset';
import FormPropertiesSection from './FormPropertiesSection.vue';
import AnnotationFormAdditionalTextSection from './AnnotationFormAdditionalTextSection.vue';
import AnnotationFormEntitiesSection from './AnnotationFormEntitiesSection.vue';

defineProps<{}>();

const {
  guidelines,
  getCollectionAnnotationFields,
  getCollectionAnnotationConfig,
  getCollectionConfigFields,
  getAvailableCollectionLabels,
  getAvailableCollectionAnnotationConfigs,
} = useGuidelinesStore();
const { activeCollection } = useCollectionManagerStore();

const confirm = useConfirm();

const temporaryWorkData = ref<CollectionAccessObject | null>(null);
const initialTemporaryWorkData = ref<CollectionAccessObject | null>(null);

watch(
  () => activeCollection.value?.collection.data.uuid,
  () => {
    temporaryWorkData.value = cloneDeep(activeCollection.value);
    initialTemporaryWorkData.value = cloneDeep(activeCollection.value);
    console.log('another collection is in focus now');
  },
);

const mode = ref<'view' | 'edit'>('view');
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

function deleteAnnotation(uuid: string): void {
  temporaryWorkData.value.annotations = temporaryWorkData.value.annotations.filter(
    a => a.properties.uuid !== uuid,
  );
}

function handleAddNewAnnotation(newAnnotation: AnnotationData): void {
  temporaryWorkData.value.annotations.push(newAnnotation);
}

async function handleCancelChanges(): Promise<void> {
  temporaryWorkData.value = cloneDeep(initialTemporaryWorkData.value);
  toggleEditMode();
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

async function handleSaveChanges(): Promise<void> {
  // asyncOperationRunning.value = true;

  try {
    // await saveCollection();

    initialTemporaryWorkData.value = cloneDeep(temporaryWorkData.value);

    toggleEditMode();
    // showMessage('success');
  } catch (error: unknown) {
    // showMessage('error', error as Error);
    console.error('Error updating collection:', error);
  } finally {
    // asyncOperationRunning.value = false;
  }
}

function toggleViewMode(direction: 'texts' | 'details' | 'annotations'): void {
  selectedView.value = direction;
}

function toggleEditMode(): void {
  if (mode.value === 'view') {
    // TODO: Do this too, but not now.
    // enrichCollectionData();
  }

  mode.value = mode.value === 'view' ? 'edit' : 'view';
}
</script>

<template>
  <div
    v-if="temporaryWorkData"
    class="container h-full flex flex-column align-items-center text-center p-2"
  >
    <div class="main flex-grow-1 w-full">
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
        <div v-if="isDetailsSelected" class="properties-pane">
          <h3 class="text-center">Labels</h3>
          <div v-if="mode === 'edit'" class="flex justify-content-center">
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
                  :mode="mode"
                />
                <DataInputComponent
                  v-else
                  v-model="temporaryWorkData.collection.data[field.name]"
                  :config="field"
                  :mode="mode"
                />
              </div>
            </div>
          </form>
        </div>

        <div v-else-if="isAnnotationsSelected" class="annotations-pane">
          <div v-if="mode === 'edit'" class="annotation-button-pane flex flex-wrap gap-3 py-3">
            <CollectionAnnotationButton
              v-for="type in availabeAnnotationTypes"
              :annotationType="type.type"
              :collection-node-labels="temporaryWorkData.collection.nodeLabels"
              :mode="mode"
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
                :mode="mode"
              />
            </Fieldset>
            <AnnotationFormAdditionalTextSection
              v-if="
                getCollectionAnnotationConfig(
                  temporaryWorkData.collection.nodeLabels,
                  annotation.properties.type,
                ).hasAdditionalTexts === true
              "
              :mode="mode"
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
        <div v-else-if="isTextsSelected" class="texts-pane">
          <div v-for="text in temporaryWorkData.texts" :key="text.data.uuid">
            <div>{{ text.nodeLabels }}</div>
            <div>{{ text.data.text }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="buttons flex justify-content-center gap-2">
      <Button
        v-if="mode === 'view'"
        icon="pi pi-pencil"
        label="Edit"
        @click="toggleEditMode"
      ></Button>
      <Button
        v-if="mode === 'edit'"
        icon="pi pi-save"
        label="Save"
        @click="handleSaveChanges"
      ></Button>
      <Button
        v-if="mode === 'edit'"
        icon="pi pi-times"
        label="Cancel"
        severity="secondary"
        @click="handleCancelChanges"
      ></Button>
    </div>
  </div>
</template>

<style scoped>
.container {
  outline: 1px solid grey;
}

.icon-container {
  width: 20px;
  height: 20px;
}
</style>
