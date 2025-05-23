import { ref } from 'vue';
import { useAnnotationStore } from './annotations';
import { useCharactersStore } from './characters';
import { areSetsEqual } from '../utils/helper/helper';
import { Annotation, CommandData, CommandType, HistoryRecord, HistoryStack } from '../models/types';
import { useTextStore } from './text';
import { EDIT_DELAY, HISTORY_MAX_SIZE } from '../config/constants';

const { text, initialText } = useTextStore();
const {
  snippetCharacters,
  initialSnippetCharacters,
  annotateCharacters,
  deleteCharactersBetweenUuids,
  deleteWordAfterUuid,
  deleteWordBeforeUuid,
  insertCharactersBetweenUuids,
  removeAnnotationFromCharacters,
  replaceCharactersBetweenUuids,
} = useCharactersStore();
const {
  annotations,
  initialAnnotations,
  addAnnotation,
  deleteAnnotation,
  expandAnnotation,
  shiftAnnotationLeft,
  shiftAnnotationRight,
  shrinkAnnotation,
} = useAnnotationStore();

const keepTextOnPagination = ref<boolean>(false);
const newRangeAnchorUuid = ref<string | null>(null);

const history = ref<HistoryStack>([]);
const redoStack = ref<HistoryRecord[]>([]);

/**
 * Store for editor state and operations (caret placement, change detection etc.). When the component is unmounted,
 * the store is reset.
 */
