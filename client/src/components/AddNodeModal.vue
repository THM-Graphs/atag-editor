<script setup lang="ts">
import { ref, computed, inject, watch, toValue } from 'vue';
import Button from 'primevue/button';
import { useAddNode } from '../composables/useAddNode';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import {
  BaseNodeLabel,
  NodeStatusObject,
  CollectionNode,
  TextNode,
  EntityNode,
} from '../models/types';
import NodeSearchbar from './NodeSearchbar.vue';
import CollectionCard from './CollectionCard.vue';
import TextCard from './TextCard.vue';
import EntityCard from './EntityCard.vue';

const dialogRef: any = inject('dialogRef');
const route: RouteLocationNormalizedLoaded = useRoute();

const {
  currentStep,
  node: nodeToAdd,
  setPipelineStep,
  setNode,
  cancel: cancelProcess,
  finish: finishProcess,
} = useAddNode();

const baseNodeLabel: BaseNodeLabel = dialogRef.value.data.baseNodeLabel;

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', node: NodeStatusObject): void;
}>();

// well with the initial data fetching logic. Therefore, an component wide loading state is used.
const isLoading = ref<boolean>(false);

const inputIsValid = computed<boolean>(() => {
  // if (chooseOption.value === 'raw') {
  //   return rawJson.value.length > 0;
  // } else {
  //   return fileupload.value?.files.length === 1;
  // }
  return false;
});

watch(() => route.path, closeModal);

function handleFinishClick(): void {
  if (!nodeToAdd.value) {
    return;
  }

  emit('submit', toValue(nodeToAdd) as NodeStatusObject);

  finishProcess();
  closeModal();
}

function handleSearchItemSelected(item: CollectionNode | TextNode | EntityNode) {
  setNode({
    node: item,
    connectedNodes: [],
    meta: { status: 'added' },
  });

  setPipelineStep('finishing');
}

async function handleCancelClick(): Promise<void> {
  cancelProcess();
  closeModal();
}

function closeModal(): void {
  dialogRef.value?.close();
}
</script>

<template>
  <h2 class="w-full m-0 text-center">Add {{ baseNodeLabel }} Node</h2>
  <template v-if="currentStep === 'choosing'">
    <NodeSearchbar :base-node-label="baseNodeLabel" @item-selected="handleSearchItemSelected" />
  </template>
  <template v-if="currentStep === 'editing'">
    <h2>Edit your data here :)</h2>
  </template>
  <template v-if="currentStep === 'finishing'">
    <CollectionCard
      v-if="baseNodeLabel === 'Collection'"
      v-model="nodeToAdd as NodeStatusObject<CollectionNode>"
      mode="view"
    />
    <TextCard
      v-if="baseNodeLabel === 'Text'"
      v-model="nodeToAdd as NodeStatusObject<TextNode>"
      mode="view"
    />
    <EntityCard
      v-if="baseNodeLabel === 'Entity'"
      v-model="nodeToAdd as NodeStatusObject<EntityNode>"
      mode="view"
    />
    <div class="flex justify-content-center gap-2 mt-4 w-full">
      <Button label="Add" icon="pi pi-plus" @click="handleFinishClick" />
      <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="handleCancelClick" />
    </div>
  </template>
</template>

<style scoped></style>
