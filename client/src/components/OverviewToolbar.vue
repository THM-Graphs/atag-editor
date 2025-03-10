<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import { useGuidelinesStore } from '../store/guidelines';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import { MultiSelect } from 'primevue';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import Toolbar from 'primevue/toolbar';
import { buildFetchUrl, capitalize, cloneDeep } from '../utils/helper/helper';
import ICollection from '../models/ICollection';
import { IGuidelines } from '../models/IGuidelines';
import { Collection } from '../models/types';

const emit = defineEmits(['collectionCreated', 'searchInputChanged']);

const { getAvailableCollectionLabels, getCollectionConfigFields } = useGuidelinesStore();

const searchInput = ref<string>('');
const newCollectionData = ref<Collection>(null);
const guidelines = ref<IGuidelines>({} as IGuidelines);

const dialogIsVisible = ref<boolean>(false);
const guidelinesAreLoaded = ref<boolean>(false);
const asyncOperationRunning = ref<boolean>(false);

const availableCollectionLabels = computed(getAvailableCollectionLabels);

// TODO: replace this with general form handling in the future
// Used for enabling/disabling buttons when form inputs don't satisfy requirements
const inputIsValid: ComputedRef<boolean> = computed((): boolean => {
  if (dialogIsVisible.value && !guidelinesAreLoaded.value) {
    return false;
  }

  const selectedLabelsValid: boolean =
    availableCollectionLabels.value.length === 0 || newCollectionData.value.nodeLabels.length > 0;

  const requiredFieldsValid: boolean = getCollectionConfigFields('Letter')
    .filter(field => field.required)
    .every(field => newCollectionData.value?.data[field.name]?.toString().trim() !== '');

  return selectedLabelsValid && requiredFieldsValid;
});

// TODO: Add information about creation status for message in Overview.vue (success/fail, new label etc.)
// TODO: Add error message to dialog if collection could not be created
async function createNewCollection(): Promise<void> {
  console.log(cloneDeep(newCollectionData.value));

  return;

  asyncOperationRunning.value = true;

  try {
    const url: string = buildFetchUrl('/api/collections');

    const response: Response = await fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(newCollectionData.value),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const createdCollection: ICollection = await response.json();

    newCollectionData.value = {} as Collection;
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
  await getGuidelines();
}

async function hideDialog(): Promise<void> {
  newCollectionData.value = null;
  dialogIsVisible.value = false;
  guidelinesAreLoaded.value = false;
}
async function getGuidelines(): Promise<void> {
  try {
    const url: string = buildFetchUrl('/api/guidelines');

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedGuidelines: IGuidelines = await response.json();
    guidelines.value = fetchedGuidelines;

    // TODO: Load guidelines only once? Should be enough...
    // Initialize newCollectionData with empty strings to include them in form data
    newCollectionData.value = {
      data: Object.fromEntries(
        getCollectionConfigFields('Letter').map(f => [f.name, '']),
      ) as ICollection,
      nodeLabels: [],
    };

    guidelinesAreLoaded.value = true;
  } catch (error: unknown) {
    console.error('Error fetching guidelines:', error);
  }
}

function handleSearchInput(): void {
  emit('searchInputChanged', searchInput.value.toLowerCase());
}
</script>

<template>
  <Toolbar class="toolbar w-7 m-auto">
    <template #start>
      <IconField iconPosition="left">
        <InputIcon>
          <i class="pi pi-search" />
        </InputIcon>
        <InputText
          spellcheck="false"
          placeholder="Filter Collections by label"
          v-model="searchInput"
          @input="handleSearchInput"
        />
      </IconField>
    </template>

    <template #end>
      <Button
        icon="pi pi-plus"
        aria-label="Submit"
        label="Add Collection"
        title="Add new Collection"
        @click="showDialog"
      />
    </template>
  </Toolbar>
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
      <div v-if="guidelinesAreLoaded">
        <div class="select-label-container flex flex-column align-items-center">
          <h4 class="mt-0">Select labels</h4>
          <MultiSelect
            v-model="newCollectionData.nodeLabels"
            :options="availableCollectionLabels"
            display="chip"
            :invalid="
              availableCollectionLabels?.length > 0 && newCollectionData?.nodeLabels?.length === 0
            "
            placeholder="Select labels"
            class="text-center"
            :filter="false"
          >
            <template #chip="{ value }">
              <Tag :value="value" severity="contrast" class="mr-1" />
            </template>
          </MultiSelect>
        </div>
        <div class="select-data-container">
          <h4 class="text-center">Add data</h4>
          <div
            class="input-container flex align-items-center gap-3 mb-3"
            v-for="(property, index) in getCollectionConfigFields('Letter')"
          >
            <label :for="property.name" class="font-semibold w-6rem"
              >{{ capitalize(property.name) }}
            </label>
            <InputText
              :id="property.name"
              :required="property.required"
              :autofocus="index === 0"
              :key="property.name"
              v-model="newCollectionData.data[property.name] as string"
              class="flex-auto"
              spellcheck="false"
            />
          </div>
        </div>
      </div>

      <div v-else class="skeleton-container">
        <div v-for="_n in 4" class="flex flex-row gap-2">
          <Skeleton class="mb-3" height="2rem" width="10rem"></Skeleton>
          <Skeleton class="mb-3" height="2rem"></Skeleton>
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
