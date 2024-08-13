<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import { useAnnotationStore } from '../store/annotations';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize, toggleTextHightlighting } from '../helper/helper';
import { Annotation, AnnotationType } from '../models/types';
import Panel from 'primevue/panel';
import Tree from 'primevue/tree';

const { annotations } = useAnnotationStore();
const { groupedAnnotationTypes } = useGuidelinesStore();

// TODO: Use this, whole tree should be exanded
const expandedKeys = ref<Map<string, boolean>>(new Map<string, boolean>());

const displayedAnnotations: ComputedRef<Annotation[]> = computed(() =>
  annotations.value.filter(a => a.status !== 'deleted'),
);

export interface TreeNode {
  children?: TreeNode[];
  data?: Annotation;
  key: string;
  label: string;
  type: 'category' | 'type' | 'annotation';
}

const nodes: ComputedRef<TreeNode[]> = computed(() => {
  const nodes: TreeNode[] = [];

  Object.entries(groupedAnnotationTypes.value).forEach(([category, annotationType], i: number) => {
    const newCategory: TreeNode = {
      key: i.toString(),
      label: category,
      type: 'category',
      children: [],
    };

    // selectedKey.value.set(i.toString(), true);

    annotationType.forEach((annoType: AnnotationType, j: number) => {
      const newAnnotationType: TreeNode = {
        key: i.toString() + '-' + j.toString(),
        label: annoType.type,
        type: 'type',
        children: [],
      };

      // selectedKey.value.set(j.toString(), true);

      const annos: Annotation[] = displayedAnnotations.value.filter(
        a => a.data.type === annoType.type,
      );

      annos.forEach((anno: Annotation, k: number) => {
        const newAnnotation: TreeNode = {
          key: i.toString() + '-' + j.toString() + '-' + k.toString(),
          label: anno.data.text,
          type: 'annotation',
          data: anno,
        };

        // selectedKey.value.set(k.toString(), true);

        newAnnotationType.children.push(newAnnotation);
      });

      if (newAnnotationType.children.length > 0) {
        newCategory.children.push(newAnnotationType);
      }
    });

    if (newCategory.children.length > 0) {
      nodes.push(newCategory);
    }
  });

  return nodes;
});
</script>

<template>
  <Panel class="annotations-container mb-3 overflow-y-auto" toggleable>
    <template #header>
      <div class="header font-bold">Annotations [{{ displayedAnnotations.length }}]</div>
    </template>
    <div class="tree">
      <div class="flex justify-center">
        <Tree
          v-model:expandedKeys="expandedKeys"
          :value="nodes"
          selectionMode="single"
          :metaKeySelection="false"
          class="w-full"
        >
          <template #default="slotProps">
            <div v-if="slotProps.node.type === 'category'">
              <div class="name-container ml-2 font-bold">
                {{ capitalize(slotProps.node.label) }} [{{ slotProps.node.children.length }}]
              </div>
            </div>
            <div v-else-if="slotProps.node.type === 'type'" class="flex align-items-center">
              <div class="icon-container">
                <img
                  :src="`../src/assets/icons/${slotProps.node.label}.svg`"
                  class="icon w-full h-full"
                />
              </div>
              <div class="name-container ml-2">
                {{ slotProps.node.label }} [{{ slotProps.node.children.length }}]
              </div>
            </div>
            <div
              v-else
              @mouseover="toggleTextHightlighting(slotProps.node.data, 'on')"
              @mouseout="toggleTextHightlighting(slotProps.node.data, 'off')"
              :style="{ 'text-wrap': 'nowrap' }"
            >
              <div class="ml-2 anno-entry preview">
                <!-- TODO: Fix overflow -->
                {{ slotProps.node.label }}
              </div>
            </div>
          </template>
        </Tree>
      </div>
    </div>
  </Panel>
</template>

<style scoped>
.annotations-container {
  outline: 1px solid var(--p-primary-color);
}

.preview {
  text-wrap: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-style: italic;
}

.icon-container {
  width: 15px;
  height: 15px;
  /* outline: 1px solid red; */
}

.icon {
  object-fit: contain;
  /* outline: 1px solid green; */
}
</style>
