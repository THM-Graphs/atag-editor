<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import InputGroup from 'primevue/inputgroup';
import InputNumber from 'primevue/inputnumber';
import DatePicker from 'primevue/datepicker';

const dateModelValue = defineModel<string | null>();
// TODO: Add config to props -> required, editable, min/max value etc
const props = defineProps<{ dateType: 'date' | 'date-time' | 'time' }>();

// // Parse the initial date if available
// The .split function will extract the HH:mm:ss part of the string if nanoseconds should be present
const initialDate =
  props.dateType === 'time'
    ? ref(dateModelValue.value.split('.')[0])
    : ref(dateModelValue ? new Date(dateModelValue.value) : null);

// const year = computed(() => (initialDate.value ? initialDate.value.getFullYear() : null));
// const month = computed(() => (initialDate.value ? initialDate.value.getMonth() + 1 : null)); // 1-12 for human readability
// const day = computed(() => (initialDate.value ? initialDate.value.getDate() : null));
// const hours = computed(() => (initialDate.value ? initialDate.value.getHours() : null));
// const minutes = computed(() => (initialDate.value ? initialDate.value.getMinutes() : null));

watch(initialDate, () => {
  if (props.dateType === 'time') {
    dateModelValue.value = initialDate.value ? (initialDate.value as string) : null;
  } else {
    dateModelValue.value = initialDate.value ? (initialDate.value as Date).toISOString() : null;
  }
});

// // Compute year, month, and day from ISO string
// const year = computed(() => (initialDate.value ? initialDate.value.getFullYear() : null));
// const month = computed(() => (initialDate.value ? initialDate.value.getMonth() + 1 : null)); // 1-12 for human readability
// const day = computed(() => (initialDate.value ? initialDate.value.getDate() : null));
// const hours = computed(() => (initialDate.value ? initialDate.value.getHours() : null));
// const minutes = computed(() => (initialDate.value ? initialDate.value.getMinutes() : null));

// function updateDate(field: 'year' | 'month' | 'day' | 'hours' | 'minutes', value: number) {
//   // Get current values
//   const currentYear = year.value || new Date().getFullYear();
//   const currentMonth = month.value || 1;
//   const currentDay = day.value || 1;
//   const currentHours = hours.value || 0;
//   const currentMinutes = minutes.value || 0;

//   // Update given field
//   const newYear = field === 'year' ? value : currentYear;
//   const newMonth = field === 'month' ? value : currentMonth;
//   const newDay = field === 'day' ? value : currentDay;
//   const newHours = field === 'hours' ? value : currentHours;
//   const newMinutes = field === 'minutes' ? value : currentMinutes;

//   const newDate = new Date(newYear, newMonth - 1, newDay, newHours, newMinutes);

//   // Format string and update model value -> all date parts are updated
//   const dateString = newDate.toISOString();
//   console.log('update from:', field);
//   dateModelValue.value = dateString;
// }
</script>

<template>
  <template v-if="dateType === 'date' || dateType === 'date-time'">
    <DatePicker dateFormat="yy-mm-dd" v-model="initialDate as Date" showTime />
    <div>
      {{ dateModelValue }}
    </div>
  </template>
  <template v-else>
    <input type="time" v-model="initialDate" />
    <div>
      {{ dateModelValue }}
    </div>
  </template>

  <!-- <div class="historical-date-input" :style="{ width: '400px' }">
    <InputGroup>
      <InputNumber
        :modelValue="year"
        placeholder="Year"
        :class="{ 'p-invalid': year !== null /* && !isYearValid */ }"
        @value-change="updateDate('year', $event)"
      />
      <InputNumber
        :modelValue="month"
        placeholder="Month"
        :min="1"
        :max="12"
        :class="{ 'p-invalid': month !== null /* && !isMonthValid */ }"
        @value-change="updateDate('month', $event)"
      />
      <InputNumber
        :modelValue="day"
        placeholder="Day"
        :min="1"
        :max="31"
        :class="{ 'p-invalid': day !== null /* && !isDayValid */ }"
        @value-change="updateDate('day', $event)"
      />
    </InputGroup>

    <InputGroup>
      <InputNumber
        :modelValue="hours"
        placeholder="Hours"
        :class="{ 'p-invalid': hours !== null /* && !isYearValid */ }"
        @value-change="updateDate('hours', $event)"
      />
      <InputNumber
        :modelValue="minutes"
        placeholder="Minutes"
        :min="1"
        :max="12"
        :class="{ 'p-invalid': minutes !== null /* && !isMonthValid */ }"
        @value-change="updateDate('minutes', $event)"
      />
    </InputGroup>
  </div> -->
</template>
