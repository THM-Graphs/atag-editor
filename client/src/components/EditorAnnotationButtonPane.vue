<script setup lang="ts">
import Button from 'primevue/button';
import { IGuidelines } from '../models/IGuidelines';

defineProps<{ guidelines: IGuidelines }>();
</script>

<template>
  <div class="annotation-button-pane flex flex-wrap gap-1">
    <Button
      class="button-annotation"
      v-for="annotation in guidelines.annotations.types"
      :label="annotation.text"
    />
  </div>
</template>

<style scoped></style>
