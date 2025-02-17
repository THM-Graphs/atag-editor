<script setup lang="ts">
import { computed, ComputedRef, onMounted, ref } from 'vue';
import { CollectionAccessObject, CollectionProperty } from '../models/types';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import { useGuidelinesStore } from '../store/guidelines';
import { buildFetchUrl, capitalize } from '../utils/helper/helper';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import { IGuidelines } from '../models/IGuidelines';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Toast from 'primevue/toast';
import { ToastServiceMethods } from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';

const route: RouteLocationNormalizedLoaded = useRoute();

const collectionUuid: string = route.params.uuid as string;

const collectionAccessObject = ref<CollectionAccessObject | null>(null);
const mode = ref<'view' | 'edit'>('view');
const asyncOperationRunning = ref<boolean>(false);

const toast: ToastServiceMethods = useToast();
const { guidelines, initializeGuidelines } = useGuidelinesStore();

// TODO: Still a workaround, should be mady dynamic.
const fields: ComputedRef<CollectionProperty[]> = computed(() => {
  if (collectionAccessObject.value.collection.nodeLabel === 'Letter') {
    return guidelines.value ? guidelines.value.collections['text'].properties : [];
  } else {
    return guidelines.value ? guidelines.value.collections['comment'].properties : [];
  }
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

async function handleSaveChanges(): Promise<void> {
  // return;
  // if (!hasUnsavedChanges()) {
  //   console.log('no changes made, no request needed');
  //   return;
  // }

  asyncOperationRunning.value = true;

  try {
    asyncOperationRunning.value = false;
    toggleEditMode();
    showMessage('success');
  } catch (error: unknown) {
    showMessage('error', error as Error);
    console.error('Error updating collection:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

async function handleCancelChanges(): Promise<void> {
  // TODO: Set initial data again...
  toggleEditMode();
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

onMounted(async (): Promise<void> => {
  await getGuidelines();
  await getCollection();
});

async function getCollection(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/collections/${collectionUuid}`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedCollectionAccessObject: CollectionAccessObject = await response.json();
    collectionAccessObject.value = fetchedCollectionAccessObject;
  } catch (error: unknown) {
    console.error('Error fetching collection:', error);
  }
}
</script>

<template>
  <LoadingSpinner v-if="!collectionAccessObject" />
  <div v-else class="container h-screen m-auto flex flex-column">
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
    <div class="flex flex-grow-1">
      <div class="properties-pane">
        <h3 class="text-center">Properties</h3>
        <form>
          <div class="input-container" v-for="field in fields">
            <div class="flex align-items-center gap-3 mb-3">
              <label :for="field.name" class="w-10rem font-semibold"
                >{{ capitalize(field.name) }}
              </label>
              <InputText
                :id="field.name"
                :disabled="!field.editable"
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
          <div class="scrollbox">
            <div v-for="text in collectionAccessObject.texts" class="text-box">
              <a :href="`/texts/${text.data.uuid}`"> {{ text.data.text.slice(0, 100) }}... </a>
            </div>
          </div>
          <Button
            label="Add new text"
            title="Add new text to collection"
            icon="pi pi-plus"
            style="display: block; margin: 0 auto"
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
.container {
  width: 80%;
  min-width: 800px;
}

.properties-pane,
.texts-pane {
  outline: 1px solid green;
  padding: 1rem;
}

.text-box {
  border: 2px solid grey;
}
</style>
