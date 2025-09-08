<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { Router, useRouter } from 'vue-router';
import { useCollectionManagerStore } from '../store/collectionManager';
import { TieredMenu } from 'primevue';
import { CollectionNetworkActionType, Collection } from '../models/types';
import { MenuItem } from 'primevue/menuitem';

const props = defineProps<{
  allowedOperations: CollectionNetworkActionType[];
  tableMode?: 'view' | 'edit';
  target: 'single' | 'bulk';
  currentRow?: Collection;
}>();

const emit = defineEmits(['paginationChanged', 'selectionChanged', 'sortChanged']);

defineExpose({
  toggle,
});

const router: Router = useRouter();

const { openRowAction, openBulkAction } = useCollectionManagerStore();

const menu = useTemplateRef<InstanceType<typeof TieredMenu>>('menu');

const menuItems = ref<MenuItem[]>([
  {
    label: 'Open',
    icon: 'pi pi-file-edit',
    items: [
      {
        label: 'Open in Manager',
        icon: 'pi pi-sitemap',
        command: () => router.push(`/collection-manager/${props.currentRow?.data.uuid}`),
        disabled: () => props.target === 'bulk' || !props.currentRow?.data.uuid,
      },
      {
        label: 'Open details page',
        icon: 'pi pi-pen-to-square',
        command: () => router.push(`/collections/${props.currentRow?.data.uuid}`),
        disabled: () => props.target === 'bulk' || !props.currentRow?.data.uuid,
      },
    ],
  },
  {
    label: 'Organize',
    icon: 'pi pi-folder',
    items: [
      {
        label: 'Move',
        icon: 'pi pi-arrow-circle-left',
        command: () => handleActionSelection('move'),
        disabled: () => !props.allowedOperations.includes('move'),
      },
      {
        label: 'Reference',
        icon: 'pi pi-link',
        command: () => handleActionSelection('reference'),
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
    ],
  },
]);

// TODO: This is a bit clumsy, maybe refactor later
const filteredMenuItems = computed<MenuItem[]>(() => {
  return menuItems.value.filter(item => {
    if (props.target === 'bulk') {
      return item.label === 'Organize';
    }

    if (props.tableMode === 'view') {
      return item.label === 'Open';
    }

    return true;
  });
});

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
  <TieredMenu ref="menu" :model="filteredMenuItems" popup />
</template>

<style scoped></style>
