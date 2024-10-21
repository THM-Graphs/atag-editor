import { ref } from 'vue';
import { useAnnotationStore } from './annotations';
import { useCharactersStore } from './characters';
import { EDIT_DELAY, HISTORY_MAX_SIZE } from '../config/constants';
import { HistoryRecord, HistoryStack } from '../models/types';
import { cloneDeep } from '../utils/helper/helper';

const { snippetCharacters } = useCharactersStore();
const { annotations } = useAnnotationStore();

let lastEditTimestamp: number = Date.now();
let currentHistoryPosition: number = 0;

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
        characters: cloneDeep(snippetCharacters.value),
        annotations: cloneDeep(annotations.value),
      },
    ];

    currentHistoryPosition = 0;
  }

  /**
   * Pushes a new entry into the history stack if enough time has passed since the last edit (defined in `EDIT_DELAY` constant).
   * Creates a new history record with the current annotations and characters and adds it to the history stack at the current
   * history pointer index. Removes the oldest entry if the stack exceeds the maximum size.
   *
   * @return {void} No return value.
   */
  function pushHistoryEntry(): void {
    if (Date.now() - lastEditTimestamp < EDIT_DELAY) {
      lastEditTimestamp = Date.now();
      return;
    }

    lastEditTimestamp = Date.now();

    const newEntry: HistoryRecord = {
      annotations: cloneDeep(annotations.value),
      characters: cloneDeep(snippetCharacters.value),
    };

    history.value.splice(currentHistoryPosition + 1, Infinity, newEntry);

    // Keep stack reasonably small
    // TODO: Give hint for user (like toast/message)
    if (history.value.length > HISTORY_MAX_SIZE) {
      history.value.shift();
    }

    currentHistoryPosition = history.value.length - 1;
  }

  /**
   * Moves backwards in the editing history by 1 and updates the current character snippet and annotations while keeping
   * the stack intact for possible later redo action. Called on undo action (Ctrl + Z).
   *
   * @return {void} No return value.
   */
  function undo(): void {
    if (currentHistoryPosition < 1) {
      return;
    }

    currentHistoryPosition--;

    snippetCharacters.value = JSON.parse(
      JSON.stringify(history.value[currentHistoryPosition].characters),
    );
    annotations.value = JSON.parse(
      JSON.stringify(history.value[currentHistoryPosition].annotations),
    );
  }

  /**
   * Moves forward in the editing history by 1 and updates the current character snippet and annotations while keeping
   * the stack intact for possible later undo/redo action. Called on redo action (Ctrl + Shift + Z).
   *
   * @return {void} No return value.
   */
  function redo(): void {
    if (currentHistoryPosition >= history.value.length - 1) {
      return;
    }

    currentHistoryPosition++;

    snippetCharacters.value = JSON.parse(
      JSON.stringify(history.value[currentHistoryPosition].characters),
    );
    annotations.value = JSON.parse(
      JSON.stringify(history.value[currentHistoryPosition].annotations),
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
    initializeHistory,
    pushHistoryEntry,
    redo,
    resetHistory,
    undo,
  };
}
