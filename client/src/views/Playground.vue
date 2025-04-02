<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { buildFetchUrl } from '../utils/helper/helper';
import { PropertyConfig } from '../models/types';
import { camelCaseToTitleCase } from '../utils/helper/helper';
import Button from 'primevue/button';
import InputGroup from 'primevue/inputgroup';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Textarea from 'primevue/textarea';
import DateInput from '../components/DateInput.vue';

// Comprehensive interface for the Neo4j data types node
interface DataTypeExample {
  // BOOLEAN data types
  singleBoolean: boolean;
  booleanList: boolean[];

  // STRING data types
  singleString: string;
  stringList: string[];

  // INTEGER data types
  singleInteger: number;
  integerList: number[];

  // FLOAT data types
  singleFloat: number;
  floatList: number[];

  // DATE data types
  singleDate: string; // ISO date string
  dateList: string[];

  // LOCAL DATETIME data types
  singleLocalDateTime: string; // ISO datetime string
  localDateTimeList: string[];

  // LOCAL TIME data types
  singleLocalTime: string; // ISO time string
  localTimeList: string[];
}

const fields: PropertyConfig[] = [
  // BOOLEAN property configurations
  {
    name: 'singleBoolean',
    type: 'boolean',
    required: true,
    editable: true,
    visible: true,
  },
  {
    name: 'booleanList',
    type: 'array',
    items: {
      type: 'boolean',
    },
    required: false,
    editable: true,
    visible: true,
  },

  // STRING property configurations
  {
    name: 'singleString',
    type: 'string',
    required: true,
    editable: true,
    visible: true,
    template: 'input',
  },
  {
    name: 'stringList',
    type: 'array',
    items: {
      type: 'string',
    },
    required: false,
    editable: true,
    visible: true,
  },

  // INTEGER property configurations
  {
    name: 'singleInteger',
    type: 'integer',
    required: true,
    editable: true,
    visible: true,
  },
  {
    name: 'integerList',
    type: 'array',
    items: {
      type: 'integer',
    },
    required: false,
    editable: true,
    visible: true,
  },

  // FLOAT property configurations
  {
    name: 'singleFloat',
    type: 'number',
    required: true,
    editable: true,
    visible: true,
  },
  {
    name: 'floatList',
    type: 'array',
    items: {
      type: 'number',
    },
    required: false,
    editable: true,
    visible: true,
  },

  // DATE property configurations
  {
    name: 'singleDate',
    type: 'date',
    required: false,
    editable: true,
    visible: true,
    template: 'input',
  },
  {
    name: 'dateList',
    type: 'array',
    items: {
      type: 'date',
    },
    required: false,
    editable: true,
    visible: true,
  },

  // LOCAL DATETIME property configurations
  {
    name: 'singleLocalDateTime',
    type: 'date-time',
    required: false,
    editable: true,
    visible: true,
    template: 'input',
  },
  {
    name: 'localDateTimeList',
    type: 'array',
    items: {
      type: 'date-time',
    },
    required: false,
    editable: true,
    visible: true,
  },

  // LOCAL TIME property configurations
  {
    name: 'singleLocalTime',
    type: 'time',
    required: false,
    editable: true,
    visible: true,
    template: 'input',
  },
  {
    name: 'localTimeList',
    type: 'array',
    items: {
      type: 'time',
    },
    required: false,
    editable: true,
    visible: true,
  },
];

const dateFields = fields.filter(f => ['date', 'date-time', 'time'].includes(f.type));

const testNode = ref<DataTypeExample | null>(null);

const isLoading = ref<boolean>(true);

onMounted(async (): Promise<void> => await getTestNode());

const asyncOperationRunning = ref<boolean>(false);

async function getTestNode(): Promise<void> {
  try {
    asyncOperationRunning.value = true;
    const url: string = buildFetchUrl('/api/test');

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const json = await response.json();
    const keys = Object.keys(json);
    keys.forEach(k => {
      if (['date', 'date-time', 'time'].includes(fields.find(f => f.name === k)?.type)) {
        console.log(`%c-------- ${k} --------`, 'background-color: lightblue;');
        // console.log(json.normal[k]);
        console.log(json[k]);
      }
    });
    testNode.value = json;
  } catch (error: unknown) {
    console.error('Error fetching collections:', error);
  } finally {
    isLoading.value = false;
  }
}

async function handleSave() {
  const url: string = buildFetchUrl(`/api/test`);

  console.log(testNode.value);

  const response: Response = await fetch(url, {
    method: 'POST',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(testNode.value),
  });

  if (!response.ok) {
    throw new Error('Playground data could not be saved');
  }
}

function handleDateChange(event: Date, fieldName: string) {
  // const year = event.getUTCFullYear();
  // const month = event.getUTCMonth();
  // const day = event.getUTCDate();
  // const newDate = new Date();
  // const date2 = new Date(Date.UTC(year, month, day, 0, 0, 0));
  // newDate.setFullYear(year);
  // newDate.setMonth(month);
  // newDate.setDate(day);
  // newDate.setHours(0 + Math.abs(event.getTimezoneOffset() / 60));
  // newDate.setMinutes(0);
  // newDate.setSeconds(0);
  // newDate.setMilliseconds(0);
  // testNode[fieldName] = newDate.toISOString();
  // // console.log(date2);
  // console.log(testNode[fieldName]);
}

