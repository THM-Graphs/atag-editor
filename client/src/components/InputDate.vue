<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from 'vue';
import type { ComponentPublicInstance, Ref } from 'vue';
import DatePicker from 'primevue/datepicker';
import { PropertyConfig } from '../models/types';

// Accepts ISO string for date/date-time, HH:mm:ss for time, or null
const dateModelValue = defineModel<string | null>();

const props = defineProps<{
  config: Partial<PropertyConfig>;
  mode?: 'edit' | 'view';
}>();

const datePicker = useTemplateRef<ComponentPublicInstance>('datePicker');

// TODO: This is a hack since the required attribute can not be set directly via props...
// This is needed for form control in the frontend. Replace with Primevue form validation later?
onMounted(() => {
  const inputElm: HTMLInputElement | null = datePicker.value.$el.querySelector('input');

  if (inputElm && props.config.required) {
    inputElm.required = true;
  }
});

// This Date object will represent the UTC time, independent from the user's timezone
const internalDate: Ref<Date | null> = ref(null);

// Variables (don't need to be reactive since they won't change)
const dateType: string = props.config.type;
const showTime: boolean = dateType === 'date-time' || dateType === 'time';
const timeOnly: boolean = dateType === 'time';
const dateFormat: string | undefined = dateType !== 'time' ? 'yy-mm-dd' : undefined;
const inputPlaceholder: string = getDefaultPlaceholder();
const inputIconClass: string = timeOnly ? 'pi pi-clock' : 'pi pi-calendar';

/**
 * Pads a number with leading zeros to ensure it is at least two digits.
 *
 * Used for creating ISO date strings or time strings.
 *
 * @param {number} num - The number to pad.
 * @returns A string representation of the number, padded with leading zeros if necessary.
 */
function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

/**
 * Converts a Date object into an ISO 8601 formatted string in UTC.
 *
 * This function takes the local components of a Date object and formats them
 * into an ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.000Z), appending 'Z'
 * to indicate that the time is in UTC. Used to mediate between model value (which is an ISO string)
 * and the DatePicker component value (which is a Date, but does currently not allow UTC time directly).
 *
 * @param {Date} date - The Date object to be converted.
 * @returns {string} An ISO 8601 formatted string representing the date and time in UTC.
 */
function createIsoDateTimeString(date: Date): string {
  const yearsString: string = pad(date.getFullYear());
  const monthsString: string = pad(date.getMonth() + 1); // 0-11
  const daysString: string = pad(date.getDate());
  const hoursString: string = pad(date.getHours());
  const minutesString: string = pad(date.getMinutes());
  const secondsString: string = pad(date.getSeconds());

  return `${yearsString}-${monthsString}-${daysString}T${hoursString}:${minutesString}:${secondsString}.000Z`;
}

/**
 * Converts a Date object into a string in the format HH:mm:ss.
 *
 * Takes the hours, minutes, and seconds of the Date object and formats them
 * into a string, padding with leading zeros if necessary.
 *
 * @param {Date} date - The Date object to be converted.
 * @returns {string} A string representation of the time in the format HH:mm:ss.
 */
function createTimeString(date: Date): string {
  const hoursString: string = pad(date.getHours());
  const minutesString: string = pad(date.getMinutes());
  const secondsString: string = pad(date.getSeconds());

  return `${hoursString}:${minutesString}:${secondsString}`;
}

/**
 * Returns a placeholder string based on the dateType property (for example YYYY-MM-DD for dates)
 *
 * @returns {string} A placeholder string to be used in the input field.
 */
function getDefaultPlaceholder(): string {
  switch (dateType) {
    case 'date':
      return 'YYYY-MM-DD';
    case 'date-time':
      return 'YYYY-MM-DD HH:mm:ss';
    case 'time':
      return 'HH:mm:ss';
    default:
      return `Select ${dateType}`;
  }
}

/**
 * Sets the internal date state from the provided model value string.
 *
 * This function updates the `internalDate` ref based on the provided value, which
 * can be either an ISO string for 'date' or 'date-time' types, or an 'HH:mm:ss'
 * string for 'time' type. It parses the string and converts it to a Date object
 * that represents the intended local time. This is necessary because Primevue's
 * DatePicker component cannot handle UTC dates directly.
 *
 * @param {string | null} value - The model value to be converted to a Date object.
 * @returns {void} This function does not return any value.
 */

