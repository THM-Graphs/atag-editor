<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';

import ButtonGroup from 'primevue/buttongroup';
import ToggleButton from 'primevue/togglebutton';
import { useCollectionManagerStore } from '../store/collectionManager';
import NodeTag from './NodeTag.vue';

defineProps<{}>();

const { activeCollection } = useCollectionManagerStore();

const mode = ref<'view' | 'edit'>('view');

const selectedView = ref<'texts' | 'details'>('texts');
const isTextsSelected = computed<boolean>(() => selectedView.value === 'texts');
const isDetailsSelected = computed<boolean>(() => selectedView.value === 'details');

function toggleViewMode(direction: 'texts' | 'details'): void {
  selectedView.value = direction;
}

function toggleEditMode(): void {
  if (mode.value === 'view') {
    // TODO: Do this too, but not now.
    // enrichCollectionData();
  }

  mode.value = mode.value === 'view' ? 'edit' : 'view';
}
</script>

<template>
  <div
    v-if="activeCollection"
    class="container h-full flex flex-column align-items-center text-center p-2"
  >
    <div class="main flex-grow-1 w-full">
      <h3>Label of Collection</h3>
      <ButtonGroup class="w-full flex">
        <ToggleButton
          :model-value="isTextsSelected"
          class="w-full"
          onLabel="Texts"
          offLabel="Texts"
          title="Show only annotations in current snippet"
          badge="2"
          @change="toggleViewMode('texts')"
        />
        <ToggleButton
          :model-value="isDetailsSelected"
          class="w-full"
          onLabel="Details"
          offLabel="Details"
          title="Show all annotations of text"
          badge="2"
          @change="toggleViewMode('details')"
        />
      </ButtonGroup>

      <div class="content">
        <div v-if="isTextsSelected" class="data">
          <div v-for="text in activeCollection.texts" :key="text.data.uuid">
            <div>{{ text.nodeLabels }}</div>
            <div>{{ text.data.text }}</div>
          </div>
        </div>
        <div v-else class="data">
          <div class="node-labels">
            <template v-for="label in activeCollection.collection.nodeLabels">
              <NodeTag :content="label" type="Collection" />
            </template>
          </div>
          <div class="properties">
            {{ activeCollection.collection.data }}
          </div>
        </div>
      </div>
    </div>

    <div class="buttons flex justify-content-center gap-2">
      <Button
        v-if="mode === 'view'"
        icon="pi pi-pencil"
        label="Edit"
        @click="toggleEditMode"
      ></Button>
      <Button
        v-if="mode === 'edit'"
        icon="pi pi-save"
        label="Save"
        @click="toggleEditMode"
      ></Button>
      <Button
        v-if="mode === 'edit'"
        icon="pi pi-times"
        label="Cancel"
        severity="secondary"
        @click="toggleEditMode"
      ></Button>
    </div>
  </div>
</template>

<style scoped>
.container {
  outline: 1px solid grey;
}
</style>
