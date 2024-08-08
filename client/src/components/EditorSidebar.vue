<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  position: String,
  isCollapsed: Boolean,
  width: Number,
});

const position: string = props.position;

const isCollapsed = computed(() => props.isCollapsed);
const sidebarWidth = computed(() => props.width);
</script>

<template>
  <section
    :sidebar-id="position"
    :class="['sidebar', 'sidebar-' + position, isCollapsed ? 'collapsed' : '']"
    class="p-3 flex flex-column"
    :style="{ width: sidebarWidth + 'px', background: '#e9e9e9' }"
  >
    <slot></slot>
  </section>
</template>

<style scoped>
.collapsed {
  display: none !important;
}
</style>
