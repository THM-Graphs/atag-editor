<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog';
import LoadingSpinner from './LoadingSpinner.vue';
import Button from 'primevue/button';
import { useConfirm } from 'primevue/useconfirm';
import ICollection from '../models/ICollection';

defineProps<{
  collections: ICollection[] | null;
}>();

const emit = defineEmits(['collectionDeleted']);

const confirm = useConfirm();

async function deleteCollection(collection: ICollection): Promise<void> {
  confirm.require({
    message: `Are you sure you want to delete "${collection.label}"?`,
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger ',
    accept: async (): Promise<void> => {
      try {
        // TODO: Replace localhost with vite configuration
        const url: string = `http://localhost:8080/api/collections/${collection.uuid}`;
        const response: Response = await fetch(url, {
          method: 'DELETE',
          cache: 'no-cache',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          referrerPolicy: 'no-referrer',
          body: JSON.stringify({ uuid: collection.uuid }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        emit('collectionDeleted', collection);
      } catch (error: unknown) {
        console.error('Error deleting collection:', error);
      }
    },
  });
}
</script>

<template>
  <ConfirmDialog :draggable="false" :closable="false" :style="{ width: '25rem' }" />
  <div class="list-container">
    <LoadingSpinner v-if="!collections" />
    <ul v-else>
      <li
        class="list-item flex justify-content-between gap-6 flex-grow-1 text-xl m-3 p-3"
        v-for="collection in collections"
        :key="collection.uuid"
      >
        <div class="title">
          <RouterLink :to="`/texts/${collection.uuid}`">{{ collection.label }} </RouterLink>
        </div>
        <Button
          class="button-delete-collection"
          icon="pi pi-trash"
          aria-label="Delete text"
          label=""
          severity="danger"
          @click="deleteCollection(collection)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list-container {
  overflow-y: auto;
  margin-bottom: 1rem;
  flex-grow: 1;
}

.list-item {
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px -1px rgba(0, 0, 0, 0.1);
  border-radius: 6px;

  .button-delete-collection {
    opacity: 0;
  }

  &:hover {
    .button-delete-collection {
      opacity: 1;
    }
  }
}
</style>
