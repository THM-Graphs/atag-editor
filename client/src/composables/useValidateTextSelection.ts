import { Selection } from '@tiptap/pm/state';
import { AnnotationType } from '../models/types';
import AnnotationRangeError from '../utils/errors/annotationRange.error';

/**
 * Return type for the `useValidateTextSelection` composable.
 */
type UseValidateTextSelectionReturnType = {
  isValid: (selection: Selection | undefined, config: AnnotationType) => boolean;
};

/**
 * A composable that validates the currently selected text in the editor.
 * It exposes one functions which is used to validate text selection against the configuration of the annotation type that is about to be created.
 *
 * @returns {UseValidateTextSelectionReturnType} An object with a single function, `isValid`.
 */
export function useValidateTextSelection(): UseValidateTextSelectionReturnType {
  /**
   * Checks if the currently selected text is valid for creating an annotation of the given type.
   * If the text selection is not valid, it throws an `AnnotationRangeError` with a descriptive error message.
   *
   * @param {Selection | undefined} selection - The current Selection of the editor.
   * @param {AnnotationType} config - The configuration of the annotation type to validate against.
   * @returns {boolean} True if the text selection is valid, false otherwise.
   * @throws {AnnotationRangeError} If the text selection is not valid.
   */
  function isValid(selection: Selection | undefined, config: AnnotationType): boolean {
    if (!selection) {
      throw new AnnotationRangeError('No valid text selected.');
    }

    const isCaret: boolean = selection.empty;

    if (isCaret && !config.isZeroPoint) {
      throw new AnnotationRangeError('Select some text to annotate.');
    }

    if (!isCaret && config.isZeroPoint) {
      throw new AnnotationRangeError(
        'To create zero-point annotations, place the caret between two characters',
      );
    }

    if (isCaret && config.isZeroPoint) {
      const caretIsAtBeginning: boolean = selection.$from.nodeBefore === null;
      const caretIsAtEnd: boolean = selection.$from.nodeAfter === null;

      if (caretIsAtBeginning || caretIsAtEnd) {
        throw new AnnotationRangeError(
          'To create zero-point annotations, place the caret between two characters',
        );
      }
    }

    return true;
  }

  return {
    isValid,
  };
}
