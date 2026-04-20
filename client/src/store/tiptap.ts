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
import { AnnotationMark } from '../services/annotationMark';
import { ZeroPointAnnotation } from '../services/zeroPointAnnotation';
import StandoffConverter from '../services/standoffConverter';
import { standoffJson } from '../services/standoffJson';
import { cloneDeep } from '../utils/helper/helper';
import { AnnotationDecoration } from '../services/annotationDecoration';
import { Transaction } from '@tiptap/pm/state';
import { useFilterStore } from './filter';

const { selectedOptions } = useFilterStore();

const tiptap = shallowRef<Editor | null>(null);

const structuralAnnotations = ref<Map<string, Annotation>>();
const annotations = ref<Map<string, Annotation>>();
const toCItems = ref<TableOfContentData>([]);

const testAnnotations = [
  {
    additionalTexts: [],
    properties: {
      text: 'niederländische Provinz L',
      startIndex: 226,
      uuid: 'df8d7103-74ff-4ffa-b4fb-36693484790f',
      endIndex: 250,
      type: 'concept',
    },
    entities: [],
  },
  {
    additionalTexts: [],
    properties: {
      text: 'Ehemann',
      startIndex: 2657,
      uuid: '4ca5076c-6b0c-4ebe-b8e4-3a747d71199f',
      endIndex: 2663,
      type: 'concept',
    },
    entities: [
      {
        nodeLabels: ['Concept'],
        data: {
          label: 'Ehemann',
          uuid: '0172917b-202e-4571-a38e-5d1d34a7cf95',
        },
      },
    ],
  },
  {
    additionalTexts: [],
    properties: {
      text: 'Arlon',
      startIndex: 2632,
      uuid: '8cbbe9d1-b115-406f-96d1-74441d553388',
      endIndex: 2636,
      type: 'place',
    },
    entities: [
      {
        nodeLabels: ['Place'],
        data: {
          label: 'Arlon',
          uuid: '6540de0f-3931-4fde-852c-d0eb620c314d',
        },
      },
    ],
  },
  {
    additionalTexts: [],
    properties: {
      text: 'Provinz Limburg',
      startIndex: 242,
      uuid: '9197a8d1-c6d1-4747-b800-b7f8df761687',
      endIndex: 256,
      type: 'place',
    },
    entities: [
      {
        nodeLabels: ['Place'],
        data: {
          label: 'Limburg',
          uuid: 'a8b55639-6195-45b0-a04c-f00f61c27592',
        },
      },
    ],
  },
  {
    additionalTexts: [],
    properties: {
      text: ' Limburg war ein historisches Territorium im Heiligen Römischen Reich, dessen Kerngebiet',
      startIndex: 13,
      uuid: '5cca91e2-f05b-43e3-bff0-556567829295',
      endIndex: 100,
      type: 'commentary',
    },
    entities: [],
  },
];

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

function initializeTiptap(standoffObject?: { text: string; annotations: AnnotationData[] }): void {
  const data = standoffObject ? createExtendedStandoffObject(standoffObject) : standoffJson;

  const converter: StandoffConverter = new StandoffConverter(data as ApiJson);
  const { tipTapJson, annotations, structuralAnnotations } = converter.getData();

  const annos = createAnnotationObjects(annotations);
  const structuralAnnos = createAnnotationObjects(structuralAnnotations);

  setAnnotations({ annotations: annos, structuralAnnotations: structuralAnnos });

  type InitMeta = {
    type: 'initialize';
    annotations: Map<string, AnnotationData>;
    selectedTypes: string[];
  };

  tiptap.value = new Editor({
    // TODO: Content comes dynamically
    content: tipTapJson,
    extensions: [...getConfiguredExtensions()],
    autofocus: 'start',
    onCreate: ({ editor }) => {
      const tr: Transaction = editor.state.tr;

      const meta: InitMeta = {
        type: 'initialize',
        annotations: annotations,
        selectedTypes: selectedOptions.value,
      };

      tr.setMeta('type', meta);

      editor.view.dispatch(tr);
    },
  });
}

type FilterUpdateMeta = {
  type: 'filterUpdated';
  selectedTypes: string[];
};

watch(selectedOptions, newVal => {
  if (!tiptap.value) {
    return;
  }

  const tr: Transaction = tiptap.value.state.tr;

  const meta: FilterUpdateMeta = {
    type: 'filterUpdated',
    selectedTypes: newVal,
  };

  tr.setMeta('type', meta);

  tiptap.value?.view.dispatch(tr);
});

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
