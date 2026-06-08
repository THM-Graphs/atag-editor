import { ref, shallowRef, watch } from 'vue';
import {
  NodeDto,
  ApiJson,
  Annotation,
  NodeStatusObject,
  AnnotationNode,
  ToCItem,
} from '../models/types';
import { Editor } from '@tiptap/vue-3';
import { Node } from '@tiptap/pm/model';
import Heading from '@tiptap/extension-heading';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { ListKit } from '@tiptap/extension-list';
import UniqueID from '@tiptap/extension-unique-id';
import HardBreak from '@tiptap/extension-hard-break';
import { TableKit } from '@tiptap/extension-table';
import { UndoRedo } from '@tiptap/extensions';
import { Gapcursor } from '@tiptap/extensions';
import { ZeroPointAnnotation } from '../editors/text/extensions/zeroPointAnnotation';
import StandoffConverter from '../services/standoffConverter';
import { standoffJson } from '../services/standoffJson';
import {
  buildDocStructure,
  cloneDeep,
  createExtendedStandoffObject,
  getVisibleDocRange,
} from '../utils/helper/helper';
import { AnnotationDecoration } from '../editors/text/extensions/annotationDecoration';
import { useFilterStore } from './filter';
import { useEventListener } from '@vueuse/core';
import { AnnotationAttributes } from '../editors/text/extensions/AnnotationAttributes';
import { CustomBlock } from '../editors/text/extensions/customBlock';
import { history } from 'prosemirror-history';
import { StructureParser } from '../services/structureParser';

const { selectedOptions } = useFilterStore();

const tiptap = shallowRef<Editor | null>(null);

const structuralAnnotations = ref<Map<string, Annotation>>();
const annotations = ref<Map<string, Annotation>>();

const initialStructuralAnnotations = ref<Map<string, Annotation>>();
const initialAnnotations = ref<Map<string, Annotation>>();
let initialDoc: ReturnType<Editor['getJSON']> | null = null;
let initialPlainText: string | null = null;

const tableOfContent = ref<ToCItem[]>([]);

function getConfiguredExtensions(): any[] {
  return [
    Document,
    Paragraph,
    Text,
    Heading,
    TableKit.configure({
      table: { resizable: true },
    }),
    ListKit,
    Gapcursor,
    HardBreak,
    UndoRedo,
    ZeroPointAnnotation,
    CustomBlock,
    AnnotationDecoration.configure({
      getAnnotationByUuid: (uuid: string) =>
        annotations.value?.get(uuid)?.node ?? structuralAnnotations.value?.get(uuid)?.node,
    }),
    UniqueID.configure({
      types: 'all',
      attributeName: 'uuid',
      generateID: () => crypto.randomUUID(),
    }),
    AnnotationAttributes,
  ];
}

function handleScroll() {
  const { from, to } = getVisibleDocRange(tiptap.value!.view);

  tiptap.value?.commands.applyViewportUpdates({ from, to });
}

/**
 * Checks whether the editor state has diverged from its last saved snapshot.
 *
 * Compares, in order: plain text content (fast path), the full JSON document
 * structure, the number of annotations, and whether any annotation has been
 * modified. Returns `true` as soon as any difference is detected.
 *
 * @returns {boolean} `true` if there are unsaved changes, `false` otherwise.
 */
function hasUnsavedChanges(): boolean {
  // Compare text labels
  // TODO: This needs to be adjusted as soon as labels can be edited
  // if (!areSetsEqual(new Set(initialText.value.nodeLabels), new Set(text.value.nodeLabels))) {
  //   return true;
  // }

  // TODO: Check if any modal/annotation form is openend or in edit mode. Do later

  // Compare plain text
  if (tiptap.value?.state.doc.textContent !== initialPlainText) {
    console.log('Text has changed.');
    return true;
  }

  // Compare docs. Maybe a bit slow on longer texts, but most cases are probably catched by plain text comparison
  if (JSON.stringify(tiptap.value?.getJSON()) !== JSON.stringify(initialDoc)) {
    console.log('Doc has changed.');
    return true;
  }

  // Compare annotations size
  if (initialAnnotations.value?.size !== annotations.value?.size) {
    console.log('Annotation size has changed.');
    return true;
  }

  // Compare annotations status (modified -> something has been changed, not need to deep compare)
  if (annotations.value?.values().some(a => a.meta.status !== 'unchanged')) {
    console.log('Some annotations were modified');
    return true;
  }

  return false;
}

