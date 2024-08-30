<script lang="ts" setup>
import { ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useFilterStore } from '../store/filter';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize } from '../helper/helper';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';

const { allOptions, selectedOptions, selectAllOptions, selectDefaultOptions } = useFilterStore();
const { groupedAnnotationTypes } = useGuidelinesStore();

const container = ref<HTMLDivElement>(null);
const isCollapsed = ref<boolean>(true);

onClickOutside(container, () => (isCollapsed.value = true));

function toggleDropdown(event: MouseEvent): void {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <div ref="container" class="w-full relative">
    <Button
      type="button"
      class="w-full"
      icon="pi pi-filter-fill"
      label="Filter"
      @click="toggleDropdown"
    />
    <Card v-if="!isCollapsed" id="overlay_menu" class="dropdown absolute w-full z-1">
      <template #content>
        <div class="dropwn-header">
          <div class="info-pane font-semibold">
            {{ selectedOptions.length }} of {{ allOptions.length }} options displayed
          </div>
          <div class="buttons flex gap-1 mb-2 align-items-center">
            <Button label="Select all" size="small" @click="selectAllOptions" />
            <Button label="Reset to default" size="small" @click="selectDefaultOptions" />
          </div>
        </div>
        <div class="container flex gap-2">
          <div v-for="(annotationTypes, category) in groupedAnnotationTypes" class="group">
            {{ capitalize(category) }}
            <div v-for="annotationType of annotationTypes" :key="annotationType.type">
              <Checkbox
                v-model="selectedOptions"
                :inputId="annotationType.type"
                :value="annotationType.type"
              />
              <label :for="annotationType.type" class="ml-2"> {{ annotationType.text }} </label>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
