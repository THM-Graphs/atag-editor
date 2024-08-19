import { ref } from 'vue';
import IAnnotation from '../models/IAnnotation';
import { Annotation, AnnotationReference, Character } from '../models/types';
import { useCharactersStore } from './characters';

const annotations = ref<Annotation[]>([]);
const initialAnnotations = ref<Annotation[]>([]);

const { afterEndIndex, beforeStartIndex, snippetCharacters, totalCharacters } =
  useCharactersStore();

/**
 * Store for managing the state of annotations inside an editor instance. When the component is mounted,
 * the store is initialized with the fetched annotations from the database. When the component is unmounted,
 * the store is reset (annotation array is emptied).
 */
export function useAnnotationStore() {
  function initializeAnnotations(annotationData: IAnnotation[]): void {
    resetAnnotations();

    // TODO: This might be slow...are characters, start and end really needed before saving?
    annotations.value = annotationData.map((annotation: IAnnotation, index: number) => {
      const charUuids: string[] = [
        ...totalCharacters.value
          .filter(c => c.annotations.some(a => a.uuid === annotationData[index].uuid))
          .map(cc => cc.data.uuid),
      ];

      const isLeftTruncated: boolean =
        beforeStartIndex.value &&
        totalCharacters.value[beforeStartIndex.value].annotations.some(
          a => a.uuid === annotation.uuid,
        );

      const isRightTruncated: boolean =
        afterEndIndex.value &&
        totalCharacters.value[afterEndIndex.value].annotations.some(
          a => a.uuid === annotation.uuid,
        );

      if (isLeftTruncated || isRightTruncated) {
        console.log(annotation);
      }

      return {
        characterUuids: charUuids,
        data: { ...annotation },
        endUuid: charUuids[charUuids.length - 1],
        initialData: { ...annotation },
        isTruncated: isLeftTruncated || isRightTruncated,
        startUuid: charUuids[0],
        status: 'existing',
      };
    });

    // TODO: Duplicate functionality with character pagination methods -> simplify

    let charUuids: Set<string> = new Set();

    snippetCharacters.value.forEach(c => {
      c.annotations.forEach(a => charUuids.add(a.uuid));
    });

    annotations.value.forEach((annotation: Annotation) => {
      if (!charUuids.has(annotation.data.uuid)) {
        annotation.isTruncated = false;
      } else {
        const isLeftTruncated: boolean =
          beforeStartIndex.value &&
          totalCharacters.value[beforeStartIndex.value].annotations.some(
            a => a.uuid === annotation.data.uuid,
          );

        const isRightTruncated: boolean =
          afterEndIndex.value &&
          totalCharacters.value[afterEndIndex.value].annotations.some(
            a => a.uuid === annotation.data.uuid,
          );

        if (isLeftTruncated || isRightTruncated) {
          annotation.isTruncated = true;
        } else {
          annotation.isTruncated = false;
        }
      }
    });

    initialAnnotations.value = JSON.parse(JSON.stringify(annotations.value));
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

  /**
   * Updates the annotations before saving changes to the database.
   *
   * @return {void} This function does not return a value.
   */
  function updateAnnotationsBeforeSave(): void {
    updateCharacterInformation();
    setEditStatus();
  }

  /**
   * Updates the character information for each annotation in the `annotations` value.
   * This function sets the `characterUuids` property of the Annotation object and computes the `text` property for the annotation node.
   * Called before changes are saved to the database.
   *
   * @return {void} This function does not return a value.
   */
  function updateCharacterInformation(): void {
    const charMap: Map<string, Character[]> = new Map();

    // TODO: This might be slow on longer/more annotated texts too...
    totalCharacters.value.forEach(c => {
      c.annotations.forEach((a: AnnotationReference) => {
        const mapValue: Character[] | undefined = charMap.get(a.uuid);

        if (!mapValue) {
          charMap.set(a.uuid, [c]);
        } else {
          charMap.set(a.uuid, [...mapValue, c]);
        }
      });
    });

    annotations.value
      .filter((a: Annotation) => a.status !== 'deleted')
      .forEach((a: Annotation) => {
        const annotatedCharacters: Character[] = charMap.get(a.data.uuid) ?? [];

        a.characterUuids = annotatedCharacters.map(c => c.data.uuid) ?? [];
        a.data.text = annotatedCharacters.map(c => c.data.text).join('') ?? '';
        a.startUuid = annotatedCharacters[0]?.data.uuid ?? '';
        a.endUuid = annotatedCharacters[annotatedCharacters.length - 1]?.data.uuid ?? '';
      });
  }

  /**
   * Updates the edit status of annotations in the `annotations` value.
   * Iterates over the annotations and sets the status to 'edited' if the current data does not match the initial data.
   *
   * @return {void} This function does not return a value.
   */
  function setEditStatus(): void {
    annotations.value.forEach((a: Annotation) => {
      if (a.characterUuids.length === 0) {
        a.status = 'deleted';
      }

      if (a.status === 'deleted') {
        return;
      }

      if (JSON.stringify(a.data) !== JSON.stringify(a.initialData)) {
        a.status = 'edited';
      }
    });
  }

  /**
   * Updates the statuses of the annotations in the `annotations` value AFTER changes were saved.
   * This function filters out the annotations with a status of `deleted` to remove them permanently,
   * sets the status of all remaining annotations to `existing` and sets the `initialData` property to the current annotation data.
   *
   * @return {void} This function does not return a value.
   */
  function updateAnnotationStatuses(): void {
    annotations.value = annotations.value.filter((a: Annotation) => a.status !== 'deleted');

    annotations.value.forEach((a: Annotation) => {
      a.status = 'existing';
      a.initialData = { ...a.data };
    });
  }

  return {
    annotations,
    initialAnnotations,
    addAnnotation,
    deleteAnnotation,
    initializeAnnotations,
    resetAnnotations,
    updateAnnotationStatuses,
    updateAnnotationsBeforeSave,
  };
}
