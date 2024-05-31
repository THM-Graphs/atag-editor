<script setup lang="ts">
import { computed, ref } from 'vue';

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
    :class="['sidebar', 'sidebar-' + position, 'testiiiiii']"
    :style="{ width: sidebarWidth + 'px', background: 'gray' }"
    v-show="!isCollapsed"
  >
    Sidebar component :)
  </section>
</template>

<style scoped></style>
