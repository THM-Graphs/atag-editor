import { ref } from 'vue';
import IAnnotation from '../models/IAnnotation';

const annotations = ref<IAnnotation[]>([]);

/**
 * Store for managing the state of annotations inside an editor instance. When the component is mounted,
 * the store is initialized with the fetched annotations from the database. When the component is unmounted,
 * the store is reset (annotation array is emptied).
 */
export function useAnnotationStore() {
  function initializeAnnotations(annotationData: IAnnotation[]): void {
    resetAnnotations();

    annotations.value = annotationData;
  }

  function resetAnnotations(): void {
    annotations.value = [];
  }

  return {
    annotations,
    initializeAnnotations,
    resetAnnotations,
  };
}
