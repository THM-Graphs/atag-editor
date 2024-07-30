import { ref } from 'vue';
import IAnnotation from '../models/IAnnotation';
import { Annotation } from '../models/types';
import { useCharactersStore } from './characters';

const annotations = ref<Annotation[]>([]);

const { totalCharacters } = useCharactersStore();

/**
 * Store for managing the state of annotations inside an editor instance. When the component is mounted,
 * the store is initialized with the fetched annotations from the database. When the component is unmounted,
 * the store is reset (annotation array is emptied).
 */
export function useAnnotationStore() {
  function initializeAnnotations(annotationData: IAnnotation[]): void {
    resetAnnotations();

    // TODO: This might be slow...are characters, start and end really needed before saving?
    annotations.value = annotationData.map((annotation: IAnnotation) => {
      const charUuids: string[] = [
        ...totalCharacters.value
          .filter(c => c.annotations.some(a => a.uuid === annotationData[0].uuid))
          .map(cc => cc.data.uuid),
      ];

      return {
        characterUuids: charUuids,
        data: annotation,
        endUuid: charUuids[charUuids.length - 1],
        startUuid: charUuids[0],
        status: 'existing',
      };
    });
  }

  function addAnnotation(annotation: Annotation): void {
    annotations.value.push(annotation);
  }

  function deleteAnnotation(uuid: string): void {
    const annotation: Annotation = annotations.value.find(a => a.data.uuid === uuid);
    annotation.status = 'deleted';
  }

  function resetAnnotations(): void {
    annotations.value = [];
  }

  return {
    annotations,
    addAnnotation,
    deleteAnnotation,
    initializeAnnotations,
    resetAnnotations,
  };
}
