<script setup lang="ts">
import { computed, ComputedRef, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useGuidelinesStore } from '../store/guidelines';
import LoadingSpinner from './LoadingSpinner.vue';
import { buildFetchUrl, capitalize } from '../utils/helper/helper';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { Tag } from 'primevue';
import { IGuidelines } from '../models/IGuidelines';
import { CollectionAccessObject, CollectionProperty } from '../models/types';

type CollectionTableEntry = {
  [key: string | keyof CollectionProperty]: unknown;
};

const props = defineProps<{
  collections: CollectionAccessObject[] | null;
}>();

const { guidelines, getCollectionConfigFields } = useGuidelinesStore();
const columns = ref<string[]>([]);

const tableData: ComputedRef<CollectionTableEntry[]> = computed(() => {
  return props?.collections?.map(collection => {
    return {
      ...collection.collection.data,
      texts: collection.texts.length,
      nodeLabels: collection.collection.nodeLabels,
    };
  });
});

onMounted(async (): Promise<void> => {
  await getGuidelines();

  // TODO: This approach is bad since possible data keys are reserved...
  columns.value = [
    'nodeLabels',
    ...getCollectionConfigFields(['Letter']).map(f => f.name),
    'texts',
  ];
});

function getColumnWidth(columnName: string): string {
  switch (columnName) {
    case 'nodeLabels':
      return '8rem';
    case 'texts':
      return '5rem';
    default:
      return 'auto';
  }
}

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
    <DataTable
      v-else
      scrollable
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
        :headerStyle="`width: ${getColumnWidth(col)}`"
      >
        <template #body="{ data }">
          <!-- TODO: This should come from the configuration... -->
          <!-- TODO: Bit hacky. Beautify? -->
          <RouterLink
            v-if="col === 'label'"
            class="cell-link"
            :to="`/collections/${data.uuid}`"
            v-tooltip.hover.top="{ value: data[col], showDelay: 0 }"
            >{{ data[col] }}</RouterLink
          >
          <span v-else-if="col === 'texts'" class="cell-info">{{ data[col] }}</span>
          <span v-else-if="col === 'nodeLabels'" class="cell-info">
            <div class="box flex" style="flex-wrap: wrap">
              <Tag
                v-for="label in data.nodeLabels"
                :value="label"
                severity="contrast"
                class="mr-1 mb-1 mt-1 inline-block"
              />
            </div>
          </span>
          <span v-else class="cell-info" v-tooltip.hover.top="{ value: data[col], showDelay: 0 }">{{
            data[col]
          }}</span>
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
