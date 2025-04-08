<script setup lang="ts">
import DataInputComponent from './DataInputComponent.vue';
import { getDefaultValueForProperty } from '../utils/helper/helper';
import { PropertyConfig } from '../models/types';
import Button from 'primevue/button';

const modelValue = defineModel<any[]>();
const props = defineProps<{
  config: Partial<PropertyConfig>;
  mode?: 'edit' | 'view';
}>();

function addItem() {
  if (!modelValue.value) {
    modelValue.value = [getDefaultValueForProperty(props.config.type)];
  } else {
    modelValue.value.push(getDefaultValueForProperty(props.config.type));
  }
}
</script>

<template>
  <div :style="{ outline: '1px solid red', padding: '5px' }">
    <div v-for="(_, index) in modelValue" class="flex gap-1 align-items-center">
      <DataInputComponent v-model="modelValue[index]" :config="props.config" :mode="props.mode" />
      <Button
        title="Delete item"
        :style="{ width: '1rem', height: '1rem', padding: '10px' }"
        severity="danger"
        outlined
        icon="pi pi-times"
        size="small"
        @click="modelValue = modelValue.filter((_, index2) => index2 !== index)"
      />
    </div>
    <Button
      class="mt-2 w-full h-2rem"
      icon="pi pi-plus"
      size="small"
      severity="secondary"
      label="Add item"
      :title="`Add new ${props.config.type} item`"
      @click="addItem"
    />
  </div>
</template>

<style scoped></style>
