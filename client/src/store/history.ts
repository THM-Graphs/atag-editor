import { ref } from 'vue';
import { useAnnotationStore } from './annotations';
import { useCharactersStore } from './characters';
import { EDIT_DELAY, HISTORY_MAX_SIZE } from '../config/constants';
import { HistoryRecord, HistoryStack } from '../models/types';

const { snippetCharacters } = useCharactersStore();
const { annotations } = useAnnotationStore();

const lastEditTimestamp = ref(Date.now());

const history = ref<HistoryStack>([]);

// TODO: Should this be moved to the editor store...?
/**
 * Store for managing the state of editing history inside an editor instance. New entries are pushed
 * to the history stack on typing/annotating, old ones removed on undo action (Ctrl + Z). A delay is used to prevent too
 * frequent stack changes on rapid typing. The history is scoped to the current character snippet and is reinitialized on pagination.
 */
export function useHistoryStore() {
  /**
   * Initializes the editing history by creating the first entry in the history stack from the current character snippet.
   * Called when the Editor component is mounted and when the snippet changes on pagination (Undo behaviour is scoped to the current snippet).
   *
   * @return {void} No return value.
   */
  // TODO: Can this be done with a watcher for beforeStartIndex/afterEndIndex...?
  function initializeHistory(): void {
    history.value = [
      {
        characters: JSON.parse(JSON.stringify(snippetCharacters.value)),
        annotations: JSON.parse(JSON.stringify(annotations.value)),
      },
    ];
  }

  /**
   * Pushes a new entry into the history stack if enough time has passed since the last edit (defined in EDIT_DELAY constant).
   * Creates a new history record with the current annotations and characters, adds it to the history stack,
   * and removes the oldest entry if the stack exceeds the maximum size.
   *
   * @return {void} No return value.
   */
  function pushHistoryEntry(): void {
    if (Date.now() - lastEditTimestamp.value < EDIT_DELAY) {
      // console.log(Date.now() - lastEditTimestamp.value);
      lastEditTimestamp.value = Date.now();
      return;
    }

    lastEditTimestamp.value = Date.now();

    console.time('snapshot');
    const newEntry: HistoryRecord = {
      annotations: JSON.parse(JSON.stringify(annotations.value)),
      characters: [...snippetCharacters.value],
    };

    history.value.push(newEntry);

    // Keep stack reasonably small
    // TODO: Give hint for user (like toast/message)
    if (history.value.length > HISTORY_MAX_SIZE) {
      history.value.shift();
    }

    console.timeEnd('snapshot');
  }

  /**
   * Removes the most recent entry from the editing history and updates the current character snippet and annotations.
   * Called on undo action (Ctrl + Z).
   *
   * @return {void} No return value.
   */
  function removeHistoryEntry(): void {
    if (history.value.length <= 1) {
      return;
    }

    history.value.pop();

    snippetCharacters.value = JSON.parse(
      JSON.stringify(history.value[history.value.length - 1].characters),
    );
    annotations.value = JSON.parse(
      JSON.stringify(history.value[history.value.length - 1].annotations),
    );
  }

  /**
   * Resets the editing history by clearing the history stack. Called when the Editor component is unmounted.
   *
   * @return {void} No return value.
   */
  function resetHistory(): void {
    history.value = [];
  }

  return {
    history,
    pushHistoryEntry,
    initializeHistory,
    removeHistoryEntry,
    resetHistory,
  };
}
