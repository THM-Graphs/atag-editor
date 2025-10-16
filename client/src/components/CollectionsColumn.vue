<script setup lang="ts">
import { InputGroup, InputText, Button } from 'primevue';
import { useCollectionManagerStore } from '../store/collectionManager';
import CollectionItem from './CollectionItem.vue';

const { levels } = useCollectionManagerStore();

const props = defineProps<{
  index: number;
}>();
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
  width: 200px;
}

.content {
  border: 1px solid red;
  overflow-y: scroll;
  overflow-x: hidden;
}
</style>
