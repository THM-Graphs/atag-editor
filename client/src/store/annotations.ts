import { ref } from 'vue';
import {
  Annotation,
  AnnotationData,
  AnnotationReference,
  Character,
  TextOperationResult,
} from '../models/types';
import { useCharactersStore } from './characters';
import { cloneDeep } from '../utils/helper/helper';

const totalAnnotations = ref<Annotation[]>([]);
const initialTotalAnnotations = ref<Annotation[]>([]);
const snippetAnnotations = ref<Annotation[]>([]);
const initialSnippetAnnotations = ref<Annotation[]>([]);

const { snippetCharacters, totalCharacters, getAfterEndCharacter, getBeforeStartCharacter } =
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
   * @param {AnnotationData[]} annotationData - The array of annotation data objects to initialize the store with.
   * @param {'database' | 'import'} source - The source of the annotation data. `database` if the initialization happens on text load, `import` if it happens on text import.
   * @return {void} This function does not return any value.
   */
  function initializeAnnotations(
    annotationData: AnnotationData[],
    source: 'database' | 'import',
  ): void {
    resetAnnotations();

    // Map for checking which annotation has which characters. Structure: { "annotationUuid": <"charUuid1", "charUuid2", ...> }
    const characterAnnotationMap = createCharacterAnnotationMap(totalCharacters.value);

    const annotationObjects: Annotation[] = annotationData.map(
      (annotationDataObject: AnnotationData) => {
        const uuid: string = annotationDataObject.properties.uuid;

        const annotatedCharacterUuids: string[] = [...characterAnnotationMap.get(uuid)];

        // isTruncated is set to false at first since truncation happens in separate method
        return {
          characterUuids: annotatedCharacterUuids,
          data: cloneDeep(annotationDataObject),
          endUuid: annotatedCharacterUuids[annotatedCharacterUuids.length - 1],
          initialData: cloneDeep(annotationDataObject),
          isTruncated: false,
          startUuid: annotatedCharacterUuids[0],
          status: source === 'database' ? 'existing' : 'created',
        };
      },
    );

    console.time('total map');
    // Create map of ALL annotations
    totalAnnotations.value = annotationObjects;
    console.timeEnd('total map');

    console.time('snippet map');
    // Create copy of annotations in the current characters snippet
    extractSnippetAnnotations();
    console.timeEnd('snippet map');

    updateTruncationStatus();

    if (source === 'database') {
      initialTotalAnnotations.value = cloneDeep(totalAnnotations.value);
    } else {
      initialTotalAnnotations.value = [];
    }
  }

  /**
   * Extracts the annotations that are present in the current characters snippet in a new Array via deep copy.
   * This Array is used as working copy to perform operations on, similar to `snippetCharacters`, and inserted back
   * into the `totalAnnotations` Array on save.
   *
   * This function is called after initialization of the store and after pagination.
   *
   * @return {void} This function does not return any value.
   */
  function extractSnippetAnnotations(): void {
    // Clear snippet related state
    snippetAnnotations.value = [];
    initialSnippetAnnotations.value = [];

    const snippetAnnotationUuids: Set<string> = new Set(
      snippetCharacters.value.flatMap(c => c.annotations.map(a => a.uuid)),
    );

    totalAnnotations.value.forEach(anno => {
      if (snippetAnnotationUuids.has(anno.data.properties.uuid)) {
        snippetAnnotations.value.push(cloneDeep(anno));
        initialSnippetAnnotations.value.push(cloneDeep(anno));
      }
    });
  }

  function addAnnotation(annotation: Annotation): Annotation {
    snippetAnnotations.value.push(annotation);

    return annotation;
  }

  /**
   * Creates a map from each annotation UUID to the set of character UUIDs that
   * the annotation is associated with. Used during initialization of the store.
   *
   * @param {Character[]} characters The characters to iterate over, currently only case is the `totalCharacters` state variable.
   * @returns {Map<string, Set<string>>} A map from annotation UUIDs to sets of character UUIDs.
   */
  function createCharacterAnnotationMap(characters: Character[]): Map<string, Set<string>> {
    const map: Map<string, Set<string>> = new Map<string, Set<string>>();

    characters.forEach(c => {
      c.annotations.forEach(a => {
        const characterUuidSet: Set<string> = map.get(a.uuid);

        if (!characterUuidSet) {
          map.set(a.uuid, new Set([c.data.uuid]));
        } else {
          characterUuidSet.add(c.data.uuid);
        }
      });
    });

    return map;
  }

  function deleteAnnotation(uuid: string): void {
    const annotation: Annotation = snippetAnnotations.value.find(
      a => a.data.properties.uuid === uuid,
    );

    annotation.status = 'deleted';
  }

  function expandAnnotation(annotation: Annotation): TextOperationResult {
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
      subType: annotation.data.properties.subType ?? null,
      uuid: annotation.data.properties.uuid,
    } as AnnotationReference);

    // You are not the last anymore
    lastCharacter.annotations.find(
      a => a.uuid === annotation.data.properties.uuid,
    ).isLastCharacter = false;

    return { changeSet: [getAnnotationInfo(annotation).lastCharacter] };
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

  // TODO: Shouldnt this be in another file (Editor.vue, editor store etc.) or maybe even in the backend?
  // TODO: This should be more advanced to create a real changeset (annotated characters, updated information etc.)
  /**
   * Retrieves the annotations that need to be saved to the database. This includes annotations connected to
   * at least one character in the snippet (or a boundary character) as well as annotations marked as deleted.
   *
   * @returns {Annotation[]} An array of annotations to be saved.
   */
  function getAnnotationsToSave(): Annotation[] {
    let charUuids: Set<string> = new Set();

    snippetCharacters.value.forEach(c => {
      c.annotations.forEach(a => charUuids.add(a.uuid));
    });

    // annotations of the boundary characters need to be included since for truncated annotations
    // the standoffStart and standoffEnd information can be updated and must be stored in the node.
    getBeforeStartCharacter()?.annotations.forEach(a => charUuids.add(a.uuid));
    getAfterEndCharacter()?.annotations.forEach(a => charUuids.add(a.uuid));

    const affectedAnnotations: Annotation[] = [];

    totalAnnotations.value.forEach((annotation: Annotation) => {
      if (charUuids.has(annotation.data.properties.uuid) || annotation.status === 'deleted') {
        affectedAnnotations.push(annotation);
      }
    });

    return affectedAnnotations;
  }

  /**
   * Inserts or replaces each annotation from `snippetAnnotations` into `totalAnnotations`.
   *
   * Called on save.
   *
   * @return {void} This function does not return a value.
   */
  function insertSnippetIntoTotalAnnotations(): void {
    const snippetUuids: Set<string> = new Set(
      snippetAnnotations.value.map(a => a.data.properties.uuid),
    );

    // These are the annotations which will NOT be replaced by the snippet annotations
    const annotationsOutsideOfSnippet: Annotation[] = totalAnnotations.value.filter(
      (annotation: Annotation) => !snippetUuids.has(annotation.data.properties.uuid),
    );

    // Combine annotations
    totalAnnotations.value = [...annotationsOutsideOfSnippet, ...snippetAnnotations.value];
  }

  /**
   * Resets all annotation-related state variables to their initial values. Called when the Editor component is unmounted.
   *
   * @return {void} No return value.
   */
  function resetAnnotations(): void {
    snippetAnnotations.value = [];
    initialSnippetAnnotations.value = [];
    totalAnnotations.value = [];
    initialTotalAnnotations.value = [];
  }

  function shiftAnnotationLeft(annotation: Annotation): TextOperationResult {
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
      subType: annotation.data.properties.subType ?? null,
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

    return { changeSet: [getAnnotationInfo(annotation).lastCharacter] };
  }

  function shiftAnnotationRight(annotation: Annotation): TextOperationResult {
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
      subType: annotation.data.properties.subType ?? null,
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

    return { changeSet: [getAnnotationInfo(annotation).lastCharacter] };
  }

  function shrinkAnnotation(annotation: Annotation): TextOperationResult {
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

    return { changeSet: [getAnnotationInfo(annotation).lastCharacter] };
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

    totalAnnotations.value.forEach((a: Annotation) => {
      if (a.status !== 'deleted') {
        return;
      }

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
    totalAnnotations.value = totalAnnotations.value.filter(
      (a: Annotation) => a.status !== 'deleted',
    );

    totalAnnotations.value.forEach((a: Annotation) => {
      a.status = 'existing';
      a.initialData = cloneDeep(a.data);
    });
  }

  /**
   * Updates the `isTruncated` property of each annotation in the `snippetAnnotations` value.
   * An annotation is marked as truncated if it is present in the snippet and either the character before or after the snippet.
   *
   * Called during initialization (after the annotation object were created) and after pagination.
   *
   * @return {void} This function does not return a value.
   */
  function updateTruncationStatus(): void {
    // Get UUIDs of annotations in snippet and at the characteres before and after it.
    // Used to calculate truncation status
    const snippetAnnotationUuids: Set<string> = new Set(
      snippetCharacters.value.flatMap(c => c.annotations.map(a => a.uuid)),
    );

    const beforeStartAnnotationUuids: Set<string> = new Set(
      getBeforeStartCharacter()?.annotations.map(a => a.uuid) ?? [],
    );

    const afterEndAnnotationUuids: Set<string> = new Set(
      getAfterEndCharacter()?.annotations.map(a => a.uuid) ?? [],
    );

    snippetAnnotations.value.forEach((annotation: Annotation) => {
      const uuid: string = annotation.data.properties.uuid;

      const isLeftTruncated: boolean =
        beforeStartAnnotationUuids.has(uuid) && snippetAnnotationUuids.has(uuid);

      const isRightTruncated: boolean =
        afterEndAnnotationUuids.has(uuid) && snippetAnnotationUuids.has(uuid);

      annotation.isTruncated = isLeftTruncated || isRightTruncated;
    });
  }

  return {
    initialSnippetAnnotations,
    initialTotalAnnotations,
    snippetAnnotations,
    totalAnnotations,
    addAnnotation,
    deleteAnnotation,
    expandAnnotation,
    extractSnippetAnnotations,
    getAnnotationInfo,
    getAnnotationsToSave,
    initializeAnnotations,
    insertSnippetIntoTotalAnnotations,
    resetAnnotations,
    shiftAnnotationLeft,
    shiftAnnotationRight,
    shrinkAnnotation,
    updateAnnotationStatuses,
    updateAnnotationsBeforeSave,
    updateTruncationStatus,
  };
}
