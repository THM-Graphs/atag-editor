<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import Search from './Search.vue';
import { useEditCollectionNetwork } from '../../src/composables/useEditCollectionNetwork';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import { Tag, ToastServiceMethods, useToast } from 'primevue';
import { Collection, CollectionNetworkActionType, NetworkPostData } from '../models/types';
import { capitalize } from '../utils/helper/helper';
import InvalidCollectionTargetError from '../utils/errors/invalidCollectionTarget.error';

// TODO: Or use store directly...?
const props = defineProps<{
  isVisible: boolean;
  action?: CollectionNetworkActionType;
  collections?: Collection[];
  parent: Collection | null;
}>();

const toast: ToastServiceMethods = useToast();

const isMoveAction: ComputedRef<boolean> = computed((): boolean => {
  const moveActions: CollectionNetworkActionType[] = ['reference', 'move'];

  return moveActions.includes(props.action);
});

const inputIsValid: ComputedRef<boolean> = computed((): boolean => {
  if (isMoveAction.value && !actionTarget.value) {
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

const message: ComputedRef<string> = computed(() => {
  const collectionCount: number = props.collections?.length ?? 0;
  const base: string = `${collectionCount} collection${collectionCount > 1 ? 's' : ''} ${collectionCount > 1 ? 'are' : 'is'} about to be`;

  switch (props.action) {
    case 'reference':
      return `${base} additionally attached to another parent`;
    case 'move':
      return `${base} moved to another parent`;
    case 'dereference':
      return `${base} detached from this collection`;
    case 'delete':
      return `${base} removed completely`;
  }
});

const errorMessages = ref([]);
const errorMessageCount = ref(0);

const actionLabel: ComputedRef<string> = computed(() => {
  return capitalize(props.action);
});

const { isFetching, executeAction } = useEditCollectionNetwork();

async function finishAction(): Promise<void> {
  const data: NetworkPostData = {
    type: props.action,
    nodes: props.collections ?? [],
    origin: props.parent ?? null,
    target: actionTarget.value ?? null,
  };

  try {
    await executeAction(data);

    emit('actionDone', {
      type: props.action,
      data: props.collections,
    });
  } catch (error: unknown) {
    showMessage('error', error as Error);
  }
}

function handleSearchItemSelected(collection: Collection): void {
  const uuids: string[] = props.collections.map(c => c.data.uuid);

  clearErrorMessages();

  try {
    if (uuids.includes(collection.data.uuid)) {
      throw new InvalidCollectionTargetError(
        'Collection can not be used as target since it is included in the ongoing action',
      );
    }

    if (props.parent?.data.uuid === collection.data.uuid) {
      throw new InvalidCollectionTargetError(
        'Collection can not be used as target they are already connected to it',
      );
    }

    actionTarget.value = collection;
  } catch (error: unknown) {
    addErrorMessage(error);
  }
}

function addErrorMessage(error: InvalidCollectionTargetError | unknown): void {
  if (error instanceof InvalidCollectionTargetError) {
    errorMessages.value.push({
      severity: error.severity,
      content: error.message,
      id: errorMessageCount.value++,
    });
  } else {
    errorMessages.value.push({
      severity: 'error',
      content: 'An unknown error occurred.',
      id: errorMessageCount.value++,
    });
  }
}

function clearErrorMessages(): void {
  errorMessageCount.value = 0;
  errorMessages.value = [];
}

function showMessage(result: 'success' | 'error', error?: Error) {
  toast.add({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Error saving changes',
    detail: error?.message ?? '',
    life: 2000,
  });
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
        <h4>{{ message }}</h4>
      </div>

      <div v-if="isMoveAction" class="target-container">
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

        <Message v-for="msg of errorMessages" :key="msg.id" :severity="msg.severity" closable>{{
          msg.content
        }}</Message>
        <Search v-if="!actionTarget" @item-selected="handleSearchItemSelected" />
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
        :loading="isFetching"
        :disabled="!inputIsValid || isFetching"
        @click="finishAction"
      ></Button>
    </div>
  </Dialog>
</template>

<style scoped></style>
