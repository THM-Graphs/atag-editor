<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CollectionAccessObject } from '../models/types';
import { buildFetchUrl } from '../utils/helper/helper';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import Card from 'primevue/card';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const route: RouteLocationNormalizedLoaded = useRoute();
const collectionUuid: string = route.params.uuid as string;

const collectionAccessObject = ref<CollectionAccessObject | null>(null);

onMounted(async (): Promise<void> => {
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

  <div v-else class="container flex flex-column h-screen m-auto">
    You are seeing the collection with the UUID {{ collectionUuid }} and its texts :)
    <Card>
      <template #title
        ><div>
          {{ collectionAccessObject?.collection.data.label }}
        </div></template
      >
      <template #content>
        Collection data:
        <p class="m-0">
          {{ collectionAccessObject.collection.data }}
        </p>
        <div>
          It has {{ collectionAccessObject.texts.length }} texts:
          <div class="flex">
            <div v-for="text in collectionAccessObject.texts" class="text-box">
              {{ text.data }}
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.container {
  width: 80%;
  min-width: 800px;
}

.text-box {
  width: 400px;
  border: 2px solid grey;
}
</style>
