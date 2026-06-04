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
  isContentNode,
  isEntityNode,
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
        closable: true,
        closeOnEscape: false,
        style: { width: '40rem', height: '30rem' },
        closeButtonProps: {
          severity: 'secondary',
          title: 'Cancel',
          style: { width: '30px', height: '30px' },
          rounded: true,
        },
        header: `Add a ${nodeLabel} node`,
        pt: {
          headerActions: { style: 'margin-left: auto' },
        },
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
}

function addNode(node: NodeStatusObject) {
  console.log('Node added: ', node);

  nodes.value!.push(node);
}

/**
 * Handles the removal of a node from the list.
 *
 * Called when a temporary nodes is removed (was added during the current session - does not need to be sent to the server).
 *
 * @param {NodeStatusObject<CollectionNode | EntityNode | TextNode>} node - The node to be removed.
 */
function handleRemoveNode(node: NodeStatusObject<CollectionNode | EntityNode | TextNode>): void {
  nodes.value = nodes.value!.filter(n => n.node.data.uuid !== node.node.data.uuid);
}

/**
 * Helper function to determine whether a node is not deleted or removed in the
 * current session. Used for centralizing styling of these nodees (do not show, show "removed" flag etc.).
 */
function isNotDeleted(node: NodeStatusObject): boolean {
  return node.meta.status !== 'deleted' && node.meta.status !== 'removed';
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
        label: 'Content',
        command: () => startAddingNode('Content'),
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
      <template v-if="isNotDeleted(node)">
        <EntityCard
          v-if="isEntityNode(node)"
          v-model="nodes![index] as NodeStatusObject<EntityNode>"
          @remove-node="handleRemoveNode(node)"
          :mode="props.mode"
        />
        <TextCard
          v-else-if="isContentNode(node)"
          v-model="nodes![index] as NodeStatusObject<TextNode>"
          @remove-node="handleRemoveNode(node)"
          :mode="props.mode"
        />
        <CollectionCard
          v-else-if="isCollectionNode(node)"
          v-model="nodes![index] as NodeStatusObject<CollectionNode>"
          @remove-node="handleRemoveNode(node)"
          :mode="props.mode"
        />
        <AnnotationCard
          v-else-if="isAnnotationNode(node)"
          v-model="nodes![index] as NodeStatusObject<AnnotationNode>"
          @remove-node="handleRemoveNode(node)"
          mode="view"
        />

        <div v-else>
          <p>Unsupported node type: {{ node.node.nodeLabels }}</p>
        </div>
      </template>
    </template>
    <Button
      v-if="mode === 'edit'"
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
