<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import Fieldset from 'primevue/fieldset';
import EntityCard from './EntityCard.vue';
import CollectionCard from './CollectionCard.vue';
import TextCard from './TextCard.vue';
import {
  AnnotationNode,
  AnnotationType,
  BaseNodeLabel,
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
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import AddNodeModal from './AddNodeModal.vue';
import { useAppStore } from '../store/app';
import { useDialog } from 'primevue/usedialog';

const nodes = defineModel<NodeStatusObject[]>();

const props = defineProps<{
  mode: 'edit' | 'view';
  annotationConfig: AnnotationType;
}>();

const { createModalInstance, destroyModalInstance } = useAppStore();
const dialog: ReturnType<typeof useDialog> = useDialog();

const sectionIsCollapsed = ref<boolean>(false);

const menu = useTemplateRef('menu');

function startAddingNode(nodeLabel: BaseNodeLabel): void {
  console.log(`Start adding a new ${nodeLabel} node`);

  createModalInstance(
    dialog.open(AddNodeModal, {
      props: {
        modal: true,
        closable: false,
        closeOnEscape: false,
        style: { width: '25rem' },
      },
      data: {
        baseNodeLabel: nodeLabel,
      },
      emits: {
        onSubmit: (node: NodeStatusObject) => {
          addNode(node);
          destroyModalInstance();
        },
      },
      onClose: destroyModalInstance,
    }),
  );
  // Here you would implement the logic to add a new node of the specified type
}

function addNode(node: NodeStatusObject) {
  console.log('node added: ', node);
}

const nodeOptions = ref([
  {
    label: 'Possible Nodes',
    items: [
      {
        label: 'Collection',
        command: () => startAddingNode('Collection'),
      },
      {
        label: 'Entity',
        command: () => startAddingNode('Entity'),
      },
      {
        label: 'Text',
        command: () => startAddingNode('Text'),
      },
    ],
  },
]);

function toggleMenu(event: PointerEvent) {
  menu.value!.toggle(event);
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
    <Button
      type="button"
      label="Add Node"
      icon="pi pi-plus"
      class="w-full"
      severity="secondary"
      @click="toggleMenu"
      aria-haspopup="true"
      aria-controls="overlay_menu"
    />
    <Menu ref="menu" id="overlay_menu" :model="nodeOptions" :popup="true" />
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
