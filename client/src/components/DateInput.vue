<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import InputGroup from 'primevue/inputgroup';
import InputNumber from 'primevue/inputnumber';

interface Props {
  modelValue: string; // ISO date string
  minYear?: number;
  maxYear?: number;
}

const dateModelValue = defineModel<string>();

watch(dateModelValue, () => {
  console.log(dateModelValue.value);
});

// Parse the initial date if available
const initialDate = computed(() => (dateModelValue ? new Date(dateModelValue.value) : null));

// Individual date components
const year = computed(() => (initialDate.value ? initialDate.value.getFullYear() : null));
const month = computed(() => (initialDate.value ? initialDate.value.getMonth() + 1 : null)); // 1-12 for human readability
const day = computed(() => (initialDate.value ? initialDate.value.getDate() : null));

// // Handle input changes
function yearChanged(newValue: number) {
  // Format with zero-padding
  const formattedMonth = String(month.value).padStart(2, '0');
  const formattedDay = String(day.value).padStart(2, '0');

  // Create ISO date string with time set to zeros
  const dateString = `${newValue}-${formattedMonth}-${formattedDay}T00:00:00.000Z`;
  dateModelValue.value = new Date(dateString).toISOString();
  console.log(dateString);
}
function monthChanged(newValue: number) {
  // Format with zero-padding
  const formattedMonth = String(newValue).padStart(2, '0');
  const formattedDay = String(day.value).padStart(2, '0');

  // Create ISO date string with time set to zeros
  const dateString = `${year.value}-${formattedMonth}-${formattedDay}T00:00:00.000Z`;
  dateModelValue.value = dateString;
  console.log(dateString);
}
function dayChanged(newValue: number) {
  // Format with zero-padding
  const formattedMonth = String(month.value).padStart(2, '0');
  const formattedDay = String(newValue).padStart(2, '0');

  // Create ISO date string with time set to zeros
  const dateString = `${year.value}-${formattedMonth}-${formattedDay}T00:00:00.000Z`;
  dateModelValue.value = dateString;
  console.log(dateString);
}
</script>

<template>
  <div class="historical-date-input" :style="{ width: '400px' }">
    <InputGroup>
      <InputNumber
        :modelValue="year"
        placeholder="Year"
        :class="{ 'p-invalid': year !== null /* && !isYearValid */ }"
        @update:model-value="yearChanged"
      />
      <InputNumber
        :modelValue="month"
        placeholder="Month"
        :min="1"
        :max="12"
        :class="{ 'p-invalid': month !== null /* && !isMonthValid */ }"
        @update:model-value="monthChanged"
      />
      <InputNumber
        :modelValue="day"
        placeholder="Day"
        :min="1"
        :max="31"
        :class="{ 'p-invalid': day !== null /* && !isDayValid */ }"
        @update:model-value="dayChanged"
      />
    </InputGroup>
  </div>
</template>