// function replacer(key, value) {
//   if (this[key] instanceof Date) {
//     return this[key].toUTCString();
//   }

//   return value;
// }
const beforeSave = (event: MouseEvent) => {
  console.log(JSON.stringify(historicalDate.value));
};

function logDate() {
  console.log('As Date object: ');
  console.log(historicalDate.value);
  console.log('As ISO String: ');
  console.log(historicalDate.value.toISOString());
  console.log('As UTC String: ');
  console.log(historicalDate.value.toUTCString());
  console.log('JSON Stringify: ');
  console.log(JSON.stringify(historicalDate.value));
}
const dateString = ref('1066-10-14T00:00:00.000Z');
const historicalDate = computed(() => new Date(dateString.value)); // month is zero-based
// logDate();
</script>

<template>
  <div class="container m-auto p-4">
    <!-- <h2>Historical Date Input</h2> -->
    <!-- <HistoricalDateInput v-model="historicalDate" :minYear="0" :maxYear="2025" /> -->
    <DateInput v-model="dateString" />
    <div>{{ historicalDate.toISOString() }} <br /></div>
    <Button
      severity="secondary"
      class="ml-3"
      aria-label="Log out data"
      title="Log data"
      @click="logDate"
      >Log Date</Button
    >

    <Button
      severity="secondary"
      class="ml-3"
      aria-label="Log out data"
      title="Log data"
      @click="beforeSave"
      >Stringify</Button
    >
    <form action="">
      <table v-if="!isLoading" class="w-full border-collapse">
        <thead>
          <tr class="bg-gray-100">
            <th class="border p-2 text-left">Field Name</th>
            <th class="border p-2 text-left" :style="{ width: '300px' }">Input</th>
            <th class="border p-2 text-left">JS Value</th>
            <th class="border p-2 text-left">Config type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in dateFields" :key="field.name" v-show="field.visible" class="border-b">
            <td class="border p-2 font-semibold">
              {{ camelCaseToTitleCase(field.name) }}
            </td>
            <td class="border p-2">
              <InputText
                v-if="field.type === 'string' && (field.template === 'input' || !field.template)"
                :id="field.name"
                :disabled="!field.editable"
                :required="field.required"
                :invalid="field.required && !testNode[field.name]"
                v-model="testNode[field.name]"
                class="w-full"
                spellcheck="false"
              />
              <Textarea
                v-else-if="field.type === 'string' && field.template === 'textarea'"
                :id="field.name"
                :disabled="!field.editable"
                :required="field.required"
                :invalid="field.required && !testNode[field.name]"
                v-model="testNode[field.name]"
                cols="30"
                rows="5"
                class="w-full"
              />
              <Select
                v-else-if="field.type === 'string' && field.options"
                :id="field.name"
                :disabled="!field.editable"
                :required="field.required"
                :invalid="field.required && !testNode[field.name]"
                v-model="testNode[field.name]"
                :options="field.options"
                :placeholder="`Select ${field.name}`"
                class="w-full"
              />
              <div v-else-if="field.type === 'date'">
                <DatePicker
                  :id="field.name"
                  dateFormat="yy-mm-dd"
                  :disabled="!field.editable"
                  :required="field.required"
                  v-model="testNode[field.name]"
                  @value-change="handleDateChange($event as Date, field.name)"
                />
                <div>
                  {{ testNode[field.name] }}
                </div>
              </div>
              <div v-else-if="field.type === 'date-time'">
                <DatePicker
                  :id="field.name"
                  dateFormat="yy-mm-dd"
                  showTime
                  :disabled="!field.editable"
                  :required="field.required"
                  v-model="testNode[field.name]"
                />
                <div>
                  {{ testNode[field.name] }}
                </div>
              </div>

              <div v-else-if="field.type === 'time'">
                <DatePicker
                  :id="field.name"
                  showTime
                  timeOnly
                  :disabled="!field.editable"
                  :required="field.required"
                  v-model="testNode[field.name]"
                />
                <div>
                  {{ testNode[field.name] }}
                </div>
              </div>

              <input
                v-else-if="field.type === 'boolean'"
                v-model="testNode[field.name]"
                type="checkbox"
                :id="field.name"
                :name="field.name"
                :disabled="!field.editable"
                class="m-2"
              />
              <span v-else>
                {{ testNode[field.name] }}
              </span>
            </td>
            <td class="border p-2">
              {{ typeof testNode[field.name] }}
            </td>
            <td class="border p-2">{{ field.type }}</td>
          </tr>
        </tbody>
      </table>
      <Button aria-label="Save changes" title="Save changes" @click="handleSave">Save</Button>
      <Button
        severity="secondary"
        class="ml-3"
        aria-label="Log out data"
        title="Log data"
        @click="console.log(testNode)"
        >Log data</Button
      >
    </form>
  </div>
</template>

<style scoped>
.container {
  width: 80%;
  min-width: 800px;
}

.form-label {
  flex-basis: 10rem;
}
</style>
