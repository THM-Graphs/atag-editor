<script setup lang="ts">
import ICollection from '../models/ICollection';
import Button from 'primevue/button';

defineProps<{
  collections: ICollection[];
}>();

const emit = defineEmits(['collectionDeleted']);

async function deleteCollection(uuid: string): Promise<void> {
  try {
    // TODO: Replace localhost with vite configuration
    const url: string = `http://localhost:8080/api/collections/${uuid}`;
    const response: Response = await fetch(url, {
      method: 'DELETE',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ uuid: uuid }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    emit('collectionDeleted');
  } catch (error: unknown) {
    console.error('Error deleting collection:', error);
  }
}
</script>

<template>
  <div class="list-container">
    <ul>
      <li
        class="list-item flex justify-content-between gap-6 flex-grow-1 text-xl p-3"
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
          @click="deleteCollection(collection.uuid)"
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
  /* border: 2px solid gray;
  border-radius: 5px; */
  margin: 1rem;
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
