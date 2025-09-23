<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import { useGuidelinesStore } from '../store/guidelines';
import DataInputComponent from './DataInputComponent.vue';
import DataInputGroup from './DataInputGroup.vue';
import NodeTag from './NodeTag.vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import MultiSelect from 'primevue/multiselect';
import { capitalize, getDefaultValueForProperty } from '../utils/helper/helper';
import ICollection from '../models/ICollection';
import {
  Collection,
  CollectionAccessObject,
  CollectionCreationData,
  PropertyConfig,
} from '../models/types';
import { useAppStore } from '../store/app';

const emit = defineEmits(['collectionCreated']);

const props = defineProps<{
  parentCollection?: Collection;
}>();

const { api } = useAppStore();

const {
  availableCollectionLabels,
  guidelines,
  getAllCollectionConfigFields,
  getCollectionConfigFields,
} = useGuidelinesStore();

const newCollectionData = ref<CollectionAccessObject>(null);
const dialogIsVisible = ref<boolean>(false);

const asyncOperationRunning = ref<boolean>(false);

const dialogInputFields: ComputedRef<PropertyConfig[]> = computed(() =>
  getCollectionConfigFields(newCollectionData.value.collection.nodeLabels),
);

const inputIsValid: ComputedRef<boolean> = computed((): boolean => {
  const selectedLabelsAreValid: boolean =
    availableCollectionLabels.value.length === 0 ||
    newCollectionData.value.collection.nodeLabels.length > 0;

  const requiredFieldsAreValid: boolean = dialogInputFields.value
    .filter(field => field.required)
    .every(
      field =>
        newCollectionData.value?.collection.data[field.name] !== null &&
        newCollectionData.value?.collection.data[field.name] !== undefined &&
        newCollectionData.value?.collection.data[field.name] !== '',
    );

  return selectedLabelsAreValid && requiredFieldsAreValid;
});

function removeUnnecessaryDataBeforeSave(): void {
  const configuredFieldNames: string[] = getCollectionConfigFields(
    newCollectionData.value.collection.nodeLabels,
  ).map(f => f.name);

  Object.keys(newCollectionData.value.collection.data).forEach(key => {
    if (!configuredFieldNames.includes(key) && key !== 'uuid') {
      delete newCollectionData.value.collection.data[key];
    }
  });
}

async function createNewCollection(): Promise<void> {
  asyncOperationRunning.value = true;

  removeUnnecessaryDataBeforeSave();

  try {
    const postData: CollectionCreationData = {
      ...newCollectionData.value,
      parentCollection: props.parentCollection ?? null,
    };

    const createdCollection: Collection = await api.createCollection(postData);

    newCollectionData.value = {} as CollectionAccessObject;
    dialogIsVisible.value = false;

    emit('collectionCreated', createdCollection);
  } catch (error: unknown) {
    console.error('Error creating collection:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

async function showDialog(): Promise<void> {
  dialogIsVisible.value = true;

  newCollectionData.value = {
    collection: {
      data: Object.fromEntries(
        getAllCollectionConfigFields().map(f => [
          f.name,
          f?.required === true ? getDefaultValueForProperty(f.type) : null,
        ]),
      ) as ICollection,
      nodeLabels: guidelines.value.collections.types
        .filter(t => t.level === 'primary')
        .map(t => t.additionalLabel),
    },
    texts: [],
    annotations: [],
    collections: {},
  } as CollectionAccessObject;
}

async function hideDialog(): Promise<void> {
  newCollectionData.value = null;
  dialogIsVisible.value = false;
}
</script>

<template>
  <Button
    icon="pi pi-plus"
    aria-label="Submit"
    label="Add Collection"
    title="Add new Collection"
    @click="showDialog"
  />

  <!-- TODO: Can this be a separate component or managed via composable? -->
  <Dialog
    v-model:visible="dialogIsVisible"
    modal
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '25rem' }"
  >
    <template #header>
      <h2 class="w-full text-center m-0">Add new Collection</h2>
    </template>

    <form @submit.prevent="createNewCollection">
      <div class="select-parents-container flex flex-column align-items-center">
        <div class="flex align-items-center gap-2 mt-0">
          <h4>Parent of the new collection</h4>
          <span
            class="pi pi-question-circle"
            v-tooltip.hover.top="{
              value: 'The new collection will be attached to the parent of the current collection ',
              showDelay: 50,
            }"
          ></span>
        </div>

        <Card v-if="props?.parentCollection">
          <template #content>
            <div class="flex gap-2">
              <NodeTag
                v-for="nodeLabel in props.parentCollection.nodeLabels"
                :content="nodeLabel"
                type="Collection"
                class="mr-1"
              />
              <div>{{ parentCollection.data.label }}</div>
            </div>
          </template>
        </Card>

        <span v-else class="font-italic"> No parent collection exists </span>
      </div>
      <div class="select-label-container flex flex-column align-items-center">
        <h4>Select labels</h4>
        <MultiSelect
          v-model="newCollectionData.collection.nodeLabels"
          :options="availableCollectionLabels"
          display="chip"
          :invalid="
            availableCollectionLabels?.length > 0 &&
            newCollectionData?.collection?.nodeLabels?.length === 0
          "
          placeholder="Select labels"
          class="text-center"
          :filter="false"
        >
          <template #chip="{ value }">
            <NodeTag :content="value" type="Collection" class="mr-1" />
          </template>
        </MultiSelect>
      </div>
      <div class="select-data-container">
        <h4 class="text-center">Add data</h4>
        <div
          class="input-container flex align-items-center gap-3 mb-3"
          v-for="field in dialogInputFields"
        >
          <label :for="field.name" class="font-semibold w-6rem"
            >{{ capitalize(field.name) }}
          </label>
          <DataInputGroup
            v-if="field.type === 'array'"
            v-model="newCollectionData.collection.data[field.name]"
            :config="field"
          />
          <DataInputComponent
            v-else
            v-model="newCollectionData.collection.data[field.name]"
            :config="field"
          />
        </div>
      </div>

      <div class="button-container flex justify-content-end gap-2">
        <Button
          type="button"
          label="Cancel"
          title="Cancel"
          severity="secondary"
          @click="hideDialog"
        ></Button>
        <Button
          type="submit"
          label="Create"
          title="Create new text"
          :loading="asyncOperationRunning"
          :disabled="!inputIsValid"
        ></Button>
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
label {
  word-wrap: break-word;
}
</style>
