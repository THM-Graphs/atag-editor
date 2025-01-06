<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue';
import ICollection from '../models/ICollection';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup'; // optional
import Row from 'primevue/row'; // optional
import Button from 'primevue/button';
import { CollectionProperty } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import { buildFetchUrl, capitalize } from '../utils/helper/helper';
import { IGuidelines } from '../models/IGuidelines';
import { onMounted, ref } from 'vue';

defineProps<{
  collections: ICollection[] | null;
}>();

const { guidelines, getCollectionFields } = useGuidelinesStore();
const columns = ref<CollectionProperty[]>([]);

onMounted(async (): Promise<void> => {
  await getGuidelines();

  columns.value = getCollectionFields();
});

// TODO: Add loading spinner to overview again (better than before)

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
    <DataTable
      :value="collections"
      paginator
      :rows="5"
      :rowsPerPageOptions="[5, 10, 20, 50, 100]"
      removableSort
      resizableColumns
      rowHover
    >
      <Column
        v-for="col of columns"
        :key="col.name"
        :field="col.name"
        :header="capitalize(col.name)"
        sortable
      >
        <template #body="slotProps">
          <!-- TODO: This should come from the configuration... -->
          <a v-if="col.name === 'label'" :href="'/texts/' + slotProps.data.uuid">{{
            slotProps.data[col.name]
          }}</a>
          <span v-else>{{ slotProps.data[col.name] }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped></style>
