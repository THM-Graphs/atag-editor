<script setup lang="ts">
import { useGuidelinesStore } from '../store/guidelines';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Toolbar from 'primevue/toolbar';
import NodeTag from './NodeTag.vue';

// Accept the composable's refs as props
const props = defineProps<{
  searchInputValue?: string;
  nodeLabelsValue?: string[];
}>();

const emit = defineEmits(['collectionCreated', 'searchInputChanged', 'nodeLabelsInputChanged']);

const { availableCollectionLabels } = useGuidelinesStore();

function handleSearchInputChange(value: string) {
  emit('searchInputChanged', value);
}

function handleNodeLabelsChange(value: string[]) {
  emit('nodeLabelsInputChanged', value);
}
</script>

<template>
  <Toolbar class="toolbar w-full m-auto">
    <template #start>
      <MultiSelect
        :modelValue="props.nodeLabelsValue"
        :options="availableCollectionLabels"
        display="chip"
        placeholder="Collection node labels"
        class="text-center"
        :filter="false"
        :pt="{
          root: {
            title: `Select Collection Node labels`,
          },
        }"
        @update:modelValue="handleNodeLabelsChange"
      >
        <template #chip="{ value }">
          <NodeTag :content="value" type="Collection" class="mr-1" />
        </template>
      </MultiSelect>
    </template>

    <template #center>
      <IconField iconPosition="left">
        <InputIcon>
          <i class="pi pi-search" />
        </InputIcon>
        <InputText
          spellcheck="false"
          placeholder="Filter Collections by label"
          :modelValue="props.searchInputValue"
          @update:model-value="handleSearchInputChange"
        />
      </IconField>
    </template>
  </Toolbar>
</template>

<style scoped></style>
