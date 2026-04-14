<script setup lang="ts">
import { useTiptapStore } from '../store/tiptap';
import { TextSelection, Transaction } from '@tiptap/pm/state';
import EditorToCItem from './EditorToCItem.vue';

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
  <div class="container">
    <div class="label-large">Table of contents</div>
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
  </div>
</template>

<style scoped></style>
