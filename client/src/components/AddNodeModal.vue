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

const nodeAsCollection = computed(
  () => (nodeToAdd.value ?? undefined) as NodeStatusObject<CollectionNode> | undefined,
);
const nodeAsText = computed(
  () => (nodeToAdd.value ?? undefined) as NodeStatusObject<TextNode> | undefined,
);
const nodeAsEntity = computed(
  () => (nodeToAdd.value ?? undefined) as NodeStatusObject<EntityNode> | undefined,
);

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

function handleGoBack(): void {
  setNode(null);
  setPipelineStep('choosing');
}

function closeModal(): void {
  dialogRef.value?.close();
}
</script>

<template>
  <div class="container">
    <template v-if="currentStep === 'choosing'">
      <NodeSearchbar :base-node-label="baseNodeLabel" @item-selected="handleSearchItemSelected" />
    </template>
    <template v-if="currentStep === 'editing'">
      <h2>Edit your data here :)</h2>
    </template>
    <template v-if="currentStep === 'finishing'">
      <CollectionCard
        v-if="baseNodeLabel === 'Collection'"
        :model-value="nodeAsCollection"
        mode="view"
      />
      <TextCard v-if="baseNodeLabel === 'Content'" :model-value="nodeAsText" mode="view" />
      <EntityCard v-if="baseNodeLabel === 'Entity'" :model-value="nodeAsEntity" mode="view" />
      <div class="flex justify-content-center gap-2 mt-4 w-full">
        <Button label="Add" icon="pi pi-plus" @click="handleFinishClick" />
        <Button
          label="Go back"
          icon="pi pi-arrow-left"
          severity="secondary"
          @click="handleGoBack"
        />
      </div>
    </template>
  </div>
</template>

<style scoped></style>
