<script setup lang="ts">
import { computed } from 'vue';
import { NodeStatus } from '../models/types';
import { Tag } from 'primevue';
import { capitalize } from '../utils/helper/helper';

const props = defineProps<{
  status: NodeStatus;
}>();

const capital = computed<string>(() => props.status.charAt(0).toUpperCase());
const htmlTitle = computed<string>(() => capitalize(props.status));

const severity = computed<string>(() => {
  switch (props.status) {
    case 'added':
      return 'success';
    case 'removed':
      return 'danger';
    case 'modified':
      return 'warn';
    default:
      return 'secondary';
  }
});
</script>

<template>
  <Tag
    :value="capital"
    :title="htmlTitle"
    :severity="severity"
    :style="{
      fontSize: '0.7rem',
      padding: '2px 4px',
      lineHeight: '100%',
      width: '16px',
      height: '16px',
    }"
  />
</template>

<style scoped></style>
