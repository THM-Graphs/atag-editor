<script setup lang="ts">
import { RouterLink } from 'vue-router';
import LoadingSpinner from './LoadingSpinner.vue';
import ActionMenu from './ActionMenu.vue';
import NodeTag from './NodeTag.vue';
import { capitalize } from '../utils/helper/helper';
import Button from 'primevue/button';
import Column, { ColumnProps } from 'primevue/column';
import DataTable, { DataTablePageEvent, DataTableSortEvent } from 'primevue/datatable';
import { PaginationData, CollectionPreview, CollectionNetworkActionType } from '../models/types';
import { ref, useTemplateRef, watch } from 'vue';
import { useCollectionManagerStore } from '../store/collectionManager';

type ColumnName = 'nodeLabels' | 'label' | 'texts' | 'annotations' | 'collections' | 'status';

const props = defineProps<{
  collections: CollectionPreview[] | null;
  mode: 'view' | 'edit';
  pagination: PaginationData | null;
  asyncOperationRunning: boolean;
}>();

const selectedRows = ref<CollectionPreview[]>([]);
// Row from where the action menu is called
const currentRow = ref<CollectionPreview | null>(null);

const emit = defineEmits([
  'actionSelected',
  'paginationChanged',
  'selectionChanged',
  'sortChanged',
]);

const { allowedEditOperations } = useCollectionManagerStore();

const COLUMN_CONFIG = {
  nodeLabels: { width: '8rem', sortable: false },
  label: { width: 'auto', sortable: true },
  status: { width: 'auto', sortable: true },
  texts: { width: '5rem', sortable: true },
  annotations: { width: 'auto', sortable: true },
  collections: { width: 'auto', sortable: true },
} as const;

const actionMenu = useTemplateRef('actionMenu');

// Whenever the selection changes, the parent must be updated to adapt the bulk action behaviour
watch(
  selectedRows,
  newSelection => {
    handleSelectionChange(newSelection);
  },
  { deep: true },
);

// Reset selected rows whenever something in the table changes (after pagination, sorting, filtering etc.)
watch(
  () => props.collections,
  () => {
    resetSelection();
  },
);

function resetSelection() {
  selectedRows.value = [];
}

// Function to toggle menu for a specific row
function toggleMenu(event: Event, row: CollectionPreview): void {
  currentRow.value = row;

  actionMenu.value.toggle(event);
}

/**
 * Returns PrimeVue DataTable Column properties based on the given column name.
 *
 * The properties are determined by the COLUMN_CONFIG object.
 *
 * @param {ColumnName} columnName - The column name for which to return the properties.
 * @returns {Partial<ColumnProps>} - The column properties.
 */
function getColumnProps(columnName: ColumnName): Partial<ColumnProps> {
  const config = COLUMN_CONFIG[columnName];

  return {
    field: columnName,
    header: capitalize(columnName),
    sortable: config.sortable,
    headerStyle: `width: ${config.width}`,
    pt: {
      headerCell: {
        title: config.sortable ? `Sort by ${capitalize(columnName)}` : '',
      },
    },
  };
}

function handleActionSelected(type: CollectionNetworkActionType) {
  emit('actionSelected', { type: type, data: [currentRow.value.collection] });
}

function handleSelectionChange(newSelection: CollectionPreview[]) {
  // v-model already updated selectedRows, so just emit to parent
  emit('selectionChanged', newSelection);
}

function handleSort(event: DataTableSortEvent): void {
  emit('sortChanged', event);
}

function handlePagination(event: DataTablePageEvent): void {
  emit('paginationChanged', event);
}
</script>

<template>
  <div class="overflow-y-auto">
    <LoadingSpinner v-if="!props.collections" />
    <template v-else>
      <DataTable
        scrollable
        scrollHeight="flex"
        :value="props.collections"
        v-model:selection="selectedRows"
        dataKey="collection.data.uuid"
        paginator
        lazy
        :rows="pagination?.limit || 0"
        :totalRecords="pagination?.totalRecords || 0"
        :rowsPerPageOptions="[5, 10, 20, 50, 100]"
        removableSort
        resizableColumns
        rowHover
        tableStyle="table-layout: fixed;"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink PageLinks  NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        size="small"
        @sort="handleSort"
        @page="handlePagination"
        @update:selection="handleSelectionChange"
        :pt="{
          tbody: {
            style: {
              opacity: asyncOperationRunning ? 0.5 : 'unset',
            },
          },
        }"
      >
        <!-- Checkbox column, only visible in edit mode -->

        <Column v-if="mode === 'edit'" selectionMode="multiple" headerStyle="width: 3rem"></Column>

        <!-- Data columns -->

        <Column v-bind="getColumnProps('nodeLabels')">
          <template #body="{ data: row }: { data: CollectionPreview }">
            <span class="cell-info">
              <div class="box flex" style="flex-wrap: wrap">
                <NodeTag
                  v-for="label in row.collection.nodeLabels"
                  :content="label"
                  type="Collection"
                  class="mr-1 mb-1 mt-1 inline-block"
                />
              </div>
            </span>
          </template>
        </Column>

        <Column v-bind="getColumnProps('label')">
          <template #body="{ data: row }: { data: CollectionPreview }">
            <RouterLink
              class="cell-link"
              :to="`/collections/${row.collection.data.uuid}`"
              v-tooltip.hover.top="{ value: row.collection.data.label, showDelay: 0 }"
            >
              {{ row.collection.data.label }}
            </RouterLink>
          </template>
        </Column>

        <!-- TODO: This a hildegard-specific hack. Should my made dynamic -->
        <Column v-bind="getColumnProps('status')">
          <template #body="{ data: row }: { data: CollectionPreview }">
            <span class="cell-info">{{ row.collection.data.status }}</span>
          </template>
        </Column>

        <Column v-bind="getColumnProps('collections')">
          <template #body="{ data: row }: { data: CollectionPreview }">
            <span class="cell-info">{{ row.nodeCounts.collections }}</span>
          </template>
        </Column>

        <Column v-bind="getColumnProps('texts')">
          <template #body="{ data: row }: { data: CollectionPreview }">
            <span class="cell-info">{{ row.nodeCounts.texts }}</span>
          </template>
        </Column>

        <Column v-bind="getColumnProps('annotations')">
          <template #body="{ data: row }: { data: CollectionPreview }">
            <span class="cell-info">{{ row.nodeCounts.annotations }}</span>
          </template>
        </Column>

        <!-- Action columns -->

        <Column field="actions" header="Actions" class="flex gap-1">
          <template #body="{ data: row }: { data: CollectionPreview }" class="flex gap-1">
            <Button
              icon="pi pi-ellipsis-v"
              rounded
              severity="secondary"
              class="w-2rem h-2rem"
              title="More actions"
              aria-label="More actions"
              @click="toggleMenu($event, row)"
            />
            <ActionMenu
              ref="actionMenu"
              target="single"
              :tableMode="props.mode"
              :initiator="currentRow"
              :allowed-operations="allowedEditOperations"
              @action-selected="handleActionSelected"
            />
          </template>
        </Column>
      </DataTable>
    </template>
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
