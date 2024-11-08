<script setup lang="ts">
import { ref, computed, ComputedRef } from 'vue';
import { useCharactersStore } from '../store/characters';
import { useAnnotationStore } from '../store/annotations';
import { cloneDeep, formatFileSize } from '../utils/helper/helper';
import JsonParseError from '../utils/errors/parse.error';
import ImportError from '../utils/errors/import.error';
import IAnnotation from '../models/IAnnotation';
import { Annotation, Character, StandoffJson } from '../models/types';
import ProgressBar from 'primevue/progressbar';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import Dialog from 'primevue/dialog';
import FileUpload from 'primevue/fileupload';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import ToggleButton from 'primevue/togglebutton';

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
type PipelineStep = null | 'validating' | 'importing' | 'finishing';

const { initialAnnotations, annotations, initializeAnnotations } = useAnnotationStore();
const {
  afterEndIndex,
  beforeStartIndex,
  initialSnippetCharacters,
  snippetCharacters,
  totalCharacters,
  initializeCharacters,
} = useCharactersStore();

const dialogIsVisible = ref<boolean>(false);
const chooseOption = ref<'raw' | 'file'>('file');
const dataToImport = ref<{ annotations: IAnnotation[]; characters: Character[] }>(null);
const rawJson = ref<string>('');
const parsedJson = ref<null | StandoffJson>(null);
const fileupload = ref();
const inputIsValid = computed(() => {
  if (chooseOption.value === 'raw') {
    return rawJson.value.length > 0;
  } else {
    return fileupload.value?.files.length === 1;
  }
});
const editorContainsText: ComputedRef<boolean> = computed(() => {
  return totalCharacters.value.length > 0 || snippetCharacters.value.length > 0;
});
const currentStep = ref<PipelineStep>(null);
const errorMessages = ref([]);
const messageCount = ref(0);

// Needs to be instantiated at top-level to make Vue track changes better
const reader: FileReader = new FileReader();

reader.addEventListener('load', () => {
  rawJson.value = reader.result as string;
  importJson();
});

reader.addEventListener('error', (event: ProgressEvent) => {
  const error: DOMException = (event.target as FileReader).error;
  addErrorMessage(error);
});

function addErrorMessage(error: JsonParseError | ImportError | DOMException | unknown): void {
  if (error instanceof JsonParseError || error instanceof ImportError) {
    errorMessages.value.push({
      severity: error.severity,
      content: error.message,
      id: messageCount.value++,
    });
  } else {
    errorMessages.value.push({
      severity: 'error',
      content: 'An unknown error occurred.',
      id: messageCount.value++,
    });
  }
}

function clearErrorMessages(): void {
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
    annotations: { annotations: annotations.value, initialAnnotations: initialAnnotations.value },
  };

  return cloneDeep(dump);
}

function finishImport(): void {
  rawJson.value = '';
  parsedJson.value = null;
  dialogIsVisible.value = false;
  currentStep.value = null;
}

/**
 * Handles the import of the chosen file or raw JSON input. If the option is `raw`, the import process is started directly.
 * If the option is `file`, the chosen file is read which triggers the "load" event where the import logic is handled.
 *
 * @return {void} This function does not return any value.
 */
function handleImport(): void {
  if (chooseOption.value === 'raw') {
    importJson();
  } else {
    const file: File = fileupload.value.files[0];

    // This triggers the "load" event listener attached to the reader which handles the further logic
    reader.readAsText(file);
  }
}

async function hideDialog(): Promise<void> {
  clearErrorMessages();

  currentStep.value = null;
  rawJson.value = '';
  parsedJson.value = null;
  dialogIsVisible.value = false;
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
    transform();
  } catch (e: unknown) {
    addErrorMessage(e);
    resetPipeline();

    return;
  }

  const dump: DataDump = createDump();

  try {
    initializeStores();
  } catch (e: unknown) {
    debugger;
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
    throw new JsonParseError('The JSON format contains syntax errors. Please check and try again.');
  }
}

function resetPipeline(): void {
  setPipelineStep(null);
  rawJson.value = '';
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

  annotations.value = data.annotations.annotations;
  initialAnnotations.value = data.annotations.annotations;
}

function setPipelineStep(step: PipelineStep): void {
  currentStep.value = step;
}

async function showDialog(): Promise<void> {
  dialogIsVisible.value = true;
}

function toggleViewMode(direction: 'raw' | 'file'): void {
  chooseOption.value = direction;
}

/**
 * Transforms parsed Standoff JSON data into character and annotation store objects and prepares them for import.
 * This is the second step of the import pipeline.
 *
 * @returns {void} This function does not return any value.
 * @throws {ImportError} If the JSON structure does not match the expected schema.
 */

function transform(): void {
  try {
    const newCharacters: Character[] = [];
    const newAnnotations: IAnnotation[] = [];

    // Create character chain (without annotation references)
    parsedJson.value.text.split('').forEach((c: string) => {
      const char: Character = {
        data: {
          uuid: crypto.randomUUID(),
          text: c,
          letterLabel: '',
        },
        annotations: [],
      };

      newCharacters.push(char);
    });

    // Create annotation objects and annotate characters
    parsedJson.value.annotations.forEach(a => {
      // TODO: Really?
      if (a.start === -1 || a.end === -1) {
        return;
      }

      // TODO: This should come from the configuration
      // Data of the annotation
      const newAnnotationData: IAnnotation = {
        comment: '',
        commentInternal: '',
        endIndex: a.end,
        originalText: '',
        startIndex: a.start,
        subtype: '',
        text: a.text,
        type: a.type,
        url: '',
        uuid: crypto.randomUUID(),
      };

      let index: number = a.start;

      // Annotate characters (skipped in the first step since information is stored in annotations)
      do {
        newCharacters[index].annotations.push({
          uuid: newAnnotationData.uuid,
          isFirstCharacter: index === a.start,
          isLastCharacter: index === a.end,
          type: a.type,
          subtype: '',
        });

        // newAnnotation.characterUuids.push(newCharacters[index].data.uuid);

        index++;
      } while (index <= a.end);

      newAnnotations.push(newAnnotationData);
    });

    dataToImport.value = { characters: newCharacters, annotations: newAnnotations };
  } catch (e: unknown) {
    throw new ImportError(
      'The JSON structure does not match the expected schema. Please check the JSON format.',
    );
  }
}
</script>

