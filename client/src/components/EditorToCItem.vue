<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { ToCItem } from '../models/types';
import { MenuItem, MenuItemCommandEvent } from 'primevue/menuitem';
import { Menu } from 'primevue';
import Button from 'primevue/button';
import { useAppStore } from '../store/app';

const props = defineProps<{
  item: ToCItem;
}>();

const emit = defineEmits<{
  (e: 'itemClick', node: ToCItem): void;
}>();

function handleNodeClick() {
  emit('itemClick', props.item);
}

const { addToastMessage } = useAppStore();

const menu = useTemplateRef('menu');
const items = ref<MenuItem>([
  {
    items: [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: handleMenuItemClick,
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: handleMenuItemClick,
      },
      {
        label: 'Insert node',
        command: handleMenuItemClick,
      },
      {
        label: 'Change node',
        command: handleMenuItemClick,
      },
    ],
  },
]);

function toggle(event: PointerEvent) {
  menu.value.toggle(event);
}

function handleMenuItemClick(e: MenuItemCommandEvent) {
  addToastMessage({
    severity: 'info',
    summary: `${e.item.label} clicked`,
    life: 2000,
  });
}
</script>

<template>
  <div class="flex align-items-center">
    <div class="type-container ml-2 flex align-items-center gap-2" @click="handleNodeClick">
      <span>
        {{ (props.item as ToCItem).label }}
      </span>
      <small :title="props.item.data.text">
        {{ (props.item as ToCItem).data.text.slice(0, 10) }}
      </small>
    </div>
    <div class="action-container ml-2">
      <Button
        type="button"
        icon="pi pi-ellipsis-v"
        size="small"
        rounded
        severity="secondary"
        @click="toggle"
        aria-haspopup="true"
        aria-controls="overlay_menu"
      />
    </div>
  </div>
  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true" />
</template>
