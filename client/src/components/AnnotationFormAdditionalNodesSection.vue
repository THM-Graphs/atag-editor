<script setup lang="ts">
import { ref } from 'vue';
import Fieldset from 'primevue/fieldset';
import EntityCard from './EntityCard.vue';
import CollectionCard from './CollectionCard.vue';
import TextCard from './TextCard.vue';
import {
  AnnotationNode,
  AnnotationType,
  CollectionNode,
  EntityNode,
  NodeStatusObject,
  TextNode,
} from '../models/types';
import { isCollectionNode, isEntityNode, isTextNode } from '../utils/helper/helper';

const nodes = defineModel<NodeStatusObject[]>();

const props = defineProps<{
  mode?: 'edit' | 'view';
  annotationConfig: AnnotationType;
}>();

const sectionIsCollapsed = ref<boolean>(false);

/**
 * Removes an additional node from the annotation's data.
 *
 * @param {NodeStatusObject} node - The node to be removed.
 */
function handleRemoveNode(node: NodeStatusObject): void {
  nodes.value = nodes.value.filter(node => node.node.data.uuid !== node.node.data.uuid);
}
</script>

<template>
  <Fieldset
    legend="Nodes"
    :toggleable="true"
    :toggle-button-props="{
      title: `${sectionIsCollapsed ? 'Expand' : 'Collapse'} nodes`,
    }"
    @toggle="sectionIsCollapsed = !sectionIsCollapsed"
  >
    <template #toggleicon>
      <span :class="`pi pi-chevron-${sectionIsCollapsed ? 'down' : 'up'}`"></span>
    </template>

    <template v-for="node in nodes" :key="node.node.data.uuid">
      <EntityCard v-if="isEntityNode(node)" :node="node" @remove-node="handleRemoveNode(node)" />
      <TextCard
        v-else-if="isTextNode(node) || isTextNode(node)"
        :node="node"
        @remove-node="handleRemoveNode(node)"
      />
      <CollectionCard
        v-else-if="isCollectionNode(node)"
        :node="node"
        @remove-node="handleRemoveNode(node)"
      />
    </template>
  </Fieldset>
</template>

<style scoped>
.preview.collapsed {
  --fade-start: 50%;
  max-height: 4rem;
  mask-image: linear-gradient(to bottom, white var(--fade-start), transparent);
  transition: max-height 500ms;
}

.preview.expanded {
  max-height: auto;
  max-height: calc-size(auto);
}

.hidden {
  display: none;
}
</style>