export function useEditorStore() {
  function execCommand(command: CommandType, data: CommandData): void {
    const { annotation, characters, leftUuid, rightUuid } = data;

    let historyRecord: HistoryRecord | null = null;

    if (command === 'insertText') {
      historyRecord = insertCharactersBetweenUuids(leftUuid, rightUuid, characters);
    } else if (command === 'replaceText') {
      historyRecord = replaceCharactersBetweenUuids(leftUuid, rightUuid, characters);
    } else if (command === 'deleteWordBefore') {
      historyRecord = deleteWordBeforeUuid(rightUuid);
    } else if (command === 'deleteWordAfter') {
      historyRecord = deleteWordAfterUuid(leftUuid);
    } else if (command === 'deleteText') {
      historyRecord = deleteCharactersBetweenUuids(leftUuid, rightUuid);
    } else if (command === 'createAnnotation') {
      addAnnotation(annotation);
      annotateCharacters(characters, annotation);
    } else if (command === 'deleteAnnotation') {
      deleteAnnotation(annotation.data.properties.uuid);
      removeAnnotationFromCharacters(annotation.data.properties.uuid);
    } else if (command === 'shiftAnnotationLeft') {
      shiftAnnotationLeft(annotation);
    } else if (command === 'shiftAnnotationRight') {
      shiftAnnotationRight(annotation);
    } else if (command === 'expandAnnotation') {
      expandAnnotation(annotation);
    } else if (command === 'shrinkAnnotation') {
      shrinkAnnotation(annotation);
    }

    if (historyRecord) {
      history.value.push(historyRecord);
      // Clear redo stack on any new command
      redoStack.value = [];

      // Enforce history size limit
      // if (history.value.length > HISTORY_MAX_SIZE) {
      //   history.value.shift(); // Remove the oldest entry
      // }
    }

    console.log(historyRecord);
  }

  /**
   * Places the caret at the specified position within the editor.
   *
   * If a new range anchor UUID is provided, the caret is placed at the corresponding element.
   * Otherwise, the caret is placed at the first span element within the #text container, or at the #text container itself if no span element is found.
   *
   * Called by an `onUpdated` hook in the `EditorText` component.
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

  // function pushHistoryEntry(record: HistoryRecord): void {
  //   // if (Date.now() - lastEditTimestamp < EDIT_DELAY) {
  //   //   lastEditTimestamp = Date.now();
  //   //   return;
  //   // }

  //   // lastEditTimestamp = Date.now();

  //   // const newEntry: HistoryRecord = {
  //   //   annotations: cloneDeep(annotations.value),
  //   //   characters: cloneDeep(snippetCharacters.value),
  //   // };

  //   // history.value.push(record);
  //   history.value.splice(currentHistoryPosition + 1, Infinity, record);

  //   // Keep stack reasonably small
  //   // TODO: Give hint for user (like toast/message)
  //   // if (history.value.length > HISTORY_MAX_SIZE) {
  //   //   history.value.shift();
  //   // }

  //   currentHistoryPosition = history.value.length - 1;
  //   console.log(currentHistoryPosition);
  // }

  function undo(): void {
    if (history.value.length === 0) {
      console.log('Nothing to undo.');
      return;
    }

    const record: HistoryRecord = history.value.pop();

    // Should not happen if stack is not empty
    if (!record) {
      return;
    }

    const { command, data } = record.data;

    if (command === 'insertText') {
      deleteCharactersBetweenUuids(data.leftUuid, data.rightUuid);
    } else if (command === 'replaceText') {
      replaceCharactersBetweenUuids(data.leftUuid, data.rightUuid, data.oldCharacterData);
    } else if (
      command === 'deleteWordBefore' ||
      command === 'deleteWordAfter' ||
      command === 'deleteText'
    ) {
      insertCharactersBetweenUuids(data.leftUuid, data.rightUuid, data.oldCharacterData!); // Insert after the char that was to the left of deletion
    } else if (command === 'createAnnotation') {
      deleteAnnotation(data.annotation.data.properties.uuid);
    } else if (command === 'deleteAnnotation') {
      addAnnotation(data.annotation!);
    } else if (command === 'shiftAnnotationLeft') {
      // To undo shifting left, shift right using the old state.
      // This implies `shiftAnnotationRight` can take the full annotation state (or its old/new boundaries)
      // shiftAnnotationRight(data.oldAnnotationData!); // Pass the annotation *before* the shift left
    } else if (command === 'shiftAnnotationRight') {
      // To undo shifting right, shift left using the old state.
      // shiftAnnotationLeft(data.oldAnnotationData!);
    } else if (command === 'expandAnnotation') {
      // To undo expand, shrink it.
      // shrinkAnnotation(data.oldAnnotationData!);
    } else if (command === 'shrinkAnnotation') {
      // To undo shrink, expand it.
      // expandAnnotation(data.oldAnnotationData!);
    }
    // else if (command === 'someGroupedCommand') {
    //   // Call its specific undo handler
    // }

    redoStack.value.push(record); // Move the undone record to the redo stack
  }

  /**
   * Performs a redo operation by re-applying the last undone command.
   * Moves the redone command's record back to the undo stack.
   */
  function redo(): void {
    if (redoStack.value.length === 0) {
      console.log('Nothing to redo.');
      return;
    }

    const record: HistoryRecord | undefined = redoStack.value.pop();

    if (!record) {
      return;
    }

    const { command, data } = record.data;

    if (command === 'insertText') {
      // Re-insert the characters that were originally inserted.
      insertCharactersBetweenUuids(data.leftUuid, data.rightUuid, data.newCharacterData);
    } else if (command === 'replaceText') {
      // Re-apply the replacement with the new characters.
      replaceCharactersBetweenUuids(data.leftUuid, data.rightUuid, data.newCharacterData);
    } else if (command === 'deleteWordBefore') {
      deleteWordBeforeUuid(data.rightUuid);
    } else if (command === 'deleteWordAfter') {
      deleteWordAfterUuid(data.leftUuid);
    } else if (command === 'deleteText') {
      deleteCharactersBetweenUuids(data.leftUuid, data.rightUuid);
    } else if (command === 'createAnnotation') {
      // Re-create the annotation.
      addAnnotation(data.annotation);
    } else if (command === 'deleteAnnotation') {
      // Re-delete the annotation.
      deleteAnnotation(data.annotation.data.properties.uuid);
    }
    // ... Implement redo logic for all other command types

    history.value.push(record); // Move the redone record back to the undo stack
  }

  function hasUnsavedChanges(): boolean {
    // Compare text labels
    // TODO: This needs to be adjusted as soon as labels can be edited
    if (!areSetsEqual(new Set(initialText.value.nodeLabels), new Set(text.value.nodeLabels))) {
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

    // Compare characters by uuid to see if the text has changed
    for (let i = 0; i < snippetCharacters.value.length; i++) {
      if (snippetCharacters.value[i].data.uuid !== initialSnippetCharacters.value[i].data.uuid) {
        return true;
      }
    }

    // Compare annotations of characters to see if annotation ranges have changed
    for (let i = 0; i < snippetCharacters.value.length; i++) {
      const annotationsAreEqual: boolean = areSetsEqual(
        new Set(snippetCharacters.value[i].annotations.map(a => a.uuid)),
        new Set(initialSnippetCharacters.value[i].annotations.map(a => a.uuid)),
      );

      if (!annotationsAreEqual) {
        return true;
      }
    }

    // Check annotation status and data
    for (let i = 0; i < annotations.value.length; i++) {
      const a: Annotation = annotations.value[i];

      const normdataUuids: Set<string> = new Set(
        Object.values(a.data.normdata)
          .flat()
          .map(m => m.uuid),
      );
      const initialNormdataUuids: Set<string> = new Set(
        Object.values(a.initialData.normdata)
          .flat()
          .map(m => m.uuid),
      );

      const initialAdditionalTextUuids: Set<string> = new Set(
        a.initialData.additionalTexts.map(at => at.collection.data.uuid),
      );

      const additionalTextUuids: Set<string> = new Set(
        a.data.additionalTexts.map(at => at.collection.data.uuid),
      );

      if (
        a.status === 'deleted' ||
        a.status === 'created' ||
        JSON.stringify(a.data.properties) !== JSON.stringify(a.initialData.properties) ||
        !areSetsEqual(normdataUuids, initialNormdataUuids) ||
        !areSetsEqual(initialAdditionalTextUuids, additionalTextUuids)
      ) {
        console.log(`Annotation at index ${i} has a changed status or data.`);
        return true;
      }
    }

    return false;
  }

  function resetEditor(): void {
    resetHistory();
    setNewRangeAnchorUuid(null);
  }

  /**
   * Resets the editing history by clearing history and redo stack. Called when the Editor component is unmounted.
   *
   * @return {void} This function does not return anything.
   */
  function resetHistory(): void {
    history.value = [];
    redoStack.value = [];
  }

  /**
   * Sets the UUID of the character whose span will be the range start after the next selection change.
   *
   * Called after each text operation. The `placeCaret` function will use this variable to set the caret to the specified element.
   *
   * @param {string | null | undefined} uuid - The UUID of the character or `null`/`undefined`.
   * @returns {void} No return value.
   */
  function setNewRangeAnchorUuid(uuid: string | null | undefined): void {
    newRangeAnchorUuid.value = uuid ?? null;
  }

  return {
    history,
    keepTextOnPagination,
    redoStack,
    execCommand,
    hasUnsavedChanges,
    placeCaret,
    redo,
    resetEditor,
    setNewRangeAnchorUuid,
    undo,
  };
}
