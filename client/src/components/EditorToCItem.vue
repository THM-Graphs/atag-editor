<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { ToCItem } from '../models/types';
import { MenuItem, MenuItemCommandEvent } from 'primevue/menuitem';
import { Menu } from 'primevue';
import Button from 'primevue/button';
import { useAppStore } from '../store/app';
import Popover from 'primevue/popover';

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

const displayedText = computed<string>(
  () =>
    (props.item as ToCItem).data.text.slice(0, 10) +
    (props.item.data.text.length > 10 ? '...' : ''),
);

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

function togglePopover(event: MouseEvent): void {
  infoIcon.value?.toggle(event);
}

const infoIcon = useTemplateRef('info-icon');

const displayedLabel = computed<string>(() => {
  const item: ToCItem = props.item;

  if (item.data.nodeType === 'heading') {
    return `heading-${item.data._annotationData.level}`;
  } else {
    return item.data._annotationData.type;
  }
});
</script>

<template>
  <div class="flex align-items-center">
    <div
      class="type-container ml-1 flex align-items-center gap-2 flex-grow-1"
      @click="handleNodeClick"
    >
      <span> {{ displayedLabel }} </span>
      <small :title="props.item.data.text" class="font-italic">
        {{ displayedText }}
      </small>
    </div>
    <div class="action-container ml-2">
      <Button
        type="button"
        icon="pi pi-ellipsis-v"
        class="p-1"
        size="small"
        rounded
        severity="secondary"
        @click="toggle"
        aria-haspopup="true"
        aria-controls="overlay_menu"
      />
      <Button
        icon="pi pi-info-circle"
        size="small"
        severity="secondary"
        class="ml-2"
        title="Click to show preview of entity data"
        @click="togglePopover"
      ></Button>
    </div>
  </div>
  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true" />
  <Popover ref="info-icon">
    <pre
      >{{ JSON.stringify(props.item.data, null, 2) }}
  </pre
    >
  </Popover>
</template>
