<script setup lang="ts">
import { BaseNodeLabel } from '../models/types';
import { Tag } from 'primevue';

const props = defineProps<{
  content: string;
  type: BaseNodeLabel;
  title?: string;
}>();

// TODO: This should come from a configuration and/or expose CSS classes for customization
const config = {
  Annotation: {
    severity: 'warn',
  },
  Character: {
    severity: 'secondary',
  },
  Collection: {
    severity: 'contrast',
  },
  Entity: {
    severity: 'info',
  },
  Text: {
    severity: 'secondary',
  },
};
</script>

<template>
  <Tag :value="props.content" :severity="config[props.type].severity" :title="props.title" />
</template>

<style scoped></style>
