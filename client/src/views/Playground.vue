<script setup lang="ts">
import { EditorContent, Extension } from '@tiptap/vue-3';
import { onMounted, onUnmounted } from 'vue';

import { useEditorStore } from '../store/editor';

const { tiptap, initializeTiptap, destroyTiptap } = useEditorStore();

onMounted(() => initializeTiptap());
onUnmounted(() => destroyTiptap());

function handleClick() {
  tiptap.value.state.doc.descendants((node, pos) => {
    console.log(pos, node);
  });
}
</script>
<template>
  <div class="container text-center">
    <h2>Tiptap Editor</h2>

    <button @click="handleClick">Log stuff</button>

    <div class="button-group">
      <button
        @click="tiptap?.chain().focus().toggleHeading({ level: 1 }).run()"
        :class="{ 'is-active': tiptap?.isActive('heading', { level: 1 }) }"
      >
        H1
      </button>
      <button
        @click="tiptap?.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="{ 'is-active': tiptap?.isActive('heading', { level: 2 }) }"
      >
        H2
      </button>
      <button
        @click="tiptap?.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="{ 'is-active': tiptap?.isActive('heading', { level: 3 }) }"
      >
        H3
      </button>
      <button
        @click="tiptap?.chain().focus().setParagraph().run()"
        :class="{ 'is-active': tiptap?.isActive('paragraph') }"
      >
        Paragraph
      </button>
      <button
        @click="tiptap?.chain().focus().toggleBold().run()"
        :class="{ 'is-active': tiptap?.isActive('bold') }"
      >
        Bold
      </button>
      <button
        @click="tiptap?.chain().focus().setTextAlign('left').run()"
        :class="{ 'is-active': tiptap?.isActive('textAlign') }"
      >
        <-- Global left
      </button>
      <button
        @click="tiptap?.chain().focus().setTextAlign('right').run()"
        :class="{ 'is-active': tiptap?.isActive('textAlign') }"
      >
        Global right --\>
      </button>
      <button
        @click="tiptap?.chain().focus().setTextAlign('center').run()"
        :class="{ 'is-active': tiptap?.isActive('textAlign') }"
      >
        Global center
      </button>
      <button
        @click="tiptap?.chain().focus().increaseLineHeight().run()"
        :class="{ 'is-active': tiptap?.isActive('lineHeight') }"
      >
        lineheight UP
      </button>
      <button
        @click="tiptap?.chain().focus().decreaseLineHeight().run()"
        :class="{ 'is-active': tiptap?.isActive('lineHeight') }"
      >
        lineheight DOWN
      </button>
      <button
        @click="
          tiptap?.chain().focus().setMark('bold', { class: 'bold-tag' }).setTextSelection(1).run()
        "
        :class="{ 'is-active': tiptap?.isActive('link') }"
      >
        extendmarkrange
      </button>
    </div>

    <editor-content id="editor" :editor="tiptap" />
  </div>
</template>

<style>
#editor {
  width: 80%;

  &:has(:focus-visible) {
    box-shadow: var(--box-shadow-focus);
    outline: 0;
  }

  /* Unique data id */
  [data-anno-uuid] {
    border: 2px solid black;
    border-radius: 0.5rem;
    padding: 2.5rem 1rem 1rem;
    position: relative;

    &::before {
      background-color: black;
      border-radius: 0 0 0.5rem 0;
      color: white;
      content: attr(data-anno-uuid);
      font-size: 0.75rem;
      font-weight: bold;
      left: 0;
      line-height: 1.5;
      padding: 0.25rem 0.5rem;
      position: absolute;
      top: 0;
    }
  }
}
</style>
