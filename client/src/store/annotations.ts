import { ref } from 'vue';
import { Annotation, AnnotationData, AnnotationReference, Character } from '../models/types';
import { useCharactersStore } from './characters';
import { cloneDeep } from '../utils/helper/helper';

const annotations = ref<Annotation[]>([]);
const initialAnnotations = ref<Annotation[]>([]);

const { afterEndIndex, beforeStartIndex, snippetCharacters, totalCharacters } =
  useCharactersStore();

/**
 * Store for managing the state of annotations inside an editor instance. When the component is mounted,
 * the store is initialized with the fetched annotations from the database. When the component is unmounted,
 * the store is reset (annotation array is emptied). The store can also be reinitialized during text import.
 */
export function useAnnotationStore() {
  /**
   * Initializes the annotation store with the provided annotation data. Called on annotation fetching from the database or on text import.
   * This function resets the store and performs further initialization logic depending on the source.
   *
   * @param {IAnnotation[]} annotationData - The array of annotations to initialize the store with.
   * @param {'database' | 'import'} source - The source of the annotation data. `database` if the initialization happens on text load,
   *                                         `import` if it happens on text import.
   * @return {void} This function does not return any value.
   */
  function initializeAnnotations(
    annotationData: AnnotationData[],
    source: 'database' | 'import',
  ): void {
    resetAnnotations();

    // TODO: This can be simplified, too much duplication
    // TODO: This IS slow when importing text with many annotations -> fix!
    annotations.value = annotationData.map((annotation: AnnotationData, index: number) => {
      const charUuids: string[] = [
        ...totalCharacters.value
          .filter(c => c.annotations.some(a => a.uuid === annotationData[index].properties.uuid))
          .map(cc => cc.data.uuid),
      ];

      const isLeftTruncated: boolean =
        beforeStartIndex.value &&
        totalCharacters.value[beforeStartIndex.value].annotations.some(
          a => a.uuid === annotation.properties.uuid,
        );

      const isRightTruncated: boolean =
        afterEndIndex.value &&
        totalCharacters.value[afterEndIndex.value].annotations.some(
          a => a.uuid === annotation.properties.uuid,
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
        status: source === 'database' ? 'existing' : 'created',
      };
    });

    // TODO: Duplicate functionality with character pagination methods -> simplify

    let charUuids: Set<string> = new Set();

    snippetCharacters.value.forEach(c => {
      c.annotations.forEach(a => charUuids.add(a.uuid));
    });

    annotations.value.forEach((annotation: Annotation) => {
      if (!charUuids.has(annotation.data.properties.uuid)) {
        annotation.isTruncated = false;
      } else {
        const isLeftTruncated: boolean =
          beforeStartIndex.value &&
          totalCharacters.value[beforeStartIndex.value].annotations.some(
            a => a.uuid === annotation.data.properties.uuid,
          );

        const isRightTruncated: boolean =
          afterEndIndex.value &&
          totalCharacters.value[afterEndIndex.value].annotations.some(
            a => a.uuid === annotation.data.properties.uuid,
          );

        if (isLeftTruncated || isRightTruncated) {
          annotation.isTruncated = true;
        } else {
          annotation.isTruncated = false;
        }
      }
    });

    if (source === 'database') {
      initialAnnotations.value = cloneDeep(annotations.value);
    } else {
      initialAnnotations.value = [];
    }
  }

  function addAnnotation(annotation: Annotation): void {
    annotations.value.push(annotation);
  }

  function deleteAnnotation(uuid: string): void {
    const annotation: Annotation = annotations.value.find(a => a.data.properties.uuid === uuid);
    annotation.status = 'deleted';
  }

  function expandAnnotation(annotation: Annotation): void {
    if (annotation.isTruncated) {
      return;
    }

    const { lastCharacter, lastIndex } = getAnnotationInfo(annotation);

    if (lastIndex === snippetCharacters.value.length - 1) {
      return;
    }

    // You are the last character now
    snippetCharacters.value[lastIndex + 1].annotations.push({
      isLastCharacter: true,
      type: annotation.data.properties.type,
      subtype: annotation.data.properties.subtype ?? null,
      uuid: annotation.data.properties.uuid,
    } as AnnotationReference);

    // You are not the last anymore
    lastCharacter.annotations.find(
      a => a.uuid === annotation.data.properties.uuid,
    ).isLastCharacter = false;
  }

  /**
   * Retrieves information about the characters that are annotated with the specified annotation.
   * The information includes the first and last character, as well as their respective indexes.
   *
   * @param {Annotation} annotation - The annotation for which to retrieve information.
   * @return {{firstCharacter: Character, lastCharacter: Character, firstIndex: number, lastIndex: number}} - The information about the annotated characters.
   */
  function getAnnotationInfo(annotation: Annotation): {
    firstCharacter: Character;
    lastCharacter: Character;
    firstIndex: number;
    lastIndex: number;
  } {
    const annotatedCharacters: Character[] = snippetCharacters.value.filter(c =>
      c.annotations.some(a => a.uuid === annotation.data.properties.uuid),
    );
    const firstCharacter: Character = annotatedCharacters[0];
    const lastCharacter: Character = annotatedCharacters[annotatedCharacters.length - 1];

    const firstIndex: number = snippetCharacters.value.findIndex(c => c === firstCharacter);
    const lastIndex: number = snippetCharacters.value.findIndex(c => c === lastCharacter);

    return { firstCharacter, lastCharacter, firstIndex, lastIndex };
  }

  /**
   * Resets all annotation-related state variables to their initial values. Called when the Editor component is unmounted.
   *
   * @return {void} No return value.
   */
  function resetAnnotations(): void {
    annotations.value = [];
    initialAnnotations.value = [];
  }

  function shiftAnnotationLeft(annotation: Annotation): void {
    if (annotation.isTruncated) {
      return;
    }

    const { firstCharacter, lastCharacter, firstIndex, lastIndex } = getAnnotationInfo(annotation);

    if (firstIndex <= 0) {
      return;
    }

    // You are the first character now
    snippetCharacters.value[firstIndex - 1].annotations.push({
      isFirstCharacter: true,
      type: annotation.data.properties.type,
      subtype: annotation.data.properties.subtype ?? null,
      uuid: annotation.data.properties.uuid,
    } as AnnotationReference);

    // You are not the first anymore
    firstCharacter.annotations.find(
      a => a.uuid === annotation.data.properties.uuid,
    ).isFirstCharacter = false;

    // Your are not the last anymore
    lastCharacter.annotations = lastCharacter.annotations.filter(
      a => a.uuid !== annotation.data.properties.uuid,
    );

    // You are the last character now
    snippetCharacters.value[lastIndex - 1].annotations.find(
      a => a.uuid === annotation.data.properties.uuid,
    ).isLastCharacter = true;
  }

  function shiftAnnotationRight(annotation: Annotation): void {
    if (annotation.isTruncated) {
      return;
    }

    const { firstCharacter, lastCharacter, firstIndex, lastIndex } = getAnnotationInfo(annotation);

    if (lastIndex === snippetCharacters.value.length - 1) {
      return;
    }

    // You are the last character now
    snippetCharacters.value[lastIndex + 1].annotations.push({
      isLastCharacter: true,
      type: annotation.data.properties.type,
      subtype: annotation.data.properties.subtype ?? null,
      uuid: annotation.data.properties.uuid,
    } as AnnotationReference);

    // You are not the last anymore
    lastCharacter.annotations.find(
      a => a.uuid === annotation.data.properties.uuid,
    ).isLastCharacter = false;

    // Your are not annotated anymore
    firstCharacter.annotations = firstCharacter.annotations.filter(
      a => a.uuid !== annotation.data.properties.uuid,
    );

    // You are the first character now
    snippetCharacters.value[firstIndex + 1].annotations.find(
      a => a.uuid === annotation.data.properties.uuid,
    ).isFirstCharacter = true;
  }

  function shrinkAnnotation(annotation: Annotation): void {
    if (annotation.isTruncated) {
      return;
    }

    const { lastCharacter, firstIndex, lastIndex } = getAnnotationInfo(annotation);

    if (firstIndex === lastIndex) {
      return;
    }

    // Your are not the last anymore
    lastCharacter.annotations = lastCharacter.annotations.filter(
      a => a.uuid !== annotation.data.properties.uuid,
    );

    // You are the last character now
    snippetCharacters.value[lastIndex - 1].annotations.find(
      a => a.uuid === annotation.data.properties.uuid,
    ).isLastCharacter = true;
  }

  /**
   * Updates the annotations before saving changes to the database.
   *
   * @return {void} This function does not return a value.
   */
  function updateAnnotationsBeforeSave(): void {
    updateCharacterInformation();
  }

  /**
   * Updates the character information for each annotation in the `annotations` value.
   * This function sets the `characterUuids` property of the Annotation object and computes the `text` property for the annotation node.
   * If there is no annotated character (because the annotated text was deleted), the status of the annotation is set to `deleted`.
   *
   *  Called before changes are saved to the database.
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
        const annotatedCharacters: Character[] = charMap.get(a.data.properties.uuid) ?? [];

        if (annotatedCharacters.length === 0) {
          a.status = 'deleted';
        } else {
          a.characterUuids = annotatedCharacters.map(c => c.data.uuid) ?? [];
          a.data.properties.text = annotatedCharacters.map(c => c.data.text).join('') ?? '';
          a.startUuid = annotatedCharacters[0]?.data.uuid ?? '';
          a.endUuid = annotatedCharacters[annotatedCharacters.length - 1]?.data.uuid ?? '';
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
    expandAnnotation,
    getAnnotationInfo,
    initializeAnnotations,
    resetAnnotations,
    shiftAnnotationLeft,
    shiftAnnotationRight,
    shrinkAnnotation,
    updateAnnotationStatuses,
    updateAnnotationsBeforeSave,
  };
}
