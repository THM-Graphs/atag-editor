<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useGuidelinesStore } from '../store/guidelines';
import LoadingSpinner from './LoadingSpinner.vue';
import { buildFetchUrl, capitalize } from '../utils/helper/helper';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ICollection from '../models/ICollection';
import { IGuidelines } from '../models/IGuidelines';
import { CollectionProperty } from '../models/types';

defineProps<{
  collections: ICollection[] | null;
}>();

const { guidelines, getCollectionFields } = useGuidelinesStore();
const columns = ref<CollectionProperty[]>([]);

onMounted(async (): Promise<void> => {
  await getGuidelines();

  columns.value = getCollectionFields();
});

// TODO: getGuidelines exists in multiple components now, should be moved to a shared location
async function getGuidelines(): Promise<void> {
  try {
    const url: string = buildFetchUrl(`/api/guidelines`);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedGuidelines: IGuidelines = await response.json();

    guidelines.value = fetchedGuidelines;
  } catch (error: unknown) {
    console.error('Error fetching guidelines:', error);
  }
}
</script>

<template>
  <div class="card flex-grow-1 overflow-y-auto">
    <LoadingSpinner v-if="!collections" />
    <DataTable
      v-else
      scrollable
      scrollHeight="flex"
      :value="collections"
      paginator
      :rows="10"
      :rowsPerPageOptions="[5, 10, 20, 50, 100]"
      removableSort
      resizableColumns
      rowHover
      tableStyle="table-layout: fixed;"
    >
      <Column
        v-for="col of columns"
        :key="col.name"
        :field="col.name"
        :header="capitalize(col.name)"
        sortable
        :style="{
          overflowX: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }"
      >
        <template #body="{ data }">
          <!-- TODO: This should come from the configuration... -->
          <a v-if="col.name === 'label'" :href="'/texts/' + data.uuid">{{ data[col.name] }}</a>
          <span v-else>{{ data[col.name] }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped></style>
