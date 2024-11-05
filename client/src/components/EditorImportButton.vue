<script setup lang="ts">
import { ref, onUpdated, watch, onMounted } from 'vue';
import { useCharactersStore } from '../store/characters';
import { useAnnotationStore } from '../store/annotations';
import { Character, StandoffJson } from '../models/types';
import ProgressBar from 'primevue/progressbar';
import IAnnotation from '../models/IAnnotation';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import Dialog from 'primevue/dialog';
import FileUpload from 'primevue/fileupload';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import ToggleButton from 'primevue/togglebutton';
import { useToast } from 'primevue/usetoast';

const { initializeAnnotations } = useAnnotationStore();
const { initializeCharacters } = useCharactersStore();
const dataToImport = ref<{ annotations: IAnnotation[]; characters: Character[] }>(null);

onUpdated((): void => {
  console.log('update');
});

const dialogIsVisible = ref<boolean>(false);
const rawJson = ref<string>('');
const fileContent = ref<string>('');
const parsedJson = ref<null | StandoffJson>(null);
const chooseOption = ref<'raw' | 'file'>('raw');
const fileupload = ref();
const currentStep = ref<null | 'checking' | 'importing' | 'finishing' | 'starting'>(null);

watch(fileupload, () => {
  if (fileupload.value) {
    // fileupload.value.style.outline = '5px solid red';
    console.log(fileupload.value);
  }
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
  parsedJson.value = JSON.parse(rawJson.value);
}

function transform() {
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
}

function initializeStores(): void {
  initializeCharacters(dataToImport.value.characters, 'import');
  initializeAnnotations(dataToImport.value.annotations);
}

async function startImport(): Promise<void> {
  // TODO: Display error messages
  // TODO: Allow file upload

  currentStep.value = 'checking';

  parse();

  currentStep.value = 'importing';

  // await nextTick(() => {
  //   console.log('after DOM update: ', currentStep.value);
  // });
  // TODO: This is hacky af again, but needed for repainting the DOM for the progress bar. Find better solution
  await new Promise(p => setTimeout(p, 0));

  transform();
  initializeStores();

  // await nextTick(() => {
  //   console.log('after DOM update: ', currentStep.value);
  // });
  await new Promise(p => setTimeout(p, 0));
  currentStep.value = 'finishing';
}

const toast = useToast();

const onAdvancedUpload = () => {
  toast.add({ severity: 'info', summary: 'Success', detail: 'File Uploaded', life: 3000 });
};

function toggleViewMode(direction: 'raw' | 'file'): void {
  chooseOption.value = direction;
}

function handleRawJson() {
  startImport();
}

function handleFileUpload() {
  const file: File = fileupload.value.files[0];
  const reader: FileReader = new FileReader();

  // Triggered once file is read successfully
  reader.onload = () => {
    fileContent.value = reader.result as string;
    rawJson.value = fileContent.value;

    try {
      startImport();
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to parse JSON',
        life: 3000,
      });
    }
  };

  reader.onerror = () => {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error reading file', life: 3000 });
  };

  // Read the file as text
  reader.readAsText(file);
}
</script>

<template>
  <Button
    icon="pi pi-file-import"
    severity="secondary"
    aria-label="Import JSON"
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
  >
    <template #header>
      <h2 class="w-full text-center m-0">Import JSON</h2>
    </template>
    <div v-if="currentStep !== 'finishing'" class="choose-panel">
      <ButtonGroup class="w-full flex">
        <ToggleButton
          :model-value="chooseOption === 'raw'"
          class="w-full"
          onLabel="Raw"
          offLabel="Raw"
          badge="2"
          @change="toggleViewMode('raw')"
        />
        <ToggleButton
          :model-value="chooseOption === 'file'"
          class="w-full"
          onLabel="File"
          offLabel="File"
          badge="2"
          @change="toggleViewMode('file')"
        />
      </ButtonGroup>
      <form v-if="chooseOption === 'raw'" @submit.prevent="handleRawJson">
        <div class="card" v-if="currentStep === 'importing'">
          Importing data...
          <ProgressBar mode="indeterminate" style="height: 6px"></ProgressBar>
        </div>
        <Textarea v-model="rawJson" rows="10" cols="50" />
        <div class="button-container flex justify-content-end gap-2">
          <Button type="button" label="Cancel" severity="secondary" @click="hideDialog"></Button>
          <Button type="submit" label="Import"></Button>
        </div>
      </form>
      <form v-else @submit.prevent="handleFileUpload">
        <div class="card">
          <Toast />
          <FileUpload
            name="demo[]"
            ref="fileupload"
            @upload="onAdvancedUpload()"
            accept=".json,.text"
            :maxFileSize="1000000"
          >
            <template #header="{ chooseCallback }">
              <Button
                @click="chooseCallback()"
                label="Choose file"
                icon="pi pi-plus"
                severity="secondary"
              ></Button>
            </template>
            <template #empty>
              <div class="flex flex-column align-items-center justify-center">
                <i class="pi pi-file-arrow-up" />
                <p class="mb-0">Drag and drop .json or .txt files to here to upload.</p>
              </div>
            </template>
          </FileUpload>
        </div>

        <div class="button-container flex justify-content-end gap-2">
          <Button type="button" label="Cancel" severity="secondary" @click="hideDialog"></Button>
          <Button type="submit" label="Import"></Button>
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

<style scoped></style>
