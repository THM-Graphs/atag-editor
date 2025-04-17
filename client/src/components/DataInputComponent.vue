<script setup lang="ts">
import { PropertyConfig } from '../models/types';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import InputDate from './InputDate.vue';

const modelValue = defineModel<any>();
const props = defineProps<{
  config: Partial<PropertyConfig>;
  mode?: 'edit' | 'view';
}>();

const isPrimitive: boolean =
  props.config.type === 'string' ||
  props.config.type === 'integer' ||
  props.config.type === 'number';

const minValue: number | null | undefined =
  props.config.exclusiveMinimum != null ? props.config.exclusiveMinimum + 1 : props.config.minimum;

const maxValue: number | null | undefined =
  props.config.exclusiveMaximum != null ? props.config.exclusiveMaximum - 1 : props.config.maximum;
</script>

<template>
  <Select
    v-if="config.options && isPrimitive"
    :disabled="!config.editable || mode === 'view'"
    :required="config.required"
    :invalid="config.required && !modelValue"
    v-model="modelValue"
    :options="config.options"
    :placeholder="`Select ${config.name}`"
    class="w-full"
  />
  <InputText
    v-else-if="config.type === 'string' && (config.template === 'input' || !config.template)"
    :disabled="!config.editable || mode === 'view'"
    :required="config.required"
    :invalid="config.required && !modelValue"
    v-model="modelValue"
    class="w-full"
    spellcheck="false"
  />
  <Textarea
    v-else-if="config.type === 'string' && config.template === 'textarea'"
    :disabled="!config.editable || mode === 'view'"
    :required="config.required"
    :invalid="config.required && !modelValue"
    v-model="modelValue"
    cols="30"
    rows="5"
    class="w-full"
  />
  <InputNumber
    v-else-if="config.type === 'integer'"
    :disabled="!config.editable || mode === 'view'"
    :required="config.required"
    :invalid="config.required && !modelValue"
    :min="minValue"
    :max="maxValue"
    v-model="modelValue"
    showButtons
  />
  <InputNumber
    v-else-if="config.type === 'number'"
    :disabled="!config.editable || mode === 'view'"
    :required="config.required"
    :invalid="config.required && !modelValue"
    :min="minValue"
    :max="maxValue"
    :minFractionDigits="0"
    :maxFractionDigits="20"
    v-model="modelValue"
    showButtons
  />
  <div v-else-if="config.type === 'date'">
    <InputDate :config="config" :mode="mode" v-model="modelValue" />
  </div>
  <div v-else-if="config.type === 'date-time'">
    <InputDate :config="config" :mode="mode" v-model="modelValue" />
  </div>
  <div v-else-if="config.type === 'time'">
    <InputDate :config="config" :mode="mode" v-model="modelValue" />
  </div>
  <input
    v-else-if="config.type === 'boolean'"
    v-model="modelValue"
    type="checkbox"
    :name="config.name ?? 'Booelan value without name :/'"
    :disabled="!config.editable || mode === 'view'"
    class="m-2"
  />
  <div v-else class="default-field" :style="{ backgroundColor: '#ffb1c0', borderRadius: '5px' }">
    {{ modelValue }}
  </div>
</template>

<style scoped></style>
