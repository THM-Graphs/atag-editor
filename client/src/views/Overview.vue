<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ICollection from '../models/ICollection';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Card from 'primevue/card';

const collections = ref<ICollection[]>([]);

onMounted(async (): Promise<void> => {
  collections.value = await getCollections();
});

async function getCollections(): Promise<ICollection[]> {
  // TODO: Replace localhost with vite configuration
  const url: string = 'http://localhost:8080/api/collections';
  const response: Response = await fetch(url);
  const collections: ICollection[] = await response.json();

  collections.sort((a: ICollection, b: ICollection) => {
    if (a.label < b.label) {
      return -1;
    }
    if (a.label > b.label) {
      return 1;
    }
    return 0;
  });

  return collections;
}
</script>

<template>
  <div class="container">
    <h1>Available texts</h1>

    <Toolbar class="toolbar">
      <template #start>
        <IconField iconPosition="left">
          <InputIcon>
            <i class="pi pi-search" />
          </InputIcon>
          <InputText placeholder="Filter texts" />
        </IconField>
      </template>

      <template #end> <Button icon="pi pi-plus" aria-label="Submit" label="Add text" /> </template>
    </Toolbar>

    <span>{{ collections.length }} texts</span>
    <ul>
      <li v-for="collection in collections" :key="collection.uuid">
        <Card>
          <template #title>
            <RouterLink :to="`/texts/${collection.uuid}`">{{ collection.label }} </RouterLink>
          </template>
        </Card>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.container {
  margin: auto;
  width: 60%;
  min-width: 800px;
}

.toolbar {
  width: 60%;
  margin: auto;
}
</style>
