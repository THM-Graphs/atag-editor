<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CollectionAccessObject } from '../models/types';
import { buildFetchUrl } from '../utils/helper/helper';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import Button from 'primevue/button';
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

  <div v-else class="container h-screen m-auto">
    <div class="header flex align-items-center justify-content-center gap-3">
      <RouterLink to="/">
        <Button
          icon="pi pi-home"
          aria-label="Home"
          class="w-2rem h-2rem"
          title="Go to overview"
        ></Button>
      </RouterLink>
      <h3 class="info">
        You are seeing the collection with the UUID {{ collectionUuid }} and its texts :)
      </h3>
    </div>
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
              <a :href="`/texts/${text.data.uuid}`"> {{ text.data.text.slice(0, 100) }}... </a>
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
  border: 2px solid grey;
}
</style>
