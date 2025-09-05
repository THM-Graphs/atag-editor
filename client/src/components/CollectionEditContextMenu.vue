<script setup lang="ts">
import { Menu } from 'primevue';
import { CollectionNetworkActionType, Collection } from '../models/types';
import { ref } from 'vue';
import { MenuItem } from 'primevue/menuitem';
import { useCollectionManagerStore } from '../store/collectionManager';

const props = defineProps<{
  collection: Collection;
}>();

const { openRowAction } = useCollectionManagerStore();

// --------------------------------- MENU -------------------------------------

const menu = ref();

// Menu items for the three-dot menu
const menuItems: MenuItem[] = [
  {
    label: 'Move',
    icon: 'pi pi-arrow-circle-left',
    command: () => handleActionSelection('move'),
  },
  {
    label: 'Reference',
    icon: 'pi pi-link',
    command: () => handleActionSelection('reference'),
  },
  {
    separator: true,
  },
  {
    label: 'De-reference',
    icon: 'pi pi-minus-circle ',
    command: () => handleActionSelection('dereference'),
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => handleActionSelection('delete'),
  },
];

function handleActionSelection(type: CollectionNetworkActionType): void {
  openRowAction(type, props.collection);
}
</script>

<template>
  <Menu ref="menu" :model="menuItems" popup />
</template>

<style scoped></style>
