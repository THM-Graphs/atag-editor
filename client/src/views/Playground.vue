<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3';
import { h, onMounted, onUnmounted } from 'vue';
import EditorAnnotationButtonPaneNew from '../components/EditorAnnotationButtonPaneNew.vue';
import EditorToC from '../components/EditorToC.vue';
import { AnnotationOld, NodeStatusObject } from '../models/types';
import EditorAnnotationFormNew from '../components/EditorAnnotationFormNew.vue';
import Button from 'primevue/button';
import { useTiptapStore } from '../store/tiptap';
import { useDialog } from 'primevue';
import AddNodeModal from '../components/AddNodeModal.vue';
import { useAppStore } from '../store/app';

const { createModalInstance, destroyModalInstance } = useAppStore();
const { tiptap, initializeTiptap, destroyTiptap, annotations } = useTiptapStore();

const dialog: ReturnType<typeof useDialog> = useDialog();

onMounted(() => {
  // initializeTiptap();

  createModalInstance(
    dialog.open(AddNodeModal, {
      props: {
        modal: true,
        closable: true,
        closeOnEscape: false,
        style: { width: '40rem' },
        header: `Add a Text node`,

        closeButtonProps: {
          severity: 'secondary',
          title: 'Cancel',
          style: { width: '30px', height: '30px' },
          rounded: true,
        },
        pt: {
          headerActions: { style: 'margin-left: auto' },
        },
      },
      data: {
        baseNodeLabel: 'Text',
      },
      emits: {
        onSubmit: (node: NodeStatusObject) => {
          console.log('Node added: ', node);
          destroyModalInstance();
        },
      },
      onClose: destroyModalInstance,
    }),
  );
});
onUnmounted(() => destroyTiptap());

function handleClick() {
  tiptap.value.state.doc.descendants((node, pos) => {
    console.log(pos, node);
  });
}

function toggleTextHightlighting(annotation: AnnotationOld, direction: 'on' | 'off'): void {
  const annotatedSpans: NodeListOf<HTMLSpanElement> = document.querySelectorAll(
    `#editor span[data-anno-uuid="${annotation.data.properties.uuid}"]`,
  );

  if (annotatedSpans.length === 0) {
    return;
  }

  // scrollIntoViewIfNeeded(annotatedSpans[0]);

  annotatedSpans.forEach((span: HTMLSpanElement) => {
    direction === 'on' ? span.classList.add('highlight') : span.classList.remove('highlight');
  });
}
</script>
<template>
  <div class="container">
    <h2 class="text-center">Tiptap Editor</h2>

    <div class="button-group text-center">
      <button @click="handleClick">Log stuff</button>
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
        @click="tiptap?.chain().focus().insertTable().run()"
        :class="{ 'is-active': tiptap?.isActive('table') }"
      >
        ⋮⋮⋮ Table
      </button>

      <button
        @click="
          tiptap
            ?.chain()
            .focus()
            .addZeroPointAnnotation({
              nodeLabels: [],
              data: {
                type: 'deleted',
                subType: '',
                isZeroPoint: true,
                uuid: '123',
                startIndex: 0,
                endIndex: 0,
                text: '',
              },
            })
            .run()
        "
        :class="{ 'is-active': tiptap?.isActive('zeroPointAnnotation') }"
      >
        Zero point test
      </button>
    </div>
    <EditorAnnotationButtonPaneNew />
    <div class="flex">
      <EditorToC />
      <editor-content id="editor" :editor="tiptap" spellcheck="false" />
      <div>
        <h3>Annotations ({{ annotations?.size }})</h3>

        <template
          v-for="annotation in annotations?.values()"
          :key="annotation.data.properties.uuid"
        >
          <EditorAnnotationFormNew :annotation="annotation" />
        </template>
      </div>
    </div>
    <Button label="JSON" @click="() => console.log(tiptap.getJSON())" />
  </div>
</template>

