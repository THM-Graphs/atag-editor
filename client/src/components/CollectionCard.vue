<script setup lang="ts">
import { CollectionNode, NodeStatus, NodeStatusObject } from '../models/types';
import Button from 'primevue/button';
import { Popover } from 'primevue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import NodeTag from './NodeTag.vue';
import { capitalize, useTemplateRef } from 'vue';
import { filterDefaultLabels } from '../utils/helper/helper';

const node = defineModel<NodeStatusObject<CollectionNode>>();

const infoIcon = useTemplateRef('info-icon');

const filteredLabels: string[] = filterDefaultLabels(node.value!.node.nodeLabels);

function handleRemoveNode(): void {
  setNodeStatus('removed');
}

function setNodeStatus(status: NodeStatus): void {
  node.value!.meta.status = status;
}

/**
 * Handles a click event on the Card component, which will the corresponding text in a new tab. The click event is ignored
 * if the click target is part of button.
 *
 * @param {PointerEvent} event - The click event.
 * @returns {void} This function does not return any value.
 */
function handleClickContainer(event: PointerEvent): void {
  if ((event.target as HTMLElement).closest('button')) {
    return;
  }

  window.open(`/collections/${node.value!.node.data.uuid}`, '_blank', 'noopener noreferrer');
}

function togglePopover(event: MouseEvent): void {
  infoIcon.value?.toggle(event);
}

const tableData = Object.entries(node.value!.node.data).map(([property, value]) => {
  return { property, value };
});
</script>

<template>
  <div class="node-card-container" @click="handleClickContainer" title="Open collection in Editor">
    <div class="button-pane flex justify-content-between">
      <div class="node-labels-pane flex">
        <NodeTag
          class="test mr-1"
          v-for="label in filteredLabels"
          :content="label"
          type="Collection"
        />
      </div>

      <small class="status">{{ node!.meta.status }}</small>

      <Button
        icon="pi pi-times"
        size="small"
        severity="danger"
        title="Remove collection"
        @click="handleRemoveNode"
      ></Button>
    </div>
    <span>
      {{ node!.node.data.label }}
    </span>
    <Button
      icon="pi pi-info-circle"
      size="small"
      severity="secondary"
      class="ml-2"
      title="Click to show preview of collection data"
      @click="togglePopover"
    ></Button>

    <Popover
      ref="info-icon"
      :pt="{
        root: {
          class: 'w-25rem',
          style: {
            zIndex: 'var(--z-index-max)',
          },
        },
      }"
    >
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
    </Popover>
  </div>
</template>

<style scoped>
.node-card-container {
  cursor: pointer;
  border: 1px solid gray;
  border-radius: 5px;
  margin-bottom: 0.5rem;
  padding: 0.5rem;

  & button {
    width: 1rem;
    height: 1rem;
    padding: 10px;
  }
}
</style>
