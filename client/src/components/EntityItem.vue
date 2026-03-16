<script setup lang="ts">
import { Entity } from '../models/types';
import Button from 'primevue/button';
import { Popover } from 'primevue';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { capitalize, useTemplateRef } from 'vue';

const props = defineProps<{
  status: 'existing' | 'temporary';
  entity: Entity;
}>();

const emit = defineEmits<{
  (e: 'removeEntity', entity: Entity): void;
}>();

const infoIcon = useTemplateRef('info-icon');

function handleRemoveEntity() {
  emit('removeEntity', props.entity);
}

function togglePopover(event: MouseEvent): void {
  infoIcon.value.toggle(event);
}

const tableData = Object.entries(props.entity.data).map(([property, value]) => {
  return { property, value };
});
</script>

<template>
  <div class="entities-entry">
    <div class="button-pane flex justify-content-end">
      <Tag
        v-if="props.status === 'temporary'"
        size="small"
        icon="pi pi-clock"
        severity="warn"
        class="mr-1"
        title="This entity is temporary, save changes to add it to the database"
      ></Tag>
      <Button
        icon="pi pi-times"
        size="small"
        severity="danger"
        title="Remove entity"
        @click="handleRemoveEntity"
      ></Button>
    </div>
    <span>
      {{ props.entity.data.label }}
    </span>
    <span
      class="pi pi-info-circle ml-2 cursor-pointer"
      @mouseenter="togglePopover"
      @mouseleave="togglePopover"
    ></span>

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
.entities-entry {
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
