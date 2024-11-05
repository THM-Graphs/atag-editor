<script setup lang="ts">
import { ref, onUpdated, watch } from 'vue';
import { useCharactersStore } from '../store/characters';
import { useAnnotationStore } from '../store/annotations';
import { Character, StandoffJson } from '../models/types';
import ProgressBar from 'primevue/progressbar';
import IAnnotation from '../models/IAnnotation';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';

const { initializeAnnotations } = useAnnotationStore();
const { initializeCharacters } = useCharactersStore();
const dataToImport = ref<{ annotations: IAnnotation[]; characters: Character[] }>(null);

onUpdated((): void => {
  console.log('update');
});

const dialogIsVisible = ref<boolean>(false);
const rawJson = ref<string>('');
const parsedJson = ref<null | StandoffJson>(null);
const currentStep = ref<null | 'checking' | 'importing' | 'finishing' | 'starting'>(null);

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
    {{ currentStep ?? 'NULL' }}
    <form v-if="currentStep !== 'finishing'" @submit.prevent="startImport">
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
