<script setup lang="ts">
import { InputGroup, InputText, Button } from 'primevue';
import { useCollectionManagerStore } from '../store/collectionManager';
import CollectionItem from './CollectionItem.vue';
import { useRouter } from 'vue-router';
import { CollectionAccessObject } from '../models/types';

const { activeCollection, levels, fetchCollectionDetails, setCollectionActive } =
  useCollectionManagerStore();

const router = useRouter();

const props = defineProps<{
  index: number;
}>();

function updateUrlPath(uuid: string, index: number): void {
  const isAlreadyActive: boolean = levels.value[index].activeUuid === uuid;

  // Return if no update needed
  if (isAlreadyActive) {
    return;
  }

  const uuidPath: string | null = new URLSearchParams(window.location.search).get('path');

  const currentUuids: string[] = uuidPath?.split(',') ?? [];

  // Remove columns to the right of initiator column
  // levels.value = levels.value.slice(0, index + 1);

  const newUuids: string[] = [...currentUuids.slice(0, index), uuid];

  // const newSearchParams = new URLSearchParams();
  // newSearchParams.set('path', newUuids.join(','));

  router.push({ query: { path: newUuids.join(',') } });

  // console.log(route.query);

  // Set active
  // levels.value[index].activeUuid = uuid;

  // const newActiveCollection = levels.value[index].data.find(c => c.data.uuid === uuid);
}

async function handleItemSelected(uuid: string): Promise<void> {
  const isAlreadySelectedInColumn: boolean = uuid === levels.value[props.index].activeUuid;

  const isAlreadyActiveInEditPane: boolean =
    isAlreadySelectedInColumn && uuid === activeCollection.value.collection.data.uuid;

  // Nothing happens, return;
  if (isAlreadyActiveInEditPane) {
    return;
  }

  // Only update collection in edit pane. Leave navigation path intact
  if (isAlreadySelectedInColumn) {
    const cao: CollectionAccessObject = await fetchCollectionDetails(props.index, uuid);

    setCollectionActive(cao);

    return;
  }

  // Else, change URL and let the watcher handle the rest
  updateUrlPath(uuid, props.index);
}
</script>

<template>
  <div class="column flex flex-column">
    <div class="header p-1">
      <InputGroup>
        <InputText size="small" spellcheck="false" placeholder="Filter by label" />
        <Button size="small" severity="secondary" icon="pi pi-filter" />
      </InputGroup>
    </div>
    <div class="content flex-grow-1">
      <CollectionItem
        v-for="collection of levels[props.index].data"
        :key="collection.data.uuid"
        :collection="collection"
        :isActive="levels[props.index].activeUuid === collection.data.uuid"
        @item-selected="handleItemSelected"
      ></CollectionItem>
    </div>
    <div class="footer p-1 flex justify-content-center">
      <Button size="small" severity="secondary" icon="pi pi-plus" label="Add Collection" />
    </div>
  </div>
</template>

<style scoped>
.column {
  border: 1px solid blue;
  min-width: 200px;
}

.content {
  border: 1px solid red;
  overflow-y: scroll;
  overflow-x: hidden;
}
</style>
