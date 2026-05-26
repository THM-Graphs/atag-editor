<script setup lang="ts">
import { ref, inject, watch, computed, toValue } from 'vue';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import { useRoute } from 'vue-router';
import { CollectionNode, EntityNode, NodeDto, NodeStatusObject, TextNode } from '../models/types';
import NodeSearchbar from './NodeSearchbar.vue';
import CollectionCard from './CollectionCard.vue';
import FormPropertiesSection from './FormPropertiesSection.vue';
import NodeTag from './NodeTag.vue';
import { useAppStore } from '../store/app';
import { useGuidelinesStore } from '../store/guidelines';
import {
  createCollectionNode,
  createNodeDtoFromNode,
  createNodeStatusObjectFromRawData,
} from '../utils/helper/helper';

type Mode = 'new' | 'existing';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success', collection: NodeDto<CollectionNode>): void;
}>();

const route = useRoute();

const { api, addToastMessage } = useAppStore();
const { getCollectionConfigFields, getAvailableCollectionLabels } = useGuidelinesStore();

const dialogRef: any = inject('dialogRef');

const mode: Mode = dialogRef.value.data.mode;
const parentCollection: CollectionNode | null = dialogRef.value.data.parentCollection;

const isLoading = ref<boolean>(false);
const newCollectionNode = ref<CollectionNode>(createCollectionNode());
const additionalLabels = ref<string[]>([]);
const allLabels = computed<string[]>(() => ['Collection', ...additionalLabels.value]);
const availableCollectionLabels = getAvailableCollectionLabels();
const collectionFields = computed(() => getCollectionConfigFields(allLabels.value));

const selectedCollection = ref<CollectionNode | null>(null);
const selectedAsStatusObject = computed(() =>
  selectedCollection.value
    ? (createNodeStatusObjectFromRawData(
        createNodeDtoFromNode(selectedCollection.value),
      ) as NodeStatusObject<CollectionNode>)
    : undefined,
);

const inputIsValid = computed<boolean>(() => {
  if (mode === 'new') {
    return newCollectionNode.value.data.label.trim().length > 0;
  }

  return selectedCollection.value !== null;
});

watch(() => route.path, closeModal);

function closeModal() {
  dialogRef.value?.close();
}

function handleSearchItemSelected(item: CollectionNode | EntityNode | TextNode) {
  selectedCollection.value = item as CollectionNode;
}

function wrapDataForCreation(
  collectionNode: CollectionNode,
  parent: CollectionNode | null,
  status: 'created' | 'added',
): NodeStatusObject {
  const nodeStatusObject: NodeStatusObject<CollectionNode> = {
    node: collectionNode,
    connectedNodes: [],
    meta: { status },
  };

  if (!parent) {
    return nodeStatusObject;
  }

  return {
    node: parent,
    connectedNodes: [nodeStatusObject],
    meta: { status: 'unchanged' },
  };
}

async function handleSubmit() {
  const collectionNode =
    mode === 'new'
      ? { ...newCollectionNode.value, nodeLabels: allLabels.value }
      : selectedCollection.value!;
  const status = mode === 'new' ? 'created' : 'added';

  isLoading.value = true;

  try {
    const updateObj: NodeStatusObject = wrapDataForCreation(
      collectionNode,
      parentCollection,
      status,
    );

    const result: NodeDto<CollectionNode> = await api.createOrAddCollection(
      collectionNode.data.uuid,
      updateObj,
    );

    emit('success', toValue(result));

    dialogRef.value.close({ collection: result.node });
  } catch {
    addToastMessage({
      severity: 'error',
      summary: 'Error',
      detail: mode === 'new' ? 'Failed to create collection.' : 'Failed to add collection.',
      life: 3000,
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="container flex flex-column gap-3">
    <template v-if="mode === 'new'">
      <div class="flex flex-column gap-1">
        <h3 class="text-center">Labels</h3>
        <MultiSelect
          v-model="additionalLabels"
          :options="availableCollectionLabels"
          display="chip"
          placeholder="Select labels"
          :filter="false"
        >
          <template #chip="{ value }">
            <NodeTag :content="value" type="Collection" class="mr-1" />
          </template>
        </MultiSelect>
      </div>
      <div class="flex flex-column gap-1">
        <h3 class="text-center">Properties</h3>
        <FormPropertiesSection
          v-model="newCollectionNode.data"
          :fields="collectionFields"
          mode="edit"
        />
      </div>
    </template>

    <template v-else>
      <NodeSearchbar base-node-label="Collection" @item-selected="handleSearchItemSelected" />
      <CollectionCard
        v-if="selectedAsStatusObject"
        :model-value="selectedAsStatusObject"
        mode="view"
      />
    </template>

    <div class="flex justify-content-center gap-2">
      <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="closeModal" />
      <Button
        :disabled="!inputIsValid"
        :loading="isLoading"
        :label="mode === 'new' ? 'Create' : 'Add'"
        :icon="mode === 'new' ? 'pi pi-plus' : 'pi pi-check'"
        @click="handleSubmit"
      />
    </div>
  </div>
</template>

<style scoped>
.container {
  min-width: 350px;
}
</style>
