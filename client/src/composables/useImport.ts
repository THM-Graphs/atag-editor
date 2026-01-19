import { ref, readonly, Ref, DeepReadonly } from 'vue';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { useGuidelinesStore } from '../store/guidelines';
import { cloneDeep, getDefaultValueForProperty } from '../utils/helper/helper';
import JsonParseError from '../utils/errors/parse.error';
import ImportError from '../utils/errors/import.error';
import MalformedAnnotationsError from '../utils/errors/malformedAnnotations.error';
import IAnnotation from '../models/IAnnotation';
import {
  Annotation,
  AnnotationData,
  AnnotationType,
  Character,
  MalformedAnnotation,
  PropertyConfig,
  StandoffJson,
} from '../models/types';

interface DataDump {
  characters: {
    snippetCharacters: Character[];
    totalCharacters: Character[];
    initialSnippetCharacters: Character[];
    beforeStartIndex: number;
    afterEndIndex: number;
  };
  annotations: {
    initialAnnotations: Annotation[];
    annotations: Annotation[];
  };
}

type ErrorMessage = {
  severity: string;
  content: string;
  id: number;
};

type PipelineStep = null | 'validating' | 'importing' | 'finishing';

export type UseImportReturn = {
  currentStep: Readonly<Ref<PipelineStep, PipelineStep>>;
  errorMessages: DeepReadonly<Ref<ErrorMessage[], ErrorMessage[]>>;
  rawJson: Ref<string, string>;
  addErrorMessage: (
    error: JsonParseError | MalformedAnnotationsError | ImportError | DOMException | unknown,
  ) => void;
  cancel: () => void;
  finish: () => void;
  importJson: () => Promise<void>;
  setPipelineStep: (step: PipelineStep) => void;
};

/**
 * A composable function that provides a pipeline for importing JSON data into the Editor.
 * The pipeline consists of three steps: validating, transforming and importing. The import process can be cancelled at any time.
 * If an error occurs during the pipeline, an error message is added and the pipeline is reset to the previous state.
 *
 * @returns {UseImportReturn} An object containing the necessary state variables and functions to control the pipeline.
 */
