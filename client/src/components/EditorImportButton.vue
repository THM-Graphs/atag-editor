<script setup lang="ts">
import { ref, onUpdated, computed } from 'vue';
import { useCharactersStore } from '../store/characters';
import { useAnnotationStore } from '../store/annotations';
import { formatFileSize } from '../utils/helper/helper';
import JsonParseError from '../utils/errors/parse.error';
import ImportError from '../utils/errors/import.error';
import IAnnotation from '../models/IAnnotation';
import { Character, StandoffJson } from '../models/types';
import ProgressBar from 'primevue/progressbar';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import Dialog from 'primevue/dialog';
import FileUpload from 'primevue/fileupload';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import ToggleButton from 'primevue/togglebutton';

type PipelineStep = null | 'validating' | 'importing' | 'finishing';

const { initializeAnnotations } = useAnnotationStore();
const { initializeCharacters } = useCharactersStore();

onUpdated((): void => {
  console.log('update');
});

const dataToImport = ref<{ annotations: IAnnotation[]; characters: Character[] }>(null);
const dialogIsVisible = ref<boolean>(false);
const rawJson = ref<string>('');
const parsedJson = ref<null | StandoffJson>(null);
const chooseOption = ref<'raw' | 'file'>('file');
const fileupload = ref();
const inputIsValid = computed(() => {
  if (chooseOption.value === 'raw') {
    return rawJson.value.length > 0;
  } else {
    return fileupload.value?.files.length === 1;
  }
});
const currentStep = ref<PipelineStep>(null);
const errorMessages = ref([]);
const messageCount = ref(0);

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

async function showDialog(): Promise<void> {
  dialogIsVisible.value = true;
}

async function hideDialog(): Promise<void> {
  currentStep.value = null;
  rawJson.value = '';
  parsedJson.value = null;
  dialogIsVisible.value = false;
}

function finishImport(): void {
  rawJson.value = '';
  parsedJson.value = null;
  dialogIsVisible.value = false;
  currentStep.value = null;
}

function parse(): void {
  try {
    parsedJson.value = JSON.parse(rawJson.value);
  } catch (e: unknown) {
    throw new JsonParseError('The JSON format contains syntax errors. Please check and try again.');
  }
}

function setPipelineStep(step: PipelineStep): void {
  currentStep.value = step;
}

function transform() {
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

function initializeStores(): void {
  try {
    initializeCharacters(dataToImport.value.characters, 'import');
    initializeAnnotations(dataToImport.value.annotations);
  } catch (e: unknown) {
    throw new ImportError('An internal error during import occured. Pleasy try again.');
  }
}

async function importJson(): Promise<void> {
  clearErrorMessages();

  // currentStep.value = 'importing';
  // await new Promise(p => setTimeout(p, 0));

  // return;

  // ---------------------------------------------------------------------------------------------

  setPipelineStep('validating');

  try {
    parse();
  } catch (e: unknown) {
    addErrorMessage(e);
    setPipelineStep(null);

    return;
  }

  setPipelineStep('importing');

  // Give the browser time to repaint (=show the progress bar)
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    transform();
  } catch (e: unknown) {
    addErrorMessage(e);
    setPipelineStep(null);

    return;
  }

  try {
    initializeStores();
  } catch (e: unknown) {
    // TODO: Here, the initial state of the characters should be restored
    addErrorMessage(e);
    setPipelineStep(null);

    return;
  }

  setPipelineStep('finishing');
}

function toggleViewMode(direction: 'raw' | 'file'): void {
  chooseOption.value = direction;
}

function handleRawJson(): void {
  importJson();
}

function handleFileUpload(): void {
  const file: File = fileupload.value.files[0];

  // This triggers the "load" event listener attached to the reader which handles the further logic
  reader.readAsText(file);
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
    header="Import Text from JSON"
    modal
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '30rem' }"
  >
    <template #header>
      <h2 class="w-full text-center m-0">Import JSON</h2>
    </template>
    <div v-if="currentStep !== 'finishing'" class="choose-panel">
      <ButtonGroup class="w-full flex">
        <ToggleButton
          :model-value="chooseOption === 'file'"
          class="w-full"
          onLabel="File"
          offLabel="File"
          badge="2"
          @change="toggleViewMode('file')"
        />
        <ToggleButton
          :model-value="chooseOption === 'raw'"
          class="w-full"
          onLabel="Raw"
          offLabel="Raw"
          badge="2"
          @change="toggleViewMode('raw')"
        />
      </ButtonGroup>
      <Message v-for="msg of errorMessages" :key="msg.id" :severity="msg.severity" closeable>{{
        msg.content
      }}</Message>
      <form v-if="chooseOption === 'raw'" @submit.prevent="handleRawJson">
        <div class="card" v-if="currentStep === 'importing'">
          Importing data...
          <ProgressBar mode="indeterminate" style="height: 6px"></ProgressBar>
        </div>
        <Textarea
          v-model="rawJson"
          rows="10"
          placeholder="Enter some valid JSON"
          spellcheck="false"
        />
        <div class="button-container flex justify-content-end gap-2">
          <Button type="button" label="Cancel" severity="secondary" @click="hideDialog"></Button>
          <Button type="submit" label="Import" :disabled="!inputIsValid"></Button>
        </div>
      </form>
      <form v-else @submit.prevent="handleFileUpload" class="h-full">
        <div class="card" v-if="currentStep === 'importing'">
          Importing data...
          <ProgressBar mode="indeterminate" style="height: 6px"></ProgressBar>
        </div>
        <FileUpload
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
                severity="secondary"
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
                  <img role="presentation" :alt="file.name" :src="file.objectURL" />
                </div>
                <div>{{ formatFileSize(file.size) }}</div>
              </div>
              <Button
                icon="pi pi-times"
                size="small"
                :style="{ width: '2rem', height: '2rem' }"
                severity="danger"
                outlined
                rounded
                title="Remove file"
                aria-label="Remove file"
                @click="removeFileCallback(index)"
              />
            </div>
          </template>

          <template #empty>
            <div class="flex flex-column align-items-center justify-center">
              <p class="font-italic">or</p>
              <p class="m-0 p-3 drop-area">
                <i class="pi pi-file-arrow-up" /> Drag and drop .json or .txt files to here to
                upload.
              </p>
            </div>
          </template>
        </FileUpload>
        <div class="button-container flex justify-content-end gap-2">
          <Button type="button" label="Cancel" severity="secondary" @click="hideDialog"></Button>
          <Button type="submit" label="Import" :disabled="!inputIsValid"></Button>
        </div>
      </form>
    </div>
    <div v-else>
      <div>&#10004; Text imported successfully</div>
      <div>
        <Message severity="warn">
          <p>
            Currently the text is dangling (not saved in the database). Depending on the length, the
            performance of the editor might be affected.
          </p>
          <p>
            You can edit the text, but to get a better performance, save the text and reload the
            page.
          </p>
        </Message>
      </div>
      <div class="buttons">
        <Button type="button" label="Ok" severity="secondary" @click="finishImport"></Button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.drop-area {
  border: 2px dashed var(--p-primary-500);
}
</style>
