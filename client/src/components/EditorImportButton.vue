<script setup lang="ts">
import { ref } from 'vue';
import { useCharactersStore } from '../store/characters';
import { useAnnotationStore } from '../store/annotations';
import { Annotation, Character, StandoffJson } from '../models/types';
import IAnnotation from '../models/IAnnotation';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';

const { initializeCharacters } = useCharactersStore();
const { initializeAnnotations } = useAnnotationStore();

const dialogIsVisible = ref<boolean>(false);
const json = ref('');

async function showDialog(): Promise<void> {
  dialogIsVisible.value = true;
}

async function hideDialog(): Promise<void> {
  json.value = '';
  dialogIsVisible.value = false;
}

function handleCreateClick(): void {
  // TODO: Display error messages
  // TODO: Allow file upload
  console.log(JSON.parse(json.value));
  const parsedJson: StandoffJson = JSON.parse(json.value);

  console.time('import');

  const newCharacters: Character[] = [];
  const newAnnotations: IAnnotation[] = [];

  // Create character chain (without annotation references)
  parsedJson.text.split('').forEach((c: string) => {
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
  parsedJson.annotations.forEach(a => {
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

  // Insert data into editor data structures
  initializeCharacters(newCharacters);
  initializeAnnotations(newAnnotations);
  console.timeEnd('import');

  json.value = '';
  dialogIsVisible.value = false;
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
    <form @submit.prevent="handleCreateClick">
      <Textarea v-model="json" rows="20" cols="50" />
      <div class="button-container flex justify-content-end gap-2">
        <Button type="button" label="Cancel" severity="secondary" @click="hideDialog"></Button>
        <Button type="submit" label="Import"></Button>
      </div>
    </form>
  </Dialog>
</template>

<style scoped></style>