<template>
  <Button
    icon="pi pi-file-import"
    severity="secondary"
    outlined
    class="h-2rem"
    title="Import JSON"
    label="Import"
    @click="showDialog"
  ></Button>
  <Dialog
    v-model:visible="dialogIsVisible"
    modal
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '30rem' }"
  >
    <template #header>
      <h2
        v-if="currentStep === null || currentStep === 'validating'"
        class="w-full text-center m-0"
      >
        Select JSON to import
      </h2>
    </template>
    <div v-if="currentStep === null || currentStep === 'validating'" class="choose-panel">
      <Message
        v-if="editorContainsText"
        severity="warn"
        icon="pi pi-exclamation-circle"
        class="w-full my-2"
        closable
      >
        Careful: This document already contains text that will be lost after the import has
        finished.
      </Message>
      <ButtonGroup class="w-full flex mb-2">
        <ToggleButton
          :model-value="chooseOption === 'file'"
          class="w-full"
          onLabel="File"
          offLabel="File"
          title="Import JSON file"
          badge="2"
          @change="toggleViewMode('file')"
        />
        <ToggleButton
          :model-value="chooseOption === 'raw'"
          class="w-full"
          onLabel="Raw"
          offLabel="Raw"
          title="Import raw JSON"
          badge="2"
          @change="toggleViewMode('raw')"
        />
      </ButtonGroup>
      <Message v-for="msg of errorMessages" :key="msg.id" :severity="msg.severity" closable>{{
        msg.content
      }}</Message>
      <form @submit.prevent="handleImport">
        <div :style="{ height: '15rem' }">
          <Textarea
            v-if="chooseOption === 'raw'"
            v-model="rawJson"
            rows="10"
            class="w-full"
            placeholder="Enter some valid JSON"
            spellcheck="false"
          />
          <FileUpload
            v-else
            name="import"
            ref="fileupload"
            :file-limit="1"
            :multiple="false"
            accept=".json,.txt"
          >
            <template #header="{ chooseCallback }">
              <div class="flex justify-content-center w-full">
                <Button
                  v-if="!inputIsValid"
                  @click="chooseCallback()"
                  label="Browse files"
                  icon="pi pi-plus"
                  severity="contrast"
                  title="Choose file to import (.json or .txt)"
                  :disabled="inputIsValid"
                ></Button>
              </div>
            </template>
            <template #content="{ files, removeFileCallback }">
              <div
                v-for="(file, index) of files"
                :key="file.name + file.type + file.size"
                class="flex justify-content-between align-items-center h-2rem"
              >
                <div class="flex gap-4">
                  <div class="font-semibold">
                    {{ file.name }}
                  </div>
                  <div>{{ formatFileSize(file.size) }}</div>
                </div>
                <Button
                  label="Remove"
                  size="small"
                  :style="{ height: '2rem' }"
                  severity="danger"
                  outlined
                  title="Remove file"
                  aria-label="Remove file"
                  @click="removeFileCallback(index)"
                />
              </div>
            </template>

            <template #empty>
              <div class="flex flex-column align-items-center justify-center">
                <p class="mt-0 mb-4 font-italic">or</p>
                <p
                  class="m-0 p-3 h-6rem border-round-lg drop-area flex justify-content-center gap-2 align-items-center"
                >
                  <i class="pi pi-file-arrow-up" style="font-size: 1rem" />
                  <span> Drag and drop files to here to upload.</span>
                </p>
              </div>
            </template>
          </FileUpload>
        </div>
        <div class="button-container flex justify-content-center gap-2 mt-2">
          <Button
            type="button"
            label="Cancel"
            title="Cancel"
            severity="secondary"
            @click="hideDialog"
          ></Button>
          <Button
            type="submit"
            label="Import"
            title="Import JSON"
            :disabled="!inputIsValid"
          ></Button>
        </div>
      </form>
    </div>
    <div
      class="card flex flex-column align-items-center gap-4"
      v-else-if="currentStep === 'importing'"
    >
      <span> Importing data... </span>
      <ProgressBar mode="indeterminate" style="height: 5px; width: 100%"></ProgressBar>
    </div>
    <div v-else class="flex flex-column align-items-center">
      <Message icon="pi pi-check" class="my-2 w-full" severity="success">
        <div class="info">
          Text imported successfully
          <ul class="m-0 pl-5">
            <li class="list-disc">{{ totalCharacters.length.toLocaleString() }} characters</li>
            <li class="list-disc">{{ annotations.length.toLocaleString() }} annotations</li>
          </ul>
        </div>
      </Message>
      <Message icon="pi pi-info-circle" class="my-2 w-full" severity="info">
        Currently, the text is dangling (not saved in the database). You can edit the text, but to
        get a better performance, save the text and reload the page.
      </Message>
      <Button
        type="button"
        label="Ok"
        severity="contrast"
        class="w-3 mt-4"
        @click="finishImport"
      ></Button>
    </div>
  </Dialog>
</template>

<style scoped>
.drop-area {
  border: 2px dashed var(--p-primary-500);
}
</style>