<style>
#editor {
  span.highlight {
    background-color: yellow !important;
  }

  /* Unique data id */
  /* [data-anno-uuid] {
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
  } */

  :root {
    --aboveLine-clr: hsl(22, 81%, 35%);
    --additionLaterHand-color: hsla(91, 59%, 64%, 0.3);
    --belowLine-clr: hsl(22, 81%, 35%);
    --commentary-color: #e3dbcc99;
    --commentary-opacity: 0.9;
    --correction-clr: hsla(36, 85%, 76%, 0.6);
    --deleted-text-decoration: line-through;
    --deleted-clr: hsl(0, 0%, 44%);
    --expansion-clr: hsl(201, 22%, 87%);
    --expansion-opacity: 0.7;
    --gap-text-decoration: underline dotted;
    --head-font-weight: 700;
    --initial-clr: hsl(114, 100%, 37%);
    --marginNote-clr: hsl(34, 100%, 47%);
    --repeated-clr: #cbcbcb;
    --repeated-text-decoration: line-through;
    --rubricated-clr: hsl(0, 76%, 38%);
    --rubricated-font-weight: 700;
    --sic-clr: hsl(130, 99%, 29%);
    --transposition-clr: #ccc;
    --unclear-clr: hsl(328, 98%, 47%);
  }

  /* -------- TEXT ------------------------------------------------------------------------------------------------------------ */

  span.emphasised.rubricated {
    font-weight: var(--rubricated-font-weight);
    color: var(--rubricated-clr);
  }

  span.emphasised.bold {
    font-weight: bold;
    color: unset;
  }

  span.emphasised.initial {
    color: var(--initial-clr);
    font-weight: bold;
  }

  span.emphasised.italic {
    font-style: italic;
  }

  span.emphasised.smallCaps {
    text-decoration: dotted underline;
  }

  span.emphasised.underlined {
    text-decoration: underline;
  }

  span.emphasised:where(.bold, .initial, .italic, .underlined, .smallCaps) {
    font-weight: normal;
    color: unset;
  }

  span.expansion {
    background-color: var(--expansion-clr);
    opacity: var(--expansion-opacity);
  }

  span.nonLinear.aboveLine {
    color: var(--aboveLine-clr);
  }

  span.nonLinear.belowLine {
    color: var(--belowLine-clr);
  }

  span.nonLinear.marginNote {
    color: var(--marginNote-clr);
  }

  span.correction {
    background-color: var(--correction-clr);
  }

  span.deleted.start {
    border-right: 2px solid var(--deleted-clr);
  }

  span.deleted.end {
    border-left: 2px solid var(--deleted-clr);
  }

  span.unclear {
    color: var(--unclear-clr);
  }

  span.transposition {
    background-color: var(--transposition-clr);
  }

  span.repeated {
    background-color: var(--repeated-clr);
    text-decoration: var(--repeated-text-decoration);
  }

  span.gap {
    text-decoration: var(--gap-text-decoration);
  }

  span.additionLaterHand {
    background-color: var(--additionLaterHand-color);
  }

  span.head {
    font-weight: var(--head-font-weight);
  }

  span.commentary {
    background-color: var(--commentary-color);
    opacity: var(--commentary-opacity);
  }

  span.line.start::before {
    /* Disable stylings from span element... */
    background-color: white;
    color: black;
    font-weight: normal;
    opacity: 1;
    /* Curved arrow */
    content: '\2937';
    white-space: pre;
    user-select: none;
  }

  span.line.end::after {
    /* Disable stylings from span element... */
    background-color: white;
    color: black;
    font-weight: normal;
    opacity: 1;
    /* Curved arrow, newline */
    content: '\2936 \A';
    white-space: pre;
    user-select: none;
  }

  span.person {
    text-decoration: underline;
    text-decoration-color: hsl(358, 83%, 68%);
    text-decoration-thickness: 2px;
  }

  span.place {
    text-decoration: underline;
    text-decoration-color: hsl(212, 93%, 54%);
    text-decoration-thickness: 2px;
  }

  span.concept {
    text-decoration: underline;
    text-decoration-color: hsl(45, 90%, 60%);
    text-decoration-thickness: 2px;
  }

  span.event {
    text-decoration: underline;
    text-decoration-color: hsl(134, 61%, 41%);
    text-decoration-thickness: 2px;
  }

  span.imagery {
    text-decoration: underline;
    text-decoration-color: hsl(296, 72%, 66%);
    text-decoration-thickness: 2px;
  }

  span.selfReference {
    text-decoration: underline;
    text-decoration-color: hsl(55, 78%, 44%);
    text-decoration-thickness: 2px;
  }

  span.biblePassage {
    text-decoration: underline;
    text-decoration-color: hsl(37, 61%, 51%);
    text-decoration-thickness: 2px;
  }

  span.literatureReference {
    text-decoration: underline;
    text-decoration-color: hsl(32, 92%, 47%);
    text-decoration-thickness: 2px;
  }

  span.sic {
    color: var(--sic-clr);
  }
}
</style>
