import { ref, shallowRef, watch } from 'vue';
import { Annotation, AnnotationData, ApiJson } from '../models/types';
import { Editor } from '@tiptap/vue-3';
import StandoffConverter from '../services/standoffConverter';
import { standoffJson } from '../services/standoffJson';
import { useGuidelinesStore } from '../store/guidelines';
import { useFilterStore } from '../store/filter';
import { cloneDeep } from '../utils/helper/helper';
import {
  initializeAnnotationDecorations,
  syncAnnotationPositions,
  updateAnnotationFilter,
  updateAnnotationViewport,
} from '../services/annotationDecorations';

const { getConfiguredExtensions } = useGuidelinesStore();
const { selectedOptions } = useFilterStore();

const tiptap = shallowRef<Editor | null>(null);
let stopFilterWatch: (() => void) | null = null;

const structuralAnnotations = ref<Map<string, Annotation>>();
const annotations = ref<Map<string, Annotation>>();

function initializeTiptap(standoffObject?: { text: string; annotations: AnnotationData[] }): void {
  const data = standoffObject ? createExtendedStandoffObject(standoffObject) : standoffJson;

  const converter: StandoffConverter = new StandoffConverter(data as ApiJson);
  const {
    tipTapJson,
    annotations: annotationDtos,
    structuralAnnotations: structuralAnnotationDtos,
  } = converter.getData();

  setAnnotations({
    annotations: createAnnotationObjects(annotationDtos),
    structuralAnnotations: createAnnotationObjects(structuralAnnotationDtos),
  });

  tiptap.value = new Editor({
    content: tipTapJson,
    extensions: [...getConfiguredExtensions()],
    autofocus: 'end',
  });

  initializeAnnotationDecorations(tiptap.value, annotationDtos, selectedOptions.value);

  stopFilterWatch?.();
  stopFilterWatch = watch(selectedOptions, types => {
    console.log('filter hit');
    if (tiptap.value) updateAnnotationFilter(tiptap.value, types);
  });
}

function syncAnnotationsForSave(): void {
  if (!tiptap.value || !annotations.value) return;

  const annotationDataMap = new Map<string, AnnotationData>(
    [...annotations.value.entries()].map(([uuid, anno]) => [uuid, anno.data]),
  );

  syncAnnotationPositions(tiptap.value.state, annotationDataMap);

  annotationDataMap.forEach((data, uuid) => {
    const anno = annotations.value!.get(uuid);
    if (anno) {
      anno.data.properties.startIndex = data.properties.startIndex;
      anno.data.properties.endIndex = data.properties.endIndex;
    }
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
  stopFilterWatch?.();
  stopFilterWatch = null;
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
function onViewportChange(): void {
  if (tiptap.value) updateAnnotationViewport(tiptap.value);
}

export function useTiptapStore() {
  return {
    annotations,
    structuralAnnotations,
    tiptap,
    destroyTiptap,
    initializeTiptap,
    onViewportChange,
    setAnnotations,
  };
}
