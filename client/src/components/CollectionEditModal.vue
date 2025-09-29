<script setup lang="ts">
import { computed, ComputedRef, inject, ref, watch } from 'vue';
import Search from './Search.vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import { ToastServiceMethods, useToast } from 'primevue';
import { Collection, CollectionNetworkActionType, NetworkPostData } from '../models/types';
import { capitalize } from '../utils/helper/helper';
import InvalidCollectionTargetError from '../utils/errors/invalidCollectionTarget.error';
import { useAppStore } from '../store/app';
import NodeTag from './NodeTag.vue';
import { useRoute } from 'vue-router';

const emit = defineEmits(['actionDone', 'actionCanceled']);

const route = useRoute();

const { api } = useAppStore();
const toast: ToastServiceMethods = useToast();

const asyncOperationRunning = ref<boolean>(false);

// Must be computed's since PrimeVue's Dialog Service does not allow custom props for components
const action = computed<CollectionNetworkActionType | null>(() => {
  return dialogRef?.value?.data?.action || null;
});

const parent = computed<Collection | null>(() => {
  return dialogRef?.value?.data?.parent || null;
});

const collections = computed<Collection[]>(() => {
  return dialogRef?.value?.data?.collections || [];
});

const dialogRef: any = inject('dialogRef');

const isMoveAction: ComputedRef<boolean> = computed((): boolean => {
  const moveActions: CollectionNetworkActionType[] = ['reference', 'move'];

  return moveActions.includes(action.value);
});

const inputIsValid: ComputedRef<boolean> = computed((): boolean => {
  if (isMoveAction.value && !actionTarget.value) {
    return false;
  }

  return true;
});

watch(() => route.path, closeModal);

// ------------------------- UI stuff ------------------------

// This is the Collection node the selected collections/texts will be attached to.
const actionTarget = ref<Collection | null>(null);

const title: ComputedRef<string> = computed(() => {
  return capitalize(action.value) + ' collections';
});

const message: ComputedRef<string> = computed(() => {
  const collectionCount: number = collections?.value?.length ?? 0;
  const base: string = `${collectionCount} collection${collectionCount > 1 ? 's' : ''} ${collectionCount > 1 ? 'are' : 'is'} about to be`;

  switch (action.value) {
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
  return capitalize(action.value);
});

async function finishAction(): Promise<void> {
  asyncOperationRunning.value = true;

  const data: NetworkPostData = {
    type: action.value,
    nodes: collections.value ?? [],
    origin: parent.value ?? null,
    target: actionTarget.value ?? null,
  };

  try {
    await api.updateNetwork(data);

    emit('actionDone', {
      type: action.value,
      data: collections?.value,
    });
  } catch (error: unknown) {
    showMessage('error', error as Error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

function handleSearchItemSelected(collection: Collection): void {
  const uuids: string[] = collections?.value?.map(c => c.data.uuid);

  clearErrorMessages();

  try {
    if (uuids.includes(collection.data.uuid)) {
      throw new InvalidCollectionTargetError(
        'Collection can not be used as target since it is included in the ongoing action',
      );
    }

    if (parent.value?.data.uuid === collection.data.uuid) {
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

function closeModal(): void {
  dialogRef.value.close();
}

function showMessage(result: 'success' | 'error', error?: Error) {
  toast.add({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Error saving changes',
    detail: error?.message ?? '',
    life: 2000,
  });
}

async function handleCancelClick(): Promise<void> {
  closeModal();
}

function removeActionTarget(): void {
  actionTarget.value = null;
}
</script>

<template>
  <h2 class="w-full text-center m-0">{{ title }}</h2>

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
              <NodeTag
                v-for="nodeLabel in actionTarget.nodeLabels"
                :content="nodeLabel"
                type="Collection"
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
      @click="handleCancelClick"
    ></Button>
    <Button
      type="submit"
      :label="actionLabel"
      :title="title"
      :loading="asyncOperationRunning"
      :disabled="!inputIsValid || asyncOperationRunning"
      @click="finishAction"
    ></Button>
  </div>
</template>

<style scoped></style>
