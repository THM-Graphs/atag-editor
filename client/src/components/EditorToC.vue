<script setup lang="ts">
import { useTiptapStore } from '../store/tiptap';
import { TextSelection, Transaction } from '@tiptap/pm/state';
import EditorToCItem from './EditorToCItem.vue';
import { Panel } from 'primevue';

const { tiptap, toCItems } = useTiptapStore();

function handleItemClick(uuid: string) {
  if (tiptap.value) {
    const element: HTMLElement | null = tiptap.value.view.dom.querySelector(
      `[data-toc-id="${uuid}"`,
    );

    if (!element) {
      console.warn('The corresponding item could not be found');
      return;
    }

    const pos: number = tiptap.value.view.posAtDOM(element, 0);

    // set focus
    const tr: Transaction = tiptap.value.view.state.tr;

    tr.setSelection(new TextSelection(tr.doc.resolve(pos)));

    tiptap.value.view.dispatch(tr);
    tiptap.value.view.focus();

    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY,
      behavior: 'smooth',
    });
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
        <template v-if="toCItems.length === 0">
          <div class="empty-state">
            <p>Start editing your document to see the outline.</p>
          </div>
        </template>
        <template v-else>
          <EditorToCItem
            v-for="(item, i) in toCItems"
            :key="item.id"
            :item="item"
            :index="i + 1"
            @item-click="handleItemClick"
          />
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
