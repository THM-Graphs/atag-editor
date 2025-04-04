<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { buildFetchUrl } from '../utils/helper/helper';
import { PropertyConfig } from '../models/types';
import { camelCaseToTitleCase } from '../utils/helper/helper';
import DataInputComponent from '../components/DataInputComponent.vue';
import DataInputGroup from '../components/DataInputGroup.vue';
import Button from 'primevue/button';

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
      required: true,
      editable: true,
      visible: true,
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
      required: true,
      editable: true,
      visible: true,
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
      required: true,
      editable: true,
      visible: true,
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
      required: true,
      editable: true,
      visible: true,
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
      required: true,
      editable: true,
      visible: true,
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
      required: true,
      editable: true,
      visible: true,
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

const fieldsToDisplay = fields;
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
</script>

<template>
  <div class="container m-auto p-4">
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
          <tr
            v-for="field in fieldsToDisplay"
            :key="field.name"
            v-show="field.visible"
            class="border-b"
          >
            <td class="border p-2 font-semibold">
              {{ camelCaseToTitleCase(field.name) }}
            </td>
            <td class="border p-2">
              <DataInputGroup
                v-if="field.type === 'array'"
                v-model="testNode[field.name]"
                :config="field.items"
              />
              <DataInputComponent v-else :config="field" v-model="testNode[field.name]" />
            </td>
            <td class="border p-2">
              {{ typeof testNode[field.name] }}
            </td>
            <td class="border p-2">{{ field.type }}</td>
          </tr>
        </tbody>
      </table>
      <Button aria-label="Save changes" title="Save changes" @click="handleSave">Save</Button>
      <Button severity="secondary" class="ml-3" @click="console.log(testNode)">Log data</Button>
      <Button severity="warn" class="ml-3" @click="console.log(JSON.stringify(testNode))"
        >Stringify</Button
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
