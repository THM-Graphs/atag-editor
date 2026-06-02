<script setup lang="ts">
import { ref } from 'vue';
import { useTiptapStore } from '../store/tiptap';
import Tree from 'primevue/tree';
import Panel from 'primevue/panel';
import { ToCItem } from '../models/types.ts';
import EditorToCItem from './EditorToCItem.vue';
import Button from 'primevue/button';

const { tiptap, tableOfContent } = useTiptapStore();

const expandedKeys = ref<Record<string, boolean>>({});

function handleNodeClick(node: ToCItem) {
  if (!tiptap.value) {
    return;
  }

  tiptap.value.chain().setTextSelection(node.data.pos).focus().run();

  const domNode = tiptap.value.view.nodeDOM(node.data.pos);

  // This does not work reliably, maybe CSS attributes on scroll containers need to be more strict...
  if (domNode instanceof Element) {
    domNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
</script>

<template>
  <Panel
    class="toc-container mb-3"
    toggleable
    :toggle-button-props="{
      severity: 'secondary',
      title: 'Toggle full view',
      rounded: true,
      text: true,
    }"
  >
    <template #header>
      <div class="header font-bold">Table of Contents</div>
    </template>
    <template #toggleicon="{ collapsed }">
      <i :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></i>
    </template>
    <div class="table-of-contents">
      <template v-if="tiptap">
        <template v-if="tableOfContent.length === 0">
          <div class="empty-state">
            <p>Start editing your document to see the outline.</p>
          </div>
        </template>
        <template v-else>
          <Tree
            v-model:expandedKeys="expandedKeys"
            :value="tableOfContent"
            selectionMode="single"
            :metaKeySelection="false"
            class="w-full"
            :pt="{
              root: {
                style: {
                  paddingLeft: 0,
                },
              },
              nodeContent: {
                style: {
                  gap: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                },
              },
              nodeLabel: {
                style: {
                  width: '100%',
                },
              },
              nodeToggleButton: ({ context }) => ({
                style: {
                  visibility: 'visible',
                  pointerEvents: context.node.children?.length !== 0 ? 'auto' : 'none',
                },
              }),
            }"
          >
            <template #nodetoggleicon="{ node, expanded }">
              <template v-if="node.children?.length !== 0">
                <i :class="`pi pi-chevron-${expanded ? 'down' : 'right'}`"></i>
              </template>
              <template v-else>
                <i class="pi pi-minus"></i>
              </template>
            </template>
            <template #default="slotProps">
              <EditorToCItem
                :key="slotProps.node.key"
                :item="slotProps.node as ToCItem"
                @item-click="handleNodeClick"
              />
            </template>
          </Tree>
        </template>
      </template>
    </div>
  </Panel>
</template>

<style scoped>
.toc-container {
  outline: 1px solid var(--p-primary-color);
}
</style>
