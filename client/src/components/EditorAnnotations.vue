<script setup lang="ts">
import { computed, ComputedRef, ref, watch } from 'vue';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { useEditorStore } from '../store/editor';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize, toggleTextHightlighting } from '../utils/helper/helper';
import { Annotation, AnnotationType, Character } from '../models/types';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import ToggleButton from 'primevue/togglebutton';
import Tree from 'primevue/tree';

export interface TreeNode {
  annotationCount?: number;
  children?: TreeNode[];
  data?: Annotation;
  key: string;
  label: string;
  type: 'category' | 'type' | 'annotation';
}

const { newRangeAnchorUuid, placeCaret } = useEditorStore();
const { snippetCharacters, beforeStartIndex, afterEndIndex } = useCharactersStore();
const { annotations } = useAnnotationStore();
const { groupedAnnotationTypes } = useGuidelinesStore();

const displayedAnnotations = ref<Annotation[]>([]);

const selectedView = ref<'current' | 'all'>('current');
const isCurrentSelected: ComputedRef<boolean> = computed(() => selectedView.value === 'current');
const isAllSelected: ComputedRef<boolean> = computed(() => selectedView.value === 'all');

const expandedKeys = ref<Record<string, boolean>>({});

watch(
  [afterEndIndex, beforeStartIndex, annotations, selectedView],
  () => {
    if (selectedView.value === 'current') {
      let charUuids: Set<string> = new Set();

      snippetCharacters.value.forEach(c => {
        c.annotations.forEach(a => charUuids.add(a.uuid));
      });

      displayedAnnotations.value = annotations.value.filter((annotation: Annotation) => {
        return charUuids.has(annotation.data.properties.uuid) && annotation.status !== 'deleted';
      });
    } else {
      displayedAnnotations.value = annotations.value.filter(a => a.status !== 'deleted');
    }
  },
  { deep: true, immediate: true },
);

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
        a => a.data.properties.type === annoType.type,
      );

      annos.forEach((anno: Annotation, k: number) => {
        const newAnnotation: TreeNode = {
          key: i.toString() + '-' + j.toString() + '-' + k.toString(),
          label: anno.data.properties.text,
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
  placeCaret();
}

function toggleViewMode(direction: 'current' | 'all'): void {
  selectedView.value = direction;
}
</script>

<template>
  <Panel
    class="annotations-container mb-3"
    toggleable
    :toggle-button-props="{
      severity: 'secondary',
      title: 'Toggle full view',
      rounded: true,
      text: true,
    }"
  >
    <template #header>
      <div class="header font-bold">Annotations [{{ displayedAnnotations.length }}]</div>
    </template>
    <template #toggleicon="{ collapsed }">
      <i :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></i>
    </template>
    <div class="tab-buttons">
      <ButtonGroup class="w-full flex">
        <ToggleButton
          :model-value="isCurrentSelected"
          class="w-full"
          onLabel="Current"
          offLabel="Current"
          title="Show only annotations in current snippet"
          badge="2"
          @change="toggleViewMode('current')"
        />
        <ToggleButton
          :model-value="isAllSelected"
          class="w-full"
          onLabel="All"
          offLabel="All"
          title="Show all annotations of text"
          badge="2"
          @change="toggleViewMode('all')"
        />
      </ButtonGroup>
    </div>
    <div class="collapse-buttons">
      <Button
        type="button"
        icon="pi pi-plus"
        size="small"
        label="Expand All"
        title="Expand annotation tree"
        @click="expandAll"
      />
      <Button
        type="button"
        icon="pi pi-minus"
        size="small"
        label="Collapse All"
        title="Collapse annotation tree"
        @click="collapseAll"
      />
    </div>
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
                <div
                  :class="`w-full h-full annotation-type-icon annotation-type-icon-${slotProps.node.label}`"
                ></div>
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
                :data-annotation-uuid="slotProps.node.data.data.properties.uuid"
              >
                <!-- TODO: Fix overflow -->
                <Tag
                  v-if="slotProps.node.data.isTruncated"
                  icon="pi pi-exclamation-triangle"
                  severity="warn"
                ></Tag>
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
  scrollbar-gutter: stable;
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
}
</style>
