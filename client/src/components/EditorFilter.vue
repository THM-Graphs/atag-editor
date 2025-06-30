<script lang="ts" setup>
import { computed, ComputedRef, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useFilterStore } from '../store/filter';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize } from '../utils/helper/helper';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';

const { allOptions, selectedOptions, selectAllOptions, selectDefaultOptions } = useFilterStore();
const { groupedAndSortedAnnotationTypes } = useGuidelinesStore();

const container = ref<HTMLDivElement>(null);
const isCollapsed = ref<boolean>(true);

const badgeContent: ComputedRef<string> = computed(() => {
  return `${selectedOptions.value.length}/${allOptions.value.length}`;
});

const badgeSeverity: ComputedRef<string> = computed(() => {
  if (selectedOptions.value.length === allOptions.value.length) {
    return 'secondary';
  }

  return 'danger';
});

onClickOutside(container, () => (isCollapsed.value = true));

function toggleDropdown(): void {
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
      :title="isCollapsed ? 'Show filter pane' : 'Hide filter pane'"
      @click="toggleDropdown"
      :badge="badgeContent"
      :badgeSeverity="badgeSeverity"
    />
    <Card v-if="!isCollapsed" id="overlay_menu" class="dropdown absolute w-full z-1">
      <template #content>
        <div class="dropwn-header">
          <div class="buttons flex gap-1 mb-2 align-items-center">
            <Button
              label="Select all"
              title="Select all options"
              size="small"
              @click="selectAllOptions"
            />
            <Button
              label="Reset to default"
              title="Reset to default options"
              size="small"
              @click="selectDefaultOptions"
            />
          </div>
        </div>
        <div class="container flex flex-wrap gap-2">
          <div v-for="(annotationTypes, category) in groupedAndSortedAnnotationTypes" class="group">
            <div class="name font-semibold">
              {{ capitalize(category) }}
            </div>
            <div v-for="annotationType of annotationTypes" :key="annotationType.type">
              <Checkbox
                v-model="selectedOptions"
                :inputId="annotationType.type"
                :value="annotationType.type"
              />
              <label :for="annotationType.type" class="ml-2 cursor-pointer">
                {{ annotationType.type }}
              </label>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
