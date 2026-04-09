import { ref, shallowRef } from 'vue';
import { Annotation, AnnotationData, ApiJson } from '../models/types';
import { Editor } from '@tiptap/vue-3';
import StandoffConverter from '../services/standoffConverter';
import { standoffJson } from '../services/standoffJson';
import { useGuidelinesStore } from '../store/guidelines';
import { cloneDeep } from '../utils/helper/helper';

const { getConfiguredExtensions } = useGuidelinesStore();

const tiptap = shallowRef<Editor | null>(null);

const structuralAnnotations = ref<Map<string, Annotation>>();
const annotations = ref<Map<string, Annotation>>();

function initializeTiptap(): void {
  const converter: StandoffConverter = new StandoffConverter(standoffJson as ApiJson);
  const { tipTapJson, annotations, structuralAnnotations } = converter.getData();

  const annos = createAnnotationObjects(annotations);
  const structuralAnnos = createAnnotationObjects(structuralAnnotations);

  setAnnotations({ annotations: annos, structuralAnnotations: structuralAnnos });

  tiptap.value = new Editor({
    // TODO: Content comes dynamically
    content: tipTapJson,
    extensions: [...getConfiguredExtensions()],
    autofocus: 'end',
  });
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
    structuralAnnotations,
    tiptap,
    destroyTiptap,
    initializeTiptap,
    setAnnotations,
  };
}
