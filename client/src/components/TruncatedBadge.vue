<script setup lang="ts">
import { computed } from 'vue';
import Tag from 'primevue/tag';

const props = defineProps<{
  icon: boolean;
  text: boolean;
}>();

const icon = computed<string>(() => (props.icon ? 'pi pi-exclamation-triangle' : ''));
const text = computed<string>(() => (props.text ? 'Truncated' : ''));
</script>

<template>
  <Tag
    severity="warn"
    :icon="icon"
    :value="text"
    title="Annotation extends beyond the displayed text snippet"
  ></Tag>
</template>

<style scoped></style>
