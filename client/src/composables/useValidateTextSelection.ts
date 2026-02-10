import { AnnotationType } from '../models/types';
import { getParentCharacterSpan, getSelectionData, isEditorElement } from '../utils/helper/helper';
import AnnotationRangeError from '../utils/errors/annotationRange.error';

/**
 * Return type for the `useValidateTextSelection` composable.
 */
type UseValidateTextSelectionReturnType = {
  isValid: (config: AnnotationType) => boolean;
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
   * @param {AnnotationType} config - The configuration of the annotation type to validate against.
   * @returns {boolean} True if the text selection is valid, false otherwise.
   * @throws {AnnotationRangeError} If the text selection is not valid.
   */
  function isValid(config: AnnotationType): boolean {
    const { range, type } = getSelectionData();

    if (!range || type === 'None') {
      throw new AnnotationRangeError('No valid text selected.');
    }

    const commonAncestorContainer: Node | undefined | Element = range.commonAncestorContainer;

    if (commonAncestorContainer instanceof Element && !commonAncestorContainer.closest('#text')) {
      throw new AnnotationRangeError('Selection is outside the text component.');
    }

    if (
      commonAncestorContainer.nodeType === Node.TEXT_NODE &&
      !commonAncestorContainer.parentElement.closest('#text')
    ) {
      throw new AnnotationRangeError('Text selection is outside the text component.');
    }

    if (type === 'Caret' && !config.isZeroPoint && !config.isSeparator) {
      throw new AnnotationRangeError('Select some text to annotate.');
    }

    if ((type === 'Caret' && config.isZeroPoint) || config.isSeparator) {
      if (isEditorElement(range.startContainer)) {
        throw new AnnotationRangeError(
          'For creating zero-point annotations, place the caret between two characters',
        );
      } else {
        const parentSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
        const caretIsAtBeginning: boolean =
          range.startOffset === 0 && !parentSpanElement.previousElementSibling;
        const caretIsAtEnd: boolean =
          range.startOffset === 1 && !parentSpanElement.nextElementSibling;

        if (caretIsAtBeginning || caretIsAtEnd) {
          if (config.isZeroPoint) {
            throw new AnnotationRangeError(
              'To create zero-point annotations, place the caret between two characters',
            );
          }
          if (config.isSeparator) {
            throw new AnnotationRangeError(
              `To create ${config.type} annotations, the caret can not be at the start or end`,
            );
          }
        }
      }
    }

    if (type === 'Range' && config.isZeroPoint) {
      throw new AnnotationRangeError(
        'To create zero-point annotations, place the caret between two characters',
      );
    }

    if (type === 'Range' && config.isSeparator) {
      throw new AnnotationRangeError(
        `To create ${config.type} annotations, place the caret between two characters`,
      );
    }

    return true;
  }

  return {
    isValid,
  };
}
