<script setup lang="ts">
import { computed, ComputedRef, onMounted, ref } from 'vue';
import { useGuidelinesStore } from '../store/guidelines';
import LoadingSpinner from './LoadingSpinner.vue';
import { buildFetchUrl, capitalize } from '../utils/helper/helper';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { IGuidelines } from '../models/IGuidelines';
import { CollectionAccessObject, CollectionProperty } from '../models/types';

type CollectionTableEntry = {
  [key: string | keyof CollectionProperty]: unknown;
};

const props = defineProps<{
  collections: CollectionAccessObject[] | null;
}>();

const { guidelines, getCollectionFields } = useGuidelinesStore();
const columns = ref<string[]>([]);

const tableData: ComputedRef<CollectionTableEntry[]> = computed(() => {
  return props?.collections?.map(collection => {
    return {
      ...collection.collection.data,
      texts: collection.texts.length,
    };
  });
});

onMounted(async (): Promise<void> => {
  await getGuidelines();

  columns.value = [...getCollectionFields().map(f => f.name), 'texts'];
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
  <div class="flex-grow-1 overflow-y-auto">
    <LoadingSpinner v-if="!tableData" />
    <!-- TODO: Fix sorting... -->
    <DataTable
      v-else
      scrollable
      :rowClass="() => 'bitch'"
      scrollHeight="flex"
      :value="tableData"
      paginator
      :rows="10"
      :rowsPerPageOptions="[10, 20, 50, 100]"
      removableSort
      resizableColumns
      rowHover
      tableStyle="table-layout: fixed;"
      paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink PageLinks  NextPageLink LastPageLink CurrentPageReport"
      currentPageReportTemplate="{first} to {last} of {totalRecords}"
      size="small"
    >
      <Column
        v-for="col of columns"
        :key="col"
        :field="col"
        :header="capitalize(col)"
        sortable
        :headerStyle="col === 'texts' ? `width: 5rem` : ''"
      >
        <template #body="{ data }">
          <!-- TODO: This should come from the configuration... -->
          <!-- TODO: Bit hacky. Beautify? -->
          <a
            v-if="col === 'label'"
            class="cell-link"
            :href="'/collections/' + data.uuid"
            v-tooltip.hover.top="{ value: data[col], showDelay: 0 }"
            >{{ data[col] }}</a
          >
          <span
            v-else-if="col !== 'texts'"
            class="cell-info"
            v-tooltip.hover.top="{ value: data[col], showDelay: 0 }"
            >{{ data[col] }}</span
          >
          <span v-else class="cell-info w-2rem">{{ data.texts }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.cell-info,
.cell-link {
  display: block;
  width: 100%;
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-info {
  cursor: default;
}
</style>
