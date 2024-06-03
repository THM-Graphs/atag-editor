<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Dialog from 'primevue/dialog';

const emit = defineEmits(['collectionCreated', 'searchInputChanged']);

const searchInput = ref<string>('');
const dialogIsVisible = ref<boolean>(false);
const newCollectionTitle = ref<string>('');

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
      body: JSON.stringify({ label: newCollectionTitle.value }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    newCollectionTitle.value = '';
    dialogIsVisible.value = false;

    emit('collectionCreated');
  } catch (error: unknown) {
    console.error('Error creating collection:', error);
  }
}

function handleInput(): void {
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
        <InputText placeholder="Filter texts" v-model="searchInput" @input="handleInput" />
      </IconField>
    </template>

    <template #end>
      <Button
        icon="pi pi-plus"
        aria-label="Submit"
        label="Add text"
        @click="dialogIsVisible = true"
      />
    </template>
  </Toolbar>
  <Dialog v-model:visible="dialogIsVisible" modal header="Add new text" :style="{ width: '25rem' }">
    <form @submit.prevent="createNewCollection">
      <div class="flex align-items-center gap-3 mb-3">
        <label for="title" class="font-semibold w-6rem">Title</label>
        <InputText
          id="title"
          class="flex-auto"
          autocomplete="off"
          required
          autofocus
          v-model="newCollectionTitle"
        />
      </div>
      <div class="flex justify-content-end gap-2">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          @click="dialogIsVisible = false"
        ></Button>
        <Button type="submit" label="Create"></Button>
      </div>
    </form>
  </Dialog>
</template>

<style scoped></style>
