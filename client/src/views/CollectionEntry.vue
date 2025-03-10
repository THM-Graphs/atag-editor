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
import LoadingSpinner from '../components/LoadingSpinner.vue';
import {
  areObjectsEqual,
  areSetsEqual,
  buildFetchUrl,
  capitalize,
  cloneDeep,
} from '../utils/helper/helper';
import { IGuidelines } from '../models/IGuidelines';
import {
  CollectionAccessObject,
  CollectionPostData,
  CollectionProperty,
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

// TODO: Still a workaround, should be mady dynamic.
const fields: ComputedRef<CollectionProperty[]> = computed(() => {
  if (collectionAccessObject.value.collection.nodeLabels.includes('Letter')) {
    return guidelines.value ? getCollectionConfigFields('Letter') : [];
  } else {
    return guidelines.value ? getCollectionConfigFields('Comment') : [];
  }
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
    !areObjectsEqual(
      collectionAccessObject.value.collection.data,
      initialCollectionAccessObject.value.collection.data,
    )
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
    <RouterLink to="/" class="pl-2 pt-2">
      <Button
        icon="pi pi-home"
        aria-label="Home"
        class="w-2rem h-2rem"
        title="Go to overview"
      ></Button>
    </RouterLink>
    <div class="header flex align-items-center justify-content-center gap-3">
      <h2 class="info mt-0">
        {{ collectionAccessObject?.collection.data.label }}
      </h2>
    </div>
    <Splitter
      class="flex-grow-1 overflow-y-auto"
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
              style="display: block; margin: 0 auto"
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
