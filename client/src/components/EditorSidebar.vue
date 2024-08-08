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
    :class="['sidebar', 'sidebar-' + position]"
    class="p-3 flex flex-column"
    :style="{ width: sidebarWidth + 'px', background: '#e9e9e9' }"
    v-show="!isCollapsed"
  >
    <slot></slot>
  </section>
</template>

<style scoped></style>
