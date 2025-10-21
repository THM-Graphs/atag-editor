<script setup lang="ts">
import { Text } from '../models/types';
import Card from 'primevue/card';
import NodeTag from './NodeTag.vue';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import Textarea from 'primevue/textarea';
import { useGuidelinesStore } from '../store/guidelines';
import { computed, ref } from 'vue';

const props = defineProps<{
  status: 'existing' | 'temporary';
  text: Text;
  mode: 'view' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'textAdded', text: Text): void;
  (e: 'textRemoved', text: Text): void;
}>();

const PREVIEW_LENGTH: number = 300;

const { getAvailableTextLabels } = useGuidelinesStore();

const isExpanded = ref<boolean>(false);

const displayedText = computed<string>(() => {
  return isExpanded.value
    ? props.text.data.text
    : props.text.data.text.slice(0, PREVIEW_LENGTH) +
        (props.text.data.text.length > PREVIEW_LENGTH ? '...' : '');
});

function handleRemoveText() {
  emit('textRemoved', props.text);
}

function handleAddTextClick() {
  emit('textAdded', props.text);
}

/**
 * Toggles the preview mode of an text entry. By default, only a preview is shown,
 * but can be expanded on button click.
 *
 * @returns {void} This function does not return any value.
 */
function togglePreviewMode(): void {
  isExpanded.value = !isExpanded.value;
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
      <div v-if="props.status === 'existing'">
        <div class="text">
          {{ displayedText }}
        </div>
        <Button
          v-if="props.text.data.text.length > PREVIEW_LENGTH"
          :icon="isExpanded ? 'pi pi-angle-double-up' : 'pi pi-angle-double-down'"
          severity="secondary"
          size="small"
          class="w-full"
          :title="isExpanded ? 'Hide full text' : 'Show full text'"
          @click="togglePreviewMode"
        />
      </div>
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
