import { ref, readonly, Ref, DeepReadonly } from 'vue';
import { NodeStatusObject } from '../models/types';

type ErrorMessage = {
  severity: string;
  content: string;
  id: number;
};

type PipelineStep = null | 'choosing' | 'editing' | 'finishing';

export type UseAddNodeReturn = {
  currentStep: Readonly<Ref<PipelineStep, PipelineStep>>;
  errorMessages: DeepReadonly<Ref<ErrorMessage[], ErrorMessage[]>>;
  node: Ref<NodeStatusObject | null>;
  addErrorMessage: (error: DOMException | unknown) => void;
  cancel: () => void;
  finish: () => void;
  init: () => Promise<void>;
  setNode: (node: NodeStatusObject | null) => void;
  setPipelineStep: (step: PipelineStep) => void;
};

/**
 * A composable function that provides a pipeline for importing JSON data into the Editor.
 * The pipeline consists of three steps: validating, transforming and importing. The import process can be cancelled at any time.
 * If an error occurs during the pipeline, an error message is added and the pipeline is reset to the previous state.
 *
 * @returns {UseAddNodeReturn} An object containing the necessary state variables and functions to control the pipeline.
 */
export function useAddNode(): UseAddNodeReturn {
  const node = ref<NodeStatusObject | null>(null);

  const currentStep = ref<PipelineStep>('choosing');
  const errorMessages = ref<ErrorMessage[]>([]);
  const errorMessageCount = ref<number>(0);

  function addErrorMessage(error: DOMException | unknown): void {
    errorMessages.value.push({
      severity: 'error',
      content: 'An unknown error occurred.',
      id: errorMessageCount.value++,
    });
  }

  /**
   * Cancels import process. Resets the import pipeline to its initial state and clears all data and messages.
   *
   * @returns {void} This function does not return any value.
   */
  function cancel(): void {
    clearErrorMessages();
    setPipelineStep(null);
  }

  function clearErrorMessages(): void {
    errorMessageCount.value = 0;
    errorMessages.value = [];
  }

  /**
   * Finishes the import. Resets the import pipeline to its initial state after a successful import.
   *
   * @return {void} This function does not return any value.
   */
  function finish(): void {
    resetPipeline();
  }

  async function init(): Promise<void> {
    clearErrorMessages();
    setPipelineStep('choosing');

    // setPipelineStep('finishing');
  }

  function resetPipeline(): void {
    setNode(null);
    setPipelineStep(null);
  }

  function setNode(newNode: NodeStatusObject | null): void {
    node.value = newNode;
  }

  function setPipelineStep(step: PipelineStep): void {
    currentStep.value = step;
  }

  return {
    currentStep: readonly(currentStep),
    errorMessages: readonly(errorMessages),
    node,
    addErrorMessage,
    cancel,
    finish,
    init,
    setPipelineStep,
    setNode,
  };
}
