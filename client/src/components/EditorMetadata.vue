<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useGuidelinesStore } from '../store/guidelines';
import { useTextStore } from '../store/text';
import { capitalize } from '../utils/helper/helper';
import { CollectionProperty } from '../models/types';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Fieldset from 'primevue/fieldset';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';

type CollectionTableEntry = {
  property: string;
  value: string | number;
};

const { text, correspondingCollection, path } = useTextStore();
const { getCollectionConfigFields } = useGuidelinesStore();

const tableData: CollectionTableEntry[] = getCollectionTableData();

function getCollectionTableData() {
  const fields: CollectionProperty[] = getCollectionConfigFields(
    correspondingCollection.value.nodeLabels,
  );

  return fields.map(field => ({
    property: field.name,
    value: correspondingCollection.value.data[field.name],
  }));
}

async function handleCopy(): Promise<void> {
  await navigator.clipboard.writeText(text.value.data.uuid);
}

function getNodeLabelTagColor(nodeLabels: string[]) {
  switch (true) {
    case nodeLabels.includes('Collection'):
      return 'contrast';
    case nodeLabels.includes('Text'):
      return 'secondary';
    case nodeLabels.includes('Annotation'):
      return 'warn';
    default:
      return '';
  }
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
    <Fieldset legend="Text labels" toggleable>
      <template #toggleicon="{ collapsed }">
        <span :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></span>
      </template>
      <div class="flex gap-2">
        <div v-if="text.nodeLabels.length > 0" v-for="label in text.nodeLabels" :key="label">
          <Tag :value="label" severity="secondary" class="mr-1" />
        </div>
        <div v-else>
          <i
            >This text has no labels yet. To add some, go to the
            <RouterLink :to="`/collections/${correspondingCollection.data.uuid}`"
              >Collection page.<i class="pi pi-external-link ml-2"></i></RouterLink
          ></i>
        </div>
      </div>
    </Fieldset>

    <Fieldset legend="Ancestry path" toggleable collapsed>
      <template #toggleicon="{ collapsed }">
        <span :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></span>
      </template>
      <ul>
        <li v-for="(node, index) in path" class="mb-1" :style="`margin-left: ${index}rem`">
          <span v-if="index !== 0">-></span>

          <RouterLink
            v-if="node.nodeLabels.includes('Collection')"
            :to="`/collections/${node.data.uuid}`"
            :title="`Go to Collection ${node.data.uuid}`"
          >
            <Tag
              :value="node.nodeLabels.join(' | ')"
              :severity="getNodeLabelTagColor(node.nodeLabels)"
              class="mr-2"
            />
            <i class="pi pi-external-link"></i>
          </RouterLink>
          <span v-else>
            <Tag
              :value="node.nodeLabels.join(' | ')"
              :severity="getNodeLabelTagColor(node.nodeLabels)"
              class="mr-2"
            />
          </span>
        </li>
      </ul>
    </Fieldset>

    <Fieldset legend="Collection" toggleable>
      <template #toggleicon="{ collapsed }">
        <span :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></span>
      </template>
      <RouterLink
        :to="`/collections/${correspondingCollection.data.uuid}`"
        class="block w-full text-center"
        >Go to Collection page<i class="pi pi-external-link ml-2"></i
      ></RouterLink>

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
            <span style="white-space: normal">{{ data['value'] }}</span>
          </template>
        </Column>
      </DataTable>
    </Fieldset>
  </Panel>
</template>

<style scoped>
.metadata-container {
  outline: 1px solid var(--p-primary-color);
}
</style>
