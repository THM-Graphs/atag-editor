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
import {
  isAnnotationNode,
  isCollectionNode,
  isEntityNode,
  isTextNode,
} from '../utils/helper/helper';
import AnnotationCard from './AnnotationCard.vue';

const nodes = defineModel<NodeStatusObject[]>();

const props = defineProps<{
  mode: 'edit' | 'view';
  annotationConfig: AnnotationType;
}>();

const sectionIsCollapsed = ref<boolean>(false);
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

    <template v-for="(node, index) in nodes" :key="node.node.data.uuid">
      <EntityCard
        v-if="isEntityNode(node)"
        v-model="nodes![index] as NodeStatusObject<EntityNode>"
        :mode="props.mode"
      />
      <TextCard
        v-else-if="isTextNode(node) || isTextNode(node)"
        v-model="nodes![index] as NodeStatusObject<TextNode>"
        :mode="props.mode"
      />
      <CollectionCard
        v-else-if="isCollectionNode(node)"
        v-model="nodes![index] as NodeStatusObject<CollectionNode>"
        :mode="props.mode"
      />
      <AnnotationCard
        v-else-if="isAnnotationNode(node)"
        v-model="nodes![index] as NodeStatusObject<AnnotationNode>"
        :mode="props.mode"
      />

      <div v-else>
        <p>Unsupported node type: {{ node.node.nodeLabels }}</p>
      </div>
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
