<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import { useAnnotationStore } from '../store/annotations';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize, toggleTextHightlighting } from '../helper/helper';
import { Annotation, AnnotationType, Character } from '../models/types';
import Button from 'primevue/button';
import Panel from 'primevue/panel';
import Tree from 'primevue/tree';
import { useEditorStore } from '../store/editor';
import { useCharactersStore } from '../store/characters';

export interface TreeNode {
  annotationCount?: number;
  children?: TreeNode[];
  data?: Annotation;
  key: string;
  label: string;
  type: 'category' | 'type' | 'annotation';
}

const { newRangeAnchorUuid, placeCursor } = useEditorStore();
const { snippetCharacters } = useCharactersStore();
const { annotations } = useAnnotationStore();
const { groupedAnnotationTypes } = useGuidelinesStore();
const displayedAnnotations: ComputedRef<Annotation[]> = computed(() =>
  annotations.value.filter(a => a.status !== 'deleted'),
);

const expandedKeys = ref<Record<string, boolean>>({});

const nodes: ComputedRef<TreeNode[]> = computed(() => {
  const nodes: TreeNode[] = [];

  Object.entries(groupedAnnotationTypes.value).forEach(([category, annotationType], i: number) => {
    const newCategory: TreeNode = {
      key: i.toString(),
      label: category,
      type: 'category',
      children: [],
      annotationCount: 0,
    };

    annotationType.forEach((annoType: AnnotationType, j: number) => {
      const newAnnotationType: TreeNode = {
        key: i.toString() + '-' + j.toString(),
        label: annoType.type,
        type: 'type',
        children: [],
      };

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

        newAnnotationType.children.push(newAnnotation);
      });

      newCategory.annotationCount += annos.length;

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

// Set initially expanded nodes -> Categories
nodes.value.forEach(node => {
  expandedKeys.value[node.key] = true;
});

function expandAll(): void {
  for (let node of nodes.value) {
    expandNode(node);
  }

  expandedKeys.value = { ...expandedKeys.value };
}

function collapseAll(): void {
  expandedKeys.value = {};
}

function expandNode(node: TreeNode): void {
  if (node.children && node.children.length) {
    expandedKeys.value[node.key] = true;

    for (let child of node.children) {
      expandNode(child);
    }
  }
}

function handleAnnotationClick(event: MouseEvent): void {
  const annotationUuid: string = (event.target as HTMLElement).dataset.annotationUuid;

  if (!annotationUuid) {
    return;
  }

  const lastAnnotatedChar: Character | undefined = snippetCharacters.value.findLast(c =>
    c.annotations.some(a => a.uuid === annotationUuid),
  );

  if (!lastAnnotatedChar) {
    return;
  }

  newRangeAnchorUuid.value = lastAnnotatedChar.data.uuid;
  placeCursor();
}
</script>

<template>
  <Panel class="annotations-container mb-3 overflow-y-auto" toggleable>
    <template #header>
      <div class="header font-bold">Annotations [{{ displayedAnnotations.length }}]</div>
    </template>
    <Button type="button" icon="pi pi-plus" size="small" label="Expand All" @click="expandAll" />
    <Button
      type="button"
      icon="pi pi-minus"
      size="small"
      label="Collapse All"
      @click="collapseAll"
    />
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
                {{ capitalize(slotProps.node.label) }} [{{ slotProps.node.annotationCount }}]
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
              @click="handleAnnotationClick"
              :style="{ 'text-wrap': 'nowrap' }"
            >
              <div
                class="ml-2 anno-entry preview"
                :data-annotation-uuid="slotProps.node.data.data.uuid"
              >
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
