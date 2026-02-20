import { ref, readonly, Ref, DeepReadonly } from 'vue';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { StandoffJson } from '../models/types';
import { buildStandoffJson } from '../utils/helper/helper';

type ExportStatus = 'idle' | 'copied' | 'error';

type ErrorMessage = {
  severity: string;
  content: string;
  id: number;
};

export type UseExportReturn = {
  exportedJson: Readonly<Ref<string>>;
  status: Readonly<Ref<ExportStatus>>;
  errorMessages: DeepReadonly<Ref<ErrorMessage[]>>;
  buildJson: () => void;
  copyToClipboard: () => Promise<void>;
  downloadJson: (filename?: string) => void;
  reset: () => void;
};

/**
 * A composable that handles exporting editor data (text and annotations) as Standoff JSON.
 * Provides functionality to build the JSON string, copy it to the clipboard, or download it as a `.json` file.
 *
 * IMPORTANT: Exported text and annotations refers to the TOTAL characters and annotations arrays.
 * Unsaved changes in the snippet will NOT be exported, but a warning will be shown to the user.
 *
 * @returns {UseExportReturn}
 */
export function useExport(): UseExportReturn {
  const { totalAnnotations } = useAnnotationStore();
  const { totalCharacters } = useCharactersStore();

  const jsonToExport = ref<string>('');
  const status = ref<ExportStatus>('idle');

  const errorMessages = ref<ErrorMessage[]>([]);
  let errorCount: number = 0;

  function addErrorMessage(content: string): void {
    errorMessages.value.push({ severity: 'error', content, id: errorCount++ });
  }

  /**
   * Builds the Standoff JSON string from the current store state and stores it in `exportedJson`.
   * Resets any previous error state before building.
   *
   * @returns {void} This function does not return any value.
   */
  function buildJson(): void {
    clearErrorMessages();
    setPipelineStatus('idle');

    try {
      const standoff: StandoffJson = buildStandoffJson(
        totalCharacters.value,
        totalAnnotations.value,
      );

      jsonToExport.value = JSON.stringify(standoff, null, 2);
    } catch (e: unknown) {
      addErrorMessage('Failed to build JSON. Please check the editor data and try again.');
      setPipelineStatus('error');
    }
  }

  /**
   * Copies the current exportedJson string to the clipboard.
   * Sets status to `copied` on success, `error` on failure.
   *
   * @returns {Promise<void>} This function does not return any value.
   */
  async function copyToClipboard(): Promise<void> {
    if (!jsonToExport.value) {
      addErrorMessage('Nothing to copy. Please generate the export first.');
      setPipelineStatus('error');

      return;
    }

    try {
      await navigator.clipboard.writeText(jsonToExport.value);

      setPipelineStatus('copied');
    } catch (e: unknown) {
      addErrorMessage('Failed to copy to clipboard.');
      setPipelineStatus('error');
    }
  }

  /**
   * Triggers a browser download of the exportedJson string as a `.json` file.
   *
   * @param {string} filename - The name of the downloaded file (default: 'export.json').
   */
  function downloadJson(filename: string = 'standoff-export.json'): void {
    if (!jsonToExport.value) {
      addErrorMessage('Nothing to download. Please generate the export first.');
      setPipelineStatus('error');

      return;
    }

    try {
      const blob: Blob = new Blob([jsonToExport.value], { type: 'application/json' });
      const url: string = URL.createObjectURL(blob);
      const anchor: HTMLAnchorElement = document.createElement('a');

      anchor.href = url;
      anchor.download = filename;
      anchor.click();

      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      addErrorMessage('Failed to download file.');
      setPipelineStatus('error');
    }
  }

  /**
   * Resets the error message list and count back to their initial values.
   *
   * Called whenever the pipeline status changes back to `idle` or when the `reset()` function is called.
   *
   * @returns {void} This function does not return any value.
   */
  function clearErrorMessages(): void {
    errorCount = 0;
    errorMessages.value = [];
  }

  /**
   * Resets the composable back to its initial state.
   *
   * @returns {void} This function does not return any value.
   */
  function reset(): void {
    jsonToExport.value = '';

    setPipelineStatus('idle');
    clearErrorMessages();
  }

  /**
   * Sets the current pipeline status to the given status.
   *
   * @param {ExportStatus} newStatus The new status of the pipeline.
   * @returns {void} This function does not return any value.
   */
  function setPipelineStatus(newStatus: ExportStatus): void {
    status.value = newStatus;
  }

  return {
    exportedJson: readonly(jsonToExport),
    status: readonly(status),
    errorMessages: readonly(errorMessages),
    buildJson,
    copyToClipboard,
    downloadJson,
    reset,
  };
}
