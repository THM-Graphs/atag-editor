<script setup lang="ts">
import { computed, ref } from 'vue';
import Breadcrumb from 'primevue/breadcrumb';
import { Collection } from '../models/types';
import { MenuItem } from 'primevue/menuitem';

const props = defineProps<{
  path: Collection[];
}>();

const home = ref<MenuItem>({
  icon: 'pi pi-home',
});

const breadcrumbItems = computed<MenuItem[]>(() =>
  props.path.map(item => ({ label: item.data.label })),
);
</script>

<template>
  <div class="container p-1">
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
