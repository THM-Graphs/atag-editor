import { readonly, ref, shallowRef, watch } from 'vue';
import { Annotation, AnnotationData, ApiJson } from '../models/types';
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
import { AnnotationMark } from '../services/annotationMark';
import { ZeroPointAnnotation } from '../services/zeroPointAnnotation';
import StandoffConverter from '../services/standoffConverter';
import { standoffJson } from '../services/standoffJson';
import { cloneDeep } from '../utils/helper/helper';
import { AnnotationDecoration } from '../services/annotationDecoration';
import { useFilterStore } from './filter';
import { EditorView } from '@tiptap/pm/view';
import { useEventListener } from '@vueuse/core';
import { Selection } from '@tiptap/pm/state';

const { selectedOptions } = useFilterStore();

const tiptap = shallowRef<Editor | null>(null);

const structuralAnnotations = ref<Map<string, Annotation>>();
const annotations = ref<Map<string, Annotation>>();
const toCItems = ref<TableOfContentData>([]);

const selection = ref<Selection | null>(null);

function setSelectionInStore(newSelection: Selection | null): void {
  selection.value = newSelection;
}

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
      anchorTypes: ['heading', 'paragraph'],

      getIndex: getHierarchicalIndexes,
      onUpdate: content => {
        toCItems.value = content;
      },
    }),
    ListKit,
    Gapcursor,
    UndoRedo,
    AnnotationMark,
    ZeroPointAnnotation,
    AnnotationDecoration,
    // UniqueID.configure({
    //   types: 'all',
    //   attributeName: 'node-uuid',
    //   generateID: () => crypto.randomUUID(),
    // }),
  ];
}

function getVisibleDocRange(editorView: EditorView): { from: number; to: number } {
  // TODO: Add viewport buffer so that annotation directly above/below are included...
  const rect: DOMRect | undefined = editorView.dom.parentElement!.getBoundingClientRect();

  const { top: parentTopOffset, left: parentLeftOffset, height } = rect;

  const startPos = editorView.posAtCoords({
    left: parentLeftOffset + 1,
    top: parentTopOffset,
  });
  const endPos = editorView.posAtCoords({
    left: parentLeftOffset + 1,
    top: parentTopOffset + height,
  });

  // Catch edge cases
  const from: number = startPos?.pos ?? 0;
  const to: number = endPos?.pos ?? editorView.state.doc.content.size;

  return { from, to };
}

function handleScroll() {
  const { from, to } = getVisibleDocRange(tiptap.value!.view);

  tiptap.value?.commands.applyViewportUpdates({ from, to });
}

function initializeTiptap(standoffObject?: { text: string; annotations: AnnotationData[] }): void {
  const data = standoffObject ? createExtendedStandoffObject(standoffObject) : standoffJson;

  const converter: StandoffConverter = new StandoffConverter(data as ApiJson);
  const { tipTapJson, annotations, structuralAnnotations } = converter.getData();

  const annos = createAnnotationObjects(annotations);
  const structuralAnnos = createAnnotationObjects(structuralAnnotations);

  setAnnotations({ annotations: annos, structuralAnnotations: structuralAnnos });

  tiptap.value = new Editor({
    // TODO: Content comes dynamically
    content: tipTapJson,
    extensions: [...getConfiguredExtensions()],
    autofocus: 'start',
    onSelectionUpdate: ({ editor }) => {
      setSelectionInStore(editor.view.state.selection);
    },
    onCreate: ({ editor }) => {
      const { from, to } = getVisibleDocRange(tiptap.value!.view);

      editor.commands.initializeDecorations(annotations, selectedOptions.value, from, to);

      const scrollContainer: HTMLElement | null = editor.view.dom.parentElement;

      // TODO: Should this maybe moved directly to the plugin?
      useEventListener(scrollContainer, 'scroll', handleScroll);
    },
  });
}

// TODO: Shouldn't this be in the filter? Circular depenency though :/ fix on architecure rewrite
// (or not at all)
watch(selectedOptions, newVal => {
  if (!tiptap.value) {
    return;
  }

  tiptap.value.commands.applyFilterUpdates(newVal);
});

function createExtendedStandoffObject(standoffObject: {
  text: string;
  annotations: AnnotationData[];
}): { text: string; annotations: AnnotationData[] } {
  const extended = cloneDeep(standoffObject);
  extended.annotations.push({
    additionalTexts: [],
    properties: {
      text: standoffObject.text,
      startIndex: 0,
      uuid: 'abc123',
      subType: '',
      endIndex: standoffObject.text.length - 1,
      type: 'p',
    },
    entities: [],
  });

  return extended;
}

function createAnnotationObjects(
  annotationDtos: Map<string, AnnotationData>,
): Map<string, Annotation> {
  const map = new Map<string, Annotation>();

  annotationDtos.forEach((data: AnnotationData, key: string) => {
    // isTruncated is set to false at first since truncation happens in separate method
    map.set(key, {
      characterUuids: [],
      data: cloneDeep(data),
      endUuid: '',
      initialData: cloneDeep(data),
      isTruncated: false,
      startUuid: '',
      // TODO: Allow setting status dynamically (on import, everything is "created")
      status: 'existing',
    });
  });

  return map;
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
}
export function useTiptapStore() {
  return {
    annotations,
    toCItems,
    selection: readonly(selection),
    structuralAnnotations,
    tiptap,
    destroyTiptap,
    initializeTiptap,
    setAnnotations,
  };
}
