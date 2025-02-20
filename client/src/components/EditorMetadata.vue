<script setup lang="ts">
import { useGuidelinesStore } from '../store/guidelines';
import { useTextStore } from '../store/text';
import { capitalize } from '../utils/helper/helper';
import { CollectionProperty } from '../models/types';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';

type CollectionTableEntry = {
  property: string;
  value: string | number;
};

const { text, correspondingCollection, path } = useTextStore();
const { getCollectionFields } = useGuidelinesStore();

const tableData: CollectionTableEntry[] = getTableData();

function getTableData() {
  // TODO: Still a workaround, should be mady dynamic.
  const fields: CollectionProperty[] =
    correspondingCollection.value.nodeLabel === 'Letter'
      ? getCollectionFields('text')
      : getCollectionFields('comment');

  return fields.map(field => ({
    property: field.name,
    value: correspondingCollection.value.data[field.name],
  }));
}

async function handleCopy(): Promise<void> {
  await navigator.clipboard.writeText(text.value.data.uuid);
}
</script>

<template>
  <Panel
    header="Metadata"
    class="metadata-container mb-3"
    toggleable
    :toggle-button-props="{
      severity: 'secondary',
      title: 'Toggle full view',
      rounded: true,
      text: true,
    }"
  >
    <template #toggleicon="{ collapsed }">
      <i :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></i>
    </template>
    <div class="mb-3">
      <div class="flex align-items-center gap-3">
        <InputText
          id="uuid"
          :disabled="true"
          :value="text.data.uuid"
          class="flex-auto w-full"
          size="small"
          spellcheck="false"
        />
        <Button
          icon="pi pi-copy"
          severity="secondary"
          size="small"
          aria-label="Copy UUID"
          title="Copy UUID"
          @click="handleCopy"
        />
      </div>
      <small>Text UUID</small>
    </div>
    <div>
      Path:
      <ul>
        <li v-for="(node, index) in path" :style="`margin-left: ${index}rem`">
          <span v-if="index !== 0">-></span>

          <RouterLink
            v-if="node['nodeLabels'].includes('Collection')"
            :to="`/collections/${node.data.uuid}`"
          >
            {{ node['nodeLabels'] }}
            <i class="pi pi-external-link"></i>
          </RouterLink>
          <span v-else>
            {{ node['nodeLabels'] }}
          </span>
        </li>
      </ul>
    </div>

    <a :href="`/collections/${correspondingCollection.data.uuid}`">Collection</a>
    <i class="pi pi-external-link"></i>
    Data

    <DataTable
      :value="tableData"
      scrollable
      scrollHeight="flex"
      resizableColumns
      rowHover
      tableStyle="table-layout: fixed;"
      size="small"
    >
      <Column field="property" header="Property">
        <template #body="{ data }">
          <span>{{ capitalize(data['property']) }}</span>
        </template>
      </Column>
      <Column field="value" header="Value">
        <template #body="{ data }">
          <span>{{ data['value'] }}</span>
        </template>
      </Column>
    </DataTable>
  </Panel>
</template>

<style scoped>
.metadata-container {
  outline: 1px solid var(--p-primary-color);
}
</style>
