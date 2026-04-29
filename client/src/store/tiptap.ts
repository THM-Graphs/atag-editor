import { ref, shallowRef, watch } from 'vue';
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
import { ZeroPointAnnotation } from '../services/zeroPointAnnotation';
import StandoffConverter from '../services/standoffConverter';
import { standoffJson } from '../services/standoffJson';
import {
  cloneDeep,
  createAnnotationObjects,
  createExtendedStandoffObject,
  getVisibleDocRange,
} from '../utils/helper/helper';
import { AnnotationDecoration } from '../services/annotationDecoration';
import { useFilterStore } from './filter';
import { useEventListener } from '@vueuse/core';
import { AnnotationAttributes } from '../services/AnnotationAttributes';

const { selectedOptions } = useFilterStore();

const tiptap = shallowRef<Editor | null>(null);

const structuralAnnotations = ref<Map<string, Annotation>>();
const annotations = ref<Map<string, Annotation>>();

const initialStructuralAnnotations = ref<Map<string, Annotation>>();
const initialAnnotations = ref<Map<string, Annotation>>();

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

function initializeTiptap(standoffObject?: { text: string; annotations: AnnotationData[] }): void {
  const data = standoffObject ? createExtendedStandoffObject(standoffObject) : standoffJson;
  const converter: StandoffConverter = new StandoffConverter(data as ApiJson);
  const { tipTapJson, annotations, structuralAnnotations } = converter.getData();

  const annos: Map<string, Annotation> = createAnnotationObjects(annotations);
  const structuralAnnos: Map<string, Annotation> = createAnnotationObjects(structuralAnnotations);

  setAnnotations({ annotations: annos, structuralAnnotations: structuralAnnos });

  tiptap.value = new Editor({
    // TODO: Content comes dynamically
    content: tipTapJson,
    extensions: [...getConfiguredExtensions()],
    autofocus: 'start',
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
    toCItems,
    structuralAnnotations,
    tiptap,
    destroyTiptap,
    initializeTiptap,
    setAnnotations,
  };
}
