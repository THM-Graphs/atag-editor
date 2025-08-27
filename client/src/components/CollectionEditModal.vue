<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import Search from './Search.vue';
import { useEditCollectionNetwork } from '../../src/composables/useEditCollectionNetwork';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { Collection, CollectionNetworkActionType, NetworkPostData, Text } from '../models/types';
import { capitalize } from '../utils/helper/helper';

// TODO: Or use store directly...?
const props = defineProps<{
  isVisible: boolean;
  action?: CollectionNetworkActionType;
  collections?: Collection[];
  parent: Collection | null;
}>();

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

async function hideDialog(): Promise<void> {
  emit('actionCanceled');
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

    <div class="content-container">
      <div>Action: {{ props.action }}</div>

      <div class="collections">
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

      <div v-if="['move', 'copy'].includes(props.action)">
        Choose your target

        <Search />
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
        title="Create new text"
        :loading="isSaving"
        @click="finishAction"
      ></Button>
    </div>
  </Dialog>
</template>

<style scoped></style>
