<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Skeleton from 'primevue/skeleton';
import Toolbar from 'primevue/toolbar';
import { capitalize } from '../helper/helper';
import { IGuidelines } from '../../../server/src/models/IGuidelines';

const emit = defineEmits(['collectionCreated', 'searchInputChanged']);

const searchInput = ref<string>('');
const newCollectionData = ref<Record<string, string>>({});
const guidelines = ref<IGuidelines>({} as IGuidelines);

const dialogIsVisible = ref<boolean>(false);
const guidelinesAreLoaded = ref<boolean>(false);

// TODO: Fix form submission
async function createNewCollection(): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = 'http://localhost:8080/api/collections';
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

    newCollectionData.value = {};
    dialogIsVisible.value = false;

    emit('collectionCreated');
  } catch (error: unknown) {
    console.error('Error creating collection:', error);
  }
}

async function showDialog(): Promise<void> {
  dialogIsVisible.value = true;
  await getGuidelines();
}

async function hideDialog(): Promise<void> {
  dialogIsVisible.value = false;
  guidelinesAreLoaded.value = false;
}
async function getGuidelines(): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = 'http://localhost:8080/api/guidelines';
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedGuidelines: IGuidelines = await response.json();
    guidelines.value = fetchedGuidelines;
    guidelinesAreLoaded.value = true;
  } catch (error: unknown) {
    console.error('Error creating collection:', error);
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
        <InputText placeholder="Filter texts" v-model="searchInput" @input="handleSearchInput" />
      </IconField>
    </template>

    <template #end>
      <Button icon="pi pi-plus" aria-label="Submit" label="Add text" @click="showDialog" />
    </template>
  </Toolbar>
  <Dialog
    v-model:visible="dialogIsVisible"
    header="Add new text"
    modal
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '25rem' }"
  >
    <template #header>
      <h2 class="w-full text-center m-0">Add new text</h2>
    </template>
    <form @submit.prevent="createNewCollection">
      <div v-if="guidelinesAreLoaded" class="input-container">
        <template v-for="(property, index) in guidelines.collections['text'].properties">
          <div v-if="property.required" class="flex align-items-center gap-3 mb-3">
            <label :for="property.name" class="font-semibold w-6rem"
              >{{ capitalize(property.name) }}
            </label>
            <InputText
              :id="property.name"
              :disabled="!property.editable"
              :required="property.required"
              :autofocus="index === 0"
              :key="property.name"
              v-model="newCollectionData[property.name]"
              class="flex-auto"
              autocomplete="off"
            />
          </div>
        </template>
      </div>
      <div v-else class="skeleton-container">
        <div v-for="n in 4" class="flex flex-row gap-2">
          <Skeleton class="mb-3" height="2rem" width="10rem"></Skeleton>
          <Skeleton class="mb-3" height="2rem"></Skeleton>
        </div>
      </div>

      <div class="button-container flex justify-content-end gap-2">
        <Button type="button" label="Cancel" severity="secondary" @click="hideDialog"></Button>
        <Button type="submit" label="Create"></Button>
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
label {
  word-wrap: break-word;
}
</style>