export function useImport(): UseImportReturn {
  const { initialTotalAnnotations, totalAnnotations, initializeAnnotations } = useAnnotationStore();
  const {
    afterEndIndex,
    beforeStartIndex,
    initialSnippetCharacters,
    snippetCharacters,
    totalCharacters,
    initializeCharacters,
  } = useCharactersStore();

  const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

  const currentStep = ref<PipelineStep>(null);
  const errorMessages = ref<ErrorMessage[]>([]);
  const errorMessageCount = ref<number>(0);

  const rawJson = ref<string>('');
  const parsedJson = ref<null | StandoffJson>(null);
  const dataToImport = ref<{ annotations: AnnotationData[]; characters: Character[] }>(null);

  function addErrorMessage(
    error: JsonParseError | MalformedAnnotationsError | ImportError | DOMException | unknown,
  ): void {
    if (
      error instanceof JsonParseError ||
      error instanceof ImportError ||
      error instanceof MalformedAnnotationsError
    ) {
      errorMessages.value.push({
        severity: error.severity,
        content: error.message,
        id: errorMessageCount.value++,
      });
    } else {
      errorMessages.value.push({
        severity: 'error',
        content: 'An unknown error occurred.',
        id: errorMessageCount.value++,
      });
    }
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
   * Creates a deep copy the character and annotation stores. Called before importing data to apply old state if the import fails.
   *
   * @returns {DataDump} An object containing the relevant state variables of characters and annotations.
   */
  function createDump(): DataDump {
    const dump: DataDump = {
      characters: {
        beforeStartIndex: beforeStartIndex.value,
        afterEndIndex: afterEndIndex.value,
        totalCharacters: totalCharacters.value,
        snippetCharacters: snippetCharacters.value,
        initialSnippetCharacters: initialSnippetCharacters.value,
      },
      annotations: {
        annotations: totalAnnotations.value,
        initialAnnotations: initialTotalAnnotations.value,
      },
    };

    return cloneDeep(dump);
  }

  /**
   * Finishes the import. Resets the import pipeline to its initial state after a successful import.
   *
   * @return {void} This function does not return any value.
   */
  function finish(): void {
    resetPipeline();
  }

  /**
   * Validates, transforms and imports the JSON data from the chosen file or raw JSON input. If one of the operation fails,
   * an error message is displayed and the pipeline reset to the previous state.
   *
   * @return {Promise<void>} This function does not return any value.
   */
  async function importJson(): Promise<void> {
    clearErrorMessages();
    setPipelineStep('validating');

    try {
      parse();
    } catch (e: unknown) {
      addErrorMessage(e);

      return;
    }

    setPipelineStep('importing');

    // Give the browser time to repaint (=show the progress bar)
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      transformStandoffToAtag();
    } catch (e: unknown) {
      addErrorMessage(e);
      resetPipeline();

      return;
    }

    const dump: DataDump = createDump();

    try {
      initializeStores();
    } catch (e: unknown) {
      addErrorMessage(e);
      restoreDump(dump);
      resetPipeline();

      return;
    }

    setPipelineStep('finishing');
  }

  /**
   * Initializes the characters and annotations stores with the data from the JSON import. This is the last step of the import pipeline.
   * In case of an error during the initialization, an ImportError is thrown.
   *
   * @returns {void} This function does not return any value.
   * @throws {ImportError} If an internal error occurs during the store initialization.
   */
  function initializeStores(): void {
    try {
      initializeCharacters(dataToImport.value.characters, 'import');
      initializeAnnotations(dataToImport.value.annotations, 'import');
    } catch (e: unknown) {
      throw new ImportError('An internal error during import occured. Pleasy try again.');
    }
  }

  /**
   * Parses the provided JSON (raw or from file). If the JSON string is malformed, a JsonParseError is thrown.
   *
   * @returns {void} This function does not return any value.
   * @throws {JsonParseError} If the JSON string is malformed.
   */
  function parse(): void {
    try {
      parsedJson.value = JSON.parse(rawJson.value);
    } catch (e: unknown) {
      throw new JsonParseError(
        'The JSON format contains syntax errors. Please check and try again.',
      );
    }
  }

  function resetPipeline(): void {
    rawJson.value = '';
    parsedJson.value = null;
    dataToImport.value = null;

    setPipelineStep(null);
  }

  /**
   * Restores the state of the editor to the provided dump of the store state. Called when the import fails.
   *
   * @param {DataDump} data - The dump of the store state.
   * @returns {void} This function does not return any value.
   */
  function restoreDump(data: DataDump): void {
    snippetCharacters.value = data.characters.snippetCharacters;
    totalCharacters.value = data.characters.totalCharacters;
    initialSnippetCharacters.value = data.characters.initialSnippetCharacters;
    afterEndIndex.value = data.characters.afterEndIndex;
    beforeStartIndex.value = data.characters.beforeStartIndex;

    totalAnnotations.value = data.annotations.annotations;
    initialTotalAnnotations.value = data.annotations.annotations;
  }

  function setPipelineStep(step: PipelineStep): void {
    currentStep.value = step;
  }

  /**
   * Transforms parsed Standoff JSON data into character and annotation store objects and prepares them for import.
   * This is the second step of the import pipeline.
   *
   * @returns {void} This function does not return any value.
   * @throws {ImportError} If the JSON structure does not match the expected schema.
   */
  function transformStandoffToAtag(): void {
    const newCharacters: Character[] = [];
    const newAnnotations: AnnotationData[] = [];
    const malformedAnnotations: MalformedAnnotation[] = [];

    try {
      // Create character chain (without annotation references)
      parsedJson.value.text.split('').forEach((c: string) => {
        const char: Character = {
          data: {
            uuid: crypto.randomUUID(),
            text: c,
          },
          annotations: [],
        };

        newCharacters.push(char);
      });

      // Create annotation objects and annotate characters
      parsedJson.value.annotations.forEach(a => {
        const indicesAreInvalid: boolean =
          a.start < 0 ||
          a.end < 0 ||
          a.start > a.end ||
          a.start > newCharacters.length ||
          a.end > newCharacters.length;

        // Catch annotations with invalid indices
        if (indicesAreInvalid) {
          malformedAnnotations.push({ reason: 'indexOutOfBounds', data: a });
          return;
        }

        const config: AnnotationType = getAnnotationConfig(a.type);

        // Catch annotations that are not configured in the guidelines
        if (!config) {
          malformedAnnotations.push({ reason: 'unconfiguredType', data: a });
          return;
        }

        const fields: PropertyConfig[] = getAnnotationFields(a.type);
        const newAnnotationProperties: IAnnotation = {} as IAnnotation;

        // Base properties
        fields.forEach((field: PropertyConfig) => {
          newAnnotationProperties[field.name] =
            field?.required === true ? getDefaultValueForProperty(field.type) : null;
        });

        // Other fields (can only be set during save (indizes), must be set explicitly (uuid, text) etc.)
        newAnnotationProperties.type = a.type;
        newAnnotationProperties.startIndex = a.start;
        newAnnotationProperties.endIndex = a.end;
        newAnnotationProperties.text = a.text;
        newAnnotationProperties.uuid = crypto.randomUUID();

        let index: number = a.start;

        // Annotate characters (skipped in the first step since information is stored in annotations)
        do {
          newCharacters[index].annotations.push({
            uuid: newAnnotationProperties.uuid,
            isFirstCharacter: index === a.start,
            isLastCharacter: index === a.end,
            type: a.type,
            subType: '',
          });

          index++;
        } while (index <= a.end);

        newAnnotations.push({
          properties: newAnnotationProperties,
          entities: [],
          additionalTexts: [],
        });
      });

      // Throw explicit MalformedError for detailed information to override default Import error
      if (malformedAnnotations.length > 0) {
        const invalidIndicesAnnotations: MalformedAnnotation[] = malformedAnnotations.filter(
          a => a.reason === 'indexOutOfBounds',
        );

        const unconfiguredTypeAnnotations: MalformedAnnotation[] = malformedAnnotations.filter(
          a => a.reason === 'unconfiguredType',
        );

        const unconfiguredTypesList: string = [
          ...new Set(unconfiguredTypeAnnotations.map(type => `"${type.data.type}"`)),
        ].join(', ');

        const message: string =
          `Some annotations are not correct. ` +
          `${invalidIndicesAnnotations.length} annotations because of invalid indices, ` +
          `${unconfiguredTypeAnnotations.length} annotations because of unconfigured types` +
          `${unconfiguredTypesList.length > 0 ? `(${unconfiguredTypesList})` : ''}` +
          `.`;

        throw new MalformedAnnotationsError(message);
      }

      dataToImport.value = { characters: newCharacters, annotations: newAnnotations };
    } catch (e: unknown) {
      console.error(malformedAnnotations);

      if (e instanceof MalformedAnnotationsError) {
        throw e;
      }

      throw new ImportError(
        'The JSON structure does not match the expected schema. Please check the JSON format.',
      );
    }
  }

  return {
    currentStep: readonly(currentStep),
    errorMessages: readonly(errorMessages),
    rawJson,
    addErrorMessage,
    cancel,
    finish,
    importJson,
    setPipelineStep,
  };
}