function setInternalDateFromModelValue(value: string | null): void {
  // This date will be set to the internalDate ref. Needed because Primevue's DatePicker component
  // can not handle UTC dates directly
  let dateForPicker: Date | null = null;

  // Return if the new value is null (= no date string provided). InternalDate ref is already null
  if (!value) {
    return;
  }

  try {
    if (dateType === 'time') {
      // Time only: Parse HH:mm:ss
      const splitted: number[] = value.split(':').map(part => parseInt(part));
      const [hours, minutes, seconds] = splitted;
      const dateIsValid: boolean = splitted.length >= 2 && !isNaN(hours) && !isNaN(minutes);

      if (dateIsValid) {
        const tempDate: Date = new Date();

        tempDate.setHours(hours, minutes, seconds || 0, 0);

        if (!isNaN(tempDate.getTime())) {
          dateForPicker = tempDate;
        } else {
          console.warn(`Invalid time string resulted in invalid date: ${value}`);
        }
      } else {
        console.warn(`Could not parse time string: ${value}`);
      }
    } else {
      // Date or Date-Time: Parse the ISO string (which is UTC)
      const utcDate: Date = new Date(value);

      if (isNaN(utcDate.getTime())) {
        console.warn(`Invalid date/date-time string received: ${value}`);
        return;
      }

      // Create a new Date object using the UTC components. Milliseconds are not needed
      dateForPicker = new Date(
        utcDate.getUTCFullYear(),
        utcDate.getUTCMonth(), // 0-11
        utcDate.getUTCDate(),
        utcDate.getUTCHours(),
        utcDate.getUTCMinutes(),
        utcDate.getUTCSeconds(),
      );

      if (isNaN(dateForPicker.getTime())) {
        console.warn(`Failed creating local date from UTC components of ${value}`);

        // Fallback if something goes wrong during Date creation
        dateForPicker = null;
      }
    }
  } catch (e: unknown) {
    console.error(`Error parsing model value (${dateType}):`, value, e);
  }

  // Update internal state only if it actually changes

  const dateIsDifferent: boolean = internalDate.value?.getTime() !== dateForPicker?.getTime();

  if (dateIsDifferent) {
    internalDate.value = dateForPicker;
  }
}

/**
 * Updates the model value with a string representation of the given date.
 *
 * The given date is the `internalDate` ref, and the function will apply valid changes there to the model value.
 *
 * @param {Date | null} date - The Date object to be formatted.
 * @returns {void} This function does not return any value.
 */
function updateModelValue(date: Date | null): void {
  let newModelValue: string | null = null;

  // Only possible if provided date is a real date and not null
  if (date instanceof Date && !isNaN(date.getTime())) {
    try {
      if (dateType === 'time') {
        newModelValue = createTimeString(date);
      } else {
        newModelValue = createIsoDateTimeString(date);
      }
    } catch (e) {
      console.error('Error formatting date to model value:', date, e);
    }
  }

  const dateIsDifferent: boolean = dateModelValue.value !== newModelValue;

  // Update model value only if the ISO string is different
  if (dateIsDifferent) {
    dateModelValue.value = newModelValue;
  }
}

// Watches for external changes in model value (Parent -> Child)
watch(dateModelValue, (newValue: string | null) => setInternalDateFromModelValue(newValue), {
  immediate: true,
});

// Watch for changes in internalDate (Child -> Parent)
watch(internalDate, (newLocalDate: Date | null) => updateModelValue(newLocalDate));
</script>

<template>
  <DatePicker
    ref="datePicker"
    v-model="internalDate"
    :disabled="!config.editable || mode === 'view'"
    :required="config.required"
    :invalid="config.required && !modelValue"
    :showTime="showTime"
    :timeOnly="timeOnly"
    :dateFormat="dateFormat"
    hourFormat="24"
    :showIcon="true"
    :icon="inputIconClass"
    :showSeconds="true"
    :placeholder="inputPlaceholder"
    style="width: 100%"
    :showOnFocus="false"
    :pt="{
      dropdown: ({ state }) => ({
        title: timeOnly
          ? `${state.overlayVisible ? 'Hide' : 'Show'} clock`
          : `${state.overlayVisible ? 'Hide' : 'Show'} calendar`,
      }),
    }"
  />
</template>

<style scoped></style>
