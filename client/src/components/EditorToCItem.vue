<script setup lang="ts">
import { TableOfContentDataItem } from '@tiptap/extension-table-of-contents';

const props = defineProps<{
  item: TableOfContentDataItem;
  index: number;
}>();

const emit = defineEmits<{
  (e: 'itemClick', uuid: string): void;
}>();

function handleItemClick(event: MouseEvent) {
  emit('itemClick', props.item.id);
}
</script>

<template>
  <div
    :class="{
      'is-active': item.isActive && !item.isScrolledOver,
      'is-scrolled-over': item.isScrolledOver,
    }"
    :style="{ '--level': item.level }"
  >
    <a :href="'#' + item.id" @click.prevent="handleItemClick" :data-item-index="item.itemIndex">
      {{ item.node.type.name }} ({{ item.node.attrs.uuid }})
    </a>
  </div>
</template>
