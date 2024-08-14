import { ref } from 'vue';
import { useCollectionStore } from './collection';
import { useCharactersStore } from './characters';
import { objectsAreEqual } from '../helper/helper';

const { collection, initialCollection } = useCollectionStore();
const { snippetCharacters, initialCharacters } = useCharactersStore();

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

  // TODO: Implement comparing for changed annotations
  function hasUnsavedChanges(): boolean {
    // Compare collection properties
    if (!objectsAreEqual(collection.value, initialCollection.value)) {
      return true;
    }

    // Compare characters length
    if (snippetCharacters.value.length !== initialCharacters.value.length) {
      return true;
    }

    // Compare characters values
    for (let index = 0; index < snippetCharacters.value.length; index++) {
      if (
        !objectsAreEqual(snippetCharacters.value[index].data, initialCharacters.value[index].data)
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
    placeCursor,
    resetEditor,
  };
}
