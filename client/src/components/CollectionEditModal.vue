<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import Search from './Search.vue';
import { useEditCollectionNetwork } from '../../src/composables/useEditCollectionNetwork';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import { Tag } from 'primevue';
import { Collection, CollectionNetworkActionType, NetworkPostData, Text } from '../models/types';
import { capitalize } from '../utils/helper/helper';

// TODO: Or use store directly...?
const props = defineProps<{
  isVisible: boolean;
  action?: CollectionNetworkActionType;
  collections?: Collection[];
  parent: Collection | null;
}>();

const inputIsValid: ComputedRef<boolean> = computed((): boolean => {
  if (['copy', 'move'].includes(props.action) && !actionTarget.value) {
    return false;
  }

  return true;
});

const emit = defineEmits(['actionDone', 'actionCanceled']);

// This is the Collection node the selected collections/texts will be attached to.
const actionTarget = ref<Collection | null>(null);

const title: ComputedRef<string> = computed(() => {
  return capitalize(props.action) + ' collections';
});

const actionLabel: ComputedRef<string> = computed(() => {
  return capitalize(props.action);
});

const { isSaving, executeAction } = useEditCollectionNetwork();

async function finishAction(): Promise<void> {
  const data: NetworkPostData = {
    type: props.action,
    nodes: props.collections ?? [],
    origin: props.parent ?? null,
    target: actionTarget.value ?? null,
  };

  executeAction(data);

  emit('actionDone', {
    type: props.action,
    data: props.collections,
  });
}

// TODO: Check if collection is valid...

function handleSearchSelected(collection: Collection): void {
  actionTarget.value = collection;
}

async function hideDialog(): Promise<void> {
  emit('actionCanceled');
}

function removeActionTarget(): void {
  actionTarget.value = null;
}
</script>

<template>
  <Dialog
    v-model:visible="props.isVisible"
    modal
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '25rem' }"
  >
    <template #header>
      <h2 class="w-full text-center m-0">{{ title }}</h2>
    </template>

    <div class="content text-center mb-2">
      <div class="updates-container">
        <h4>Collections to be updated</h4>
        <ul>
          <li v-for="collection in props.collections" :key="collection.data.uuid">
            <span>
              {{ collection.nodeLabels }}
            </span>
            <span>
              {{ collection.data.label }}
            </span>
          </li>
        </ul>
      </div>

      <div class="target-container">
        <h4>Attach to new collection:</h4>

        <div v-if="actionTarget" class="flex justify-content-between align-items-center gap-2">
          <Card>
            <template #content>
              <div class="flex gap-2">
                <Tag
                  v-for="nodeLabel in actionTarget.nodeLabels"
                  :value="nodeLabel"
                  severity="contrast"
                  class="mr-1"
                />
                <div>{{ actionTarget.data.label }}</div>
              </div>
            </template>
          </Card>
          <Button
            icon="pi pi-times"
            size="small"
            class="w-2rem h-2rem"
            severity="danger"
            title="Remove selected collection"
            aria-label="Remove selected collection"
            @click="removeActionTarget"
          ></Button>
        </div>

        <Search v-if="!actionTarget" @collection-selected="handleSearchSelected" />
      </div>
    </div>

    <div class="button-container flex justify-content-end gap-2">
      <Button
        type="button"
        label="Cancel"
        title="Cancel"
        severity="secondary"
        @click="hideDialog"
      ></Button>
      <Button
        type="submit"
        :label="actionLabel"
        :title="title"
        :loading="isSaving"
        :disabled="!inputIsValid"
        @click="finishAction"
      ></Button>
    </div>
  </Dialog>
</template>

<style scoped></style>
