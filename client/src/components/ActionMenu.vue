<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useCollectionManagerStore } from '../store/collectionManager';
import { Menu } from 'primevue';
import { CollectionNetworkActionType, Collection } from '../models/types';
import { MenuItem } from 'primevue/menuitem';

const props = defineProps<{
  allowedOperations: CollectionNetworkActionType[];
  target: 'single' | 'bulk';
  currentRow?: Collection;
}>();

const emit = defineEmits(['paginationChanged', 'selectionChanged', 'sortChanged']);

defineExpose({
  toggle,
});

const { openRowAction, openBulkAction } = useCollectionManagerStore();

const menu = useTemplateRef<InstanceType<typeof Menu>>('menu');

const menuItems: MenuItem[] = [
  {
    label: 'Move',
    icon: 'pi pi-arrow-circle-left',
    command: () => handleActionSelection('move'),
    disabled: () => !props.allowedOperations.includes('move'),
  },
  {
    label: 'Copy',
    icon: 'pi pi-link',
    command: () => handleActionSelection('copy'),
  },
  {
    separator: true,
  },
  {
    label: 'De-reference',
    icon: 'pi pi-minus-circle ',
    command: () => handleActionSelection('dereference'),
    disabled: () => !props.allowedOperations.includes('dereference'),
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => handleActionSelection('delete'),
    disabled: true,
  },
];

function toggle(event: Event): void {
  menu.value.toggle(event);
}

function handleActionSelection(type: CollectionNetworkActionType): void {
  if (props.target === 'single') {
    openRowAction(type, props.currentRow);
  } else {
    openBulkAction(type);
  }
}
</script>

<template>
  <Menu ref="menu" :model="menuItems" popup />
</template>

<style scoped></style>