function initializeTiptap(standoffObject?: { text: string; annotations: NodeDto[] }): void {
  const data = standoffObject ? createExtendedStandoffObject(standoffObject) : standoffJson;
  const converter: StandoffConverter = new StandoffConverter(data as ApiJson);
  const { tipTapJson, annotations, structuralAnnotations } = converter.getData();

  const structureParser = new StructureParser(data.text, data.annotations);

  setAnnotations({ annotations, structuralAnnotations });

  tiptap.value = new Editor({
    content: tipTapJson,
    extensions: [...getConfiguredExtensions()],
    autofocus: 'start',
    editorProps: {
      attributes: {
        class: 'tiptap-editor-pane',
      },
    },
    onCreate: ({ editor }) => {
      // Needs to be initialized after creation since full text is needed to calculate visible range
      initializeDecorationView(annotations);

      // This is done in the hook since it has more context than just the raw JSON from the converter.
      // TODO: Might be worth to refactor later, keep in mind
      initialDoc = editor.getJSON();
      initialPlainText = editor.state.doc.textContent;

      initializeEventListeners();

      updateTableOfContent(editor.state.doc);
    },
    onUpdate: ({ transaction }) => {
      updateTableOfContent(transaction.doc);
    },
  });
}

function initializeEventListeners(): void {
  const scrollContainer: HTMLElement | null | undefined = tiptap.value?.view.dom.parentElement;

  // TODO: Should this maybe moved directly to the plugin?
  useEventListener(scrollContainer, 'scroll', handleScroll);
}

function initializeDecorationView(
  annotations: Map<string, NodeStatusObject<AnnotationNode>>,
): void {
  const { from, to } = getVisibleDocRange(tiptap.value!.view);

  tiptap.value?.commands.initializeDecorations(annotations, selectedOptions.value, from, to);
}

// TODO: Shouldn't this be in the filter? Circular depenency though :/ fix on architecure rewrite
// (or not at all)
watch(selectedOptions, newVal => {
  if (!tiptap.value) {
    return;
  }

  tiptap.value.commands.applyFilterUpdates(newVal);
});

function resetToInitialState(): void {
  if (!tiptap.value || !initialDoc || !initialPlainText) {
    return;
  }

  // Reset annotation maps
  annotations.value = cloneDeep(initialAnnotations.value);
  structuralAnnotations.value = cloneDeep(initialStructuralAnnotations.value);

  // setContent goes through TipTap's dispatchTransaction, keeping internal state in sync.
  // false = suppress the intermediate 'update' event; initializeDecorations below will emit one.
  tiptap.value.commands.setContent(initialDoc, { emitUpdate: false });

  initializeDecorationView(annotations.value!);

  resetHistory();
}

function setNewInitialDocState() {
  // Annotations and structural annotations are already reset in the editor's cleanup function

  initialDoc = tiptap.value!.getJSON();
  initialPlainText = tiptap.value!.state.doc.textContent;
}

/**
 * Reset editor history by unregistering and registering the history plugin. This was the easiest option since
 * recreating editor state/instance is too expensive and directly accessing the history state is neither type-safe
 * nor reliable. Might be updated in the future.
 *
 * Called when the editor is reset to initial state.
 *
 * @returns {void} This function does not return any value.
 */
function resetHistory(): void {
  tiptap.value?.unregisterPlugin('history');
  tiptap.value?.registerPlugin(history());
}

function destroyTiptap(): void {
  tiptap.value?.destroy();
  tiptap.value = null;
}

function setAnnotations(data: {
  structuralAnnotations?: Map<string, Annotation>;
  annotations?: Map<string, Annotation>;
}): void {
  structuralAnnotations.value = data.structuralAnnotations;
  annotations.value = data.annotations;

  initialAnnotations.value = cloneDeep(data.annotations);
  initialStructuralAnnotations.value = cloneDeep(data.structuralAnnotations);
}

function updateTableOfContent(doc: Node): void {
  tableOfContent.value = buildDocStructure(doc);
}

export function useTiptapStore() {
  return {
    annotations,
    initialAnnotations,
    initialStructuralAnnotations,
    structuralAnnotations,
    tiptap,
    tableOfContent,
    destroyTiptap,
    hasUnsavedChanges,
    initializeTiptap,
    resetToInitialState,
    setAnnotations,
    setNewInitialState: setNewInitialDocState,
  };
}
