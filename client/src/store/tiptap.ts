import { ref, shallowRef } from 'vue';
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

const tiptap = shallowRef<Editor | null>(null);

const structuralAnnotations = ref<Map<string, Annotation>>();
const annotations = ref<Map<string, Annotation>>();
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
      anchorTypes: ['heading', 'paragraph'],

      getIndex: getHierarchicalIndexes,
      onUpdate: content => {
        console.log(content);
        toCItems.value = content;
      },
    }),
    ListKit,
    Gapcursor,
    UndoRedo,
    AnnotationMark,
    ZeroPointAnnotation,
    // UniqueID.configure({
    //   types: 'all',
    //   attributeName: 'node-uuid',
    //   generateID: () => crypto.randomUUID(),
    // }),
  ];
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
  });
}

function createExtendedStandoffObject(standoffObject: {
  text: string;
  annotations: AnnotationData[];
}): { text: string; annotations: AnnotationData[] } {
  const extended = cloneDeep(standoffObject);
  extended.annotations.push({
    additionalTexts: [],
    properties: {
      text: standoffJson.text,
      startIndex: 0,
      uuid: 'abc123',
      subType: '',
      endIndex: standoffJson.text.length - 1,
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
    structuralAnnotations,
    tiptap,
    destroyTiptap,
    initializeTiptap,
    setAnnotations,
  };
}
