<script setup lang="ts">
import { Text } from '../models/types';
import Card from 'primevue/card';
import NodeTag from './NodeTag.vue';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import Textarea from 'primevue/textarea';
import { useGuidelinesStore } from '../store/guidelines';

const props = defineProps<{
  status: 'existing' | 'temporary';
  text: Text;
  mode: 'view' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'textAdded', text: Text): void;
  (e: 'textRemoved', text: Text): void;
}>();

const { getAvailableTextLabels } = useGuidelinesStore();

function handleRemoveText() {
  emit('textRemoved', props.text);
}

function handleAddTextClick() {
  emit('textAdded', props.text);
}
</script>

<template>
  <Card
    class="my-2"
    :pt="{
      root: {
        style: {
          border: '1px solid gray',
        },
      },
      body: {
        style: {
          padding: '15px',
        },
      },
    }"
  >
    <template #title>
      <div class="header flex justify-content-between">
        <template v-if="mode === 'view'">
          <NodeTag v-for="label in props.text.nodeLabels" :content="label" type="Text" />
        </template>

        <template v-if="mode === 'edit'">
          <MultiSelect
            size="small"
            v-model="text.nodeLabels"
            :options="getAvailableTextLabels()"
            display="chip"
            placeholder="Text labels"
            class="text-center"
            :filter="false"
            :pt="{
              root: {
                title: `Select Text labels`,
              },
            }"
          >
            <template #chip="{ value }">
              <NodeTag type="Text" :content="value" class="mr-1" />
            </template>
          </MultiSelect>
        </template>

        <Button
          v-if="mode === 'edit'"
          type="button"
          icon="pi pi-times"
          severity="danger"
          outlined
          size="small"
          title="Remove text"
          @click="handleRemoveText"
        />
      </div>
    </template>

    <template #content>
      <div v-if="props.status === 'existing'">{{ props.text.data.text }}</div>
      <div v-else>
        <Textarea v-model="text.data.text" class="w-full" placeholder="Add text" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-content-center">
        <Button
          v-if="props.status === 'temporary'"
          class="w-2"
          icon="pi pi-check"
          title="Add new text to Collection"
          @click="handleAddTextClick"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped></style>
