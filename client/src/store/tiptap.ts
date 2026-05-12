import { ref, shallowRef, watch } from 'vue';
import { NodeDto, ApiJson, Annotation, NodeStatusObject, AnnotationNode } from '../models/types';
import { Editor } from '@tiptap/vue-3';
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
import {
  getHierarchicalIndexes,
  TableOfContentData,
  TableOfContents,
} from '@tiptap/extension-table-of-contents';
import { ZeroPointAnnotation } from '../services/zeroPointAnnotation';
import StandoffConverter from '../services/standoffConverter';
import { standoffJson } from '../services/standoffJson';
import {
  cloneDeep,
  createExtendedStandoffObject,
  getVisibleDocRange,
} from '../utils/helper/helper';
import { AnnotationDecoration } from '../services/annotationDecoration';
import { useFilterStore } from './filter';
import { useEventListener } from '@vueuse/core';
import { AnnotationAttributes } from '../services/AnnotationAttributes';
import { history } from 'prosemirror-history';

const { selectedOptions } = useFilterStore();

const tiptap = shallowRef<Editor | null>(null);

const structuralAnnotations = ref<Map<string, Annotation>>();
const annotations = ref<Map<string, Annotation>>();

const initialStructuralAnnotations = ref<Map<string, Annotation>>();
const initialAnnotations = ref<Map<string, Annotation>>();
let initialDoc: ReturnType<Editor['getJSON']> | null = null;

const toCItems = ref<TableOfContentData>([]);

function getConfiguredExtensions(): any[] {
  return [
    Document,
    Paragraph,
    Text,
    Heading,
    TableKit.configure({
      table: { resizable: true },
    }),
    TableOfContents.configure({
      anchorTypes: ['heading', 'paragraph', 'table', 'tableRow', 'tableHeader', 'tableCell'],
      getIndex: getHierarchicalIndexes,
      onUpdate: content => {
        toCItems.value = content;
      },
    }),
    ListKit,
    Gapcursor,
    HardBreak,
    UndoRedo,
    ZeroPointAnnotation,
    AnnotationDecoration,
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

function initializeTiptap(standoffObject?: { text: string; annotations: NodeDto[] }): void {
  const data = standoffObject ? createExtendedStandoffObject(standoffObject) : standoffJson;
  const converter: StandoffConverter = new StandoffConverter(data as ApiJson);
  const { tipTapJson, annotations, structuralAnnotations } = converter.getData();

  setAnnotations({ annotations, structuralAnnotations });

  tiptap.value = new Editor({
    // TODO: Content comes dynamically
    content: tipTapJson,
    extensions: [...getConfiguredExtensions()],
    autofocus: 'start',
    onCreate: ({ editor }) => {
      // Needs to be initialized after creation since full text is needed to calculate visible range
      initializeDecorationView(annotations);

      // This is done in the hook since it has more context than just the raw JSON from the converter.
      // TODO: Might be worth to refactor later, keep in mind
      initialDoc = editor.getJSON();

      initializeEventListeners();
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
  if (!tiptap.value || !initialDoc) {
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
  const json = tiptap.value!.getJSON();

  initialDoc = json;
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
export function useTiptapStore() {
  return {
    annotations,
    initialAnnotations,
    initialStructuralAnnotations,
    structuralAnnotations,
    tiptap,
    toCItems,
    destroyTiptap,
    initializeTiptap,
    resetToInitialState,
    setAnnotations,
    setNewInitialState: setNewInitialDocState,
  };
}
