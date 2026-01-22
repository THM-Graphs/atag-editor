<script setup lang="ts">
import { computed, ref } from 'vue';
import Breadcrumb from 'primevue/breadcrumb';
import { NodeAncestry } from '../models/types';
import { MenuItem } from 'primevue/menuitem';

const props = defineProps<{
  path: NodeAncestry;
}>();

const emit = defineEmits(['itemClicked', 'homeClicked']);

const home = ref<MenuItem>({
  icon: 'pi pi-home',
  command: () => emit('homeClicked'),
});

const breadcrumbItems = computed<MenuItem[]>(() =>
  props.path.map((item, index) => ({
    index,
    label: item.data.label,
    command: () => emit('itemClicked', { index, uuid: item.data.uuid }),
  })),
);
</script>

<template>
  <div class="breadcrumbs-section p-1">
    <Breadcrumb
      :home="home"
      :model="breadcrumbItems"
      :pt="{
        root: {
          style: {
            padding: 0,
          },
        },
      }"
    >
    </Breadcrumb>
  </div>
</template>

<style scoped></style>
