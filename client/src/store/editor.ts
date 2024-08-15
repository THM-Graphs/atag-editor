import { ref } from 'vue';
import { useAnnotationStore } from './annotations';
import { useCollectionStore } from './collection';
import { useCharactersStore } from './characters';
import { areObjectsEqual, areSetsEqual } from '../helper/helper';
import { Annotation } from '../models/types';

const { collection, initialCollection } = useCollectionStore();
const { snippetCharacters, initialCharacters } = useCharactersStore();
const { annotations, initialAnnotations } = useAnnotationStore();

const newRangeAnchorUuid = ref<string | null>(null);

/**
 * Store for editor state and operations (cursor placement, change detection etc.). When the component is unmounted,
 * the store is reset.
 */
export function useEditorStore() {
  // TODO: This takes very long on bigger texts -> improve
  function placeCursor(): void {
    const range: Range = document.createRange();
    let element: HTMLDivElement | HTMLSpanElement | null;

    if (newRangeAnchorUuid.value) {
      element = document.getElementById(newRangeAnchorUuid.value) as HTMLSpanElement;
    } else {
      element = document.querySelector('#text') as HTMLDivElement;
    }

    if (!element) {
      return;
    }

    range.setStart(element, 1);
    range.setEnd(element, 1);
    range.collapse(true);

    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }

  function hasUnsavedChanges(): boolean {
    // Compare collection properties
    if (!areObjectsEqual(collection.value, initialCollection.value)) {
      return true;
    }

    // Compare characters length
    if (snippetCharacters.value.length !== initialCharacters.value.length) {
      return true;
    }

    // Compare annotations length
    if (
      annotations.value.filter(a => a.status !== 'deleted').length !==
      initialAnnotations.value.length
    ) {
      return true;
    }

    // Compare characters values and annotations
    for (let index = 0; index < snippetCharacters.value.length; index++) {
      const annotationsAreEqual = areSetsEqual(
        new Set(snippetCharacters.value[index].annotations.map(a => a.uuid)),
        new Set(initialCharacters.value[index].annotations.map(a => a.uuid)),
      );

      if (
        snippetCharacters.value[index].data.uuid !== initialCharacters.value[index].data.uuid ||
        !annotationsAreEqual
      ) {
        return true;
      }
    }

    // Check annotation status and data
    annotations.value.forEach((a: Annotation) => {
      if (a.status === 'deleted' || a.status === 'created') {
        return true;
      }

      if (!areObjectsEqual(a.data, a.initialData)) {
        return true;
      }
    });

    return false;
  }

  function resetEditor(): void {
    newRangeAnchorUuid.value = null;
  }

  return {
    newRangeAnchorUuid,
    hasUnsavedChanges,
    placeCursor,
    resetEditor,
  };
}
