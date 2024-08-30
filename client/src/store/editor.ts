import { ref } from 'vue';
import { useAnnotationStore } from './annotations';
import { useCollectionStore } from './collection';
import { useCharactersStore } from './characters';
import { areObjectsEqual, areSetsEqual } from '../helper/helper';
import { Annotation } from '../models/types';

const { collection, initialCollection } = useCollectionStore();
const { snippetCharacters, initialSnippetCharacters } = useCharactersStore();
const { annotations, initialAnnotations } = useAnnotationStore();

const newRangeAnchorUuid = ref<string | null>(null);

/**
 * Store for editor state and operations (cursor placement, change detection etc.). When the component is unmounted,
 * the store is reset.
 */
export function useEditorStore() {
  /**
   * Places the caret at the specified position within the editor.
   *
   * If a new range anchor UUID is provided, the caret is placed at the corresponding element.
   * Otherwise, the caret is placed at the first span element within the #text container, or at the #text container itself if no span element is found.
   *
   * @return {void}
   */
  function placeCaret(): void {
    const range: Range = document.createRange();
    let element: HTMLDivElement | HTMLSpanElement | null;
    let offset: 0 | 1 = 1;

    if (newRangeAnchorUuid.value) {
      element = document.getElementById(newRangeAnchorUuid.value) as HTMLSpanElement;
    } else {
      element = document.querySelector('#text > span') as HTMLSpanElement;

      // Offset needs to be zero since the caret should be placed BEFORE the first matched span element
      if (element) {
        offset = 0;
      }

      // If no span element is found (=no text), place the caret at the #text container
      if (!element) {
        element = document.querySelector('#text') as HTMLDivElement;
      }
    }

    // This is the case when newRangeAnchorUuid points to a character that was deleted after cancel -> span can't be matched
    // TODO: Fix this? (Set range anchor to first/last span in text, ...)
    if (!element) {
      return;
    }

    range.setStart(element, offset);
    range.setEnd(element, offset);
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
    if (snippetCharacters.value.length !== initialSnippetCharacters.value.length) {
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
    for (let i = 0; i < snippetCharacters.value.length; i++) {
      const annotationsAreEqual = areSetsEqual(
        new Set(snippetCharacters.value[i].annotations.map(a => a.uuid)),
        new Set(initialSnippetCharacters.value[i].annotations.map(a => a.uuid)),
      );

      if (
        snippetCharacters.value[i].data.uuid !== initialSnippetCharacters.value[i].data.uuid ||
        !annotationsAreEqual
      ) {
        return true;
      }
    }

    // Check annotation status and data
    for (let i = 0; i < annotations.value.length; i++) {
      const a: Annotation = annotations.value[i];

      if (
        a.status === 'deleted' ||
        a.status === 'created' ||
        !areObjectsEqual(a.data, a.initialData)
      ) {
        return true;
      }
    }

    return false;
  }

  function resetEditor(): void {
    newRangeAnchorUuid.value = null;
  }

  return {
    newRangeAnchorUuid,
    hasUnsavedChanges,
    placeCaret,
    resetEditor,
  };
}
