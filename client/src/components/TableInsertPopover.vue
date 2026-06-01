<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import Popover from 'primevue/popover';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import { useTiptapStore } from '../store/tiptap';

const { tiptap } = useTiptapStore();

const popover = useTemplateRef<InstanceType<typeof Popover>>('popover');

const columns = ref<number>(3);
const rows = ref<number>(3);
const hasHeaderRow = ref<boolean>(true);

function toggle(event: PointerEvent): void {
  popover.value?.toggle(event);
}

function addTable(): void {
  tiptap.value
    ?.chain()
    .focus()
    .insertTable({ cols: columns.value, rows: rows.value, withHeaderRow: hasHeaderRow.value })
    .run();

  columns.value = 3;
  rows.value = 3;
  hasHeaderRow.value = true;

  popover.value?.hide();
}

defineExpose({ toggle });
</script>

<template>
  <Popover ref="popover">
    <div class="flex flex-col gap-4 w-[25rem]">
      <div class="flex-auto w-6rem">
        <label for="columns" class="font-bold block mb-2"> Columns </label>
        <InputNumber v-model="columns" inputId="columns" fluid :min="1" :max="10" showButtons />
      </div>
      <div class="flex-auto w-6rem">
        <label for="rows" class="font-bold block mb-2"> Rows </label>
        <InputNumber v-model="rows" inputId="rows" fluid :min="1" :max="10" showButtons />
      </div>
    </div>
    <div class="flex items-center gap-2 mt-2 justify-content-center">
      <Checkbox v-model="hasHeaderRow" inputId="header-row" name="header-row" binary />
      <label for="header-row"> Add header row </label>
    </div>
    <div class="mt-2 text-center">
      <Button severity="secondary" label="Insert table" @click="addTable" />
    </div>
  </Popover>
</template>

<style scoped>
label {
  cursor: pointer;
}
</style>
