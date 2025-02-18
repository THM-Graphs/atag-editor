<script setup lang="ts">
import { computed, ComputedRef, onMounted, ref } from 'vue';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import { useGuidelinesStore } from '../store/guidelines';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import { buildFetchUrl, capitalize, cloneDeep } from '../utils/helper/helper';
import { IGuidelines } from '../models/IGuidelines';
import {
  CollectionAccessObject,
  CollectionPostData,
  CollectionProperty,
  Text,
} from '../models/types';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';

type TextTableEntry = {
  label: string;
  length: number;
  text: string;
  uuid: string;
};

const route: RouteLocationNormalizedLoaded = useRoute();
const toast: ToastServiceMethods = useToast();
const { guidelines, initializeGuidelines } = useGuidelinesStore();

const collectionUuid: string = route.params.uuid as string;

const collectionAccessObject = ref<CollectionAccessObject | null>(null);
const initialCollectionAccessObject = ref<CollectionAccessObject | null>(null);
const mode = ref<'view' | 'edit'>('view');
const asyncOperationRunning = ref<boolean>(false);
const columns = ref<string[]>(['label', 'text', 'length']);

// TODO: Make dynamic (guidelines)
const allowedTextLabels = ['Comment', 'Normal'];

// TODO: Still a workaround, should be mady dynamic.
const fields: ComputedRef<CollectionProperty[]> = computed(() => {
  if (collectionAccessObject.value.collection.nodeLabel === 'Letter') {
    return guidelines.value ? guidelines.value.collections['text'].properties : [];
  } else {
    return guidelines.value ? guidelines.value.collections['comment'].properties : [];
  }
});

const tableData: ComputedRef<TextTableEntry[]> = computed(() => {
  return collectionAccessObject.value.texts.map((text: Text) => {
    return {
      label: text.nodeLabel,
      text: text.data.text,
      uuid: text.data.uuid,
      length: text.data.text.length,
    };
  });
});

onMounted(async (): Promise<void> => {
  await getGuidelines();
  await getCollection();
});

function getColumnWidth(colName: string): string {
  switch (colName) {
    case 'length':
      return '5rem';
    case 'label':
      return '10rem';
    default:
      return '';
  }
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
    // TODO: This is not good, fix
    nodeLabel: 'Text',
    data: {
      uuid: crypto.randomUUID(),
      text: '',
    },
  };

  collectionAccessObject.value.texts.push(newText);
}

async function handleCopy(): Promise<void> {
  await navigator.clipboard.writeText(collectionAccessObject.value.collection.data.uuid);
}

async function handleDeleteText(uuid: string) {
  collectionAccessObject.value.texts = collectionAccessObject.value.texts.filter(
    (text: Text) => text.data.uuid !== uuid,
  );
}

async function handleCancelChanges(): Promise<void> {
  collectionAccessObject.value = cloneDeep(initialCollectionAccessObject.value);
  toggleEditMode();
}

async function handleSaveChanges(): Promise<void> {
  // return;
  // if (!hasUnsavedChanges()) {
  //   console.log('no changes made, no request needed');
  //   return;
  // }

  // const createdTexts = collectionAccessObject.value.texts.filter(
  //   (text: Text) =>
  //     !initialCollectionAccessObject.value.texts.some(
  //       (initialText: Text) => initialText.data.uuid === text.data.uuid,
  //     ),
  // );

  // const deletedTexts = initialCollectionAccessObject.value.texts.filter(
  //   (initialText: Text) =>
  //     !collectionAccessObject.value.texts.some(
  //       (text: Text) => text.data.uuid === initialText.data.uuid,
  //     ),
  // );

  // console.log('Created: ', createdTexts);
  // console.log('Deleted: ', deletedTexts);
  // console.log('Total: ', collectionAccessObject.value.texts);

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

async function saveCollection(): Promise<void> {
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
  mode.value = mode.value === 'view' ? 'edit' : 'view';
}

async function getCollection(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/collections/${collectionUuid}`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollectionAccessObject: CollectionAccessObject = await response.json();
    collectionAccessObject.value = fetchedCollectionAccessObject;
    initialCollectionAccessObject.value = cloneDeep(fetchedCollectionAccessObject);
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}
</script>

<template>
  <LoadingSpinner v-if="!collectionAccessObject" />
  <div v-else class="container justify-content-stretch h-screen m-auto flex flex-column">
    <Toast />
    <div class="header flex align-items-center justify-content-center gap-3">
      <RouterLink to="/">
        <Button
          icon="pi pi-home"
          aria-label="Home"
          class="w-2rem h-2rem"
          title="Go to overview"
        ></Button>
      </RouterLink>
      <h2 class="info">
        {{ collectionAccessObject?.collection.data.label }}
      </h2>
    </div>
    <div class="flex-grow-1 flex">
      <div class="properties-pane">
        <h3 class="text-center">Properties</h3>
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
              <InputText
                :id="field.name"
                :disabled="mode === 'view' || !field.editable"
                :required="field.required"
                :invalid="field.required && !collectionAccessObject.collection.data[field.name]"
                :key="field.name"
                v-model="collectionAccessObject.collection.data[field.name] as string"
                class="flex-auto w-full"
                spellcheck="false"
              />
            </div>
          </div>
        </form>
      </div>
      <div class="texts-pane">
        <h3 class="text-center">Texts</h3>
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
            <Column
              v-for="col of columns"
              :value="tableData"
              :key="col"
              :field="col"
              :header="capitalize(col)"
              :headerStyle="`width: ${getColumnWidth(col)}`"
            >
              <template #body="{ data }">
                <!-- TODO: This should come from the configuration... -->
                <!-- TODO: Bit hacky. Beautify? -->
                <!-- TODO: Selection is not applied to state, why? -->
                <Select
                  v-if="col === 'label' && mode === 'edit'"
                  v-model="
                    collectionAccessObject.texts.find(t => t.data.uuid === data.uuid).nodeLabel
                  "
                  :options="allowedTextLabels"
                  placeholder="Select a label"
                  class="w-full md:w-56"
                  title="Select a label for the new text"
                />
                <a v-else-if="col === 'text'" class="cell-link" :href="'/texts/' + data.uuid">{{
                  data[col]
                }}</a>
                <span v-else-if="col !== 'length'" class="cell-info">{{ data[col] }}</span>
                <span v-else class="cell-info">{{ data[col] }}</span>
              </template>
            </Column>
            <Column headerStyle="width: 5rem">
              <template #body="{ data }">
                <Button
                  v-if="mode === 'edit'"
                  title="Delete text"
                  severity="danger"
                  icon="pi pi-trash"
                  size="small"
                  @click="handleDeleteText(data.uuid)"
                />
              </template>
            </Column>
          </DataTable>

          <Button
            v-show="mode === 'edit'"
            label="Add new text"
            title="Add new text to collection"
            icon="pi pi-plus"
            style="display: block; margin: 0 auto"
            @click="handleAddNewText"
          ></Button>
        </div>
      </div>
    </div>
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
.properties-pane,
.texts-pane {
  outline: 1px solid green;
  padding: 1rem;
}

.text-box {
  border: 2px solid grey;
}
</style>
