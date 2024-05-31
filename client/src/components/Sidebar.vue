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
    :style="{ width: sidebarWidth + 'px', background: 'gray' }"
    v-show="!isCollapsed"
  >
    Sidebar component :)
  </section>
</template>

<style scoped></style>
