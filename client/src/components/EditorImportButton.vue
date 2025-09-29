<script setup lang="ts">
import { computed } from 'vue';
import { useCharactersStore } from '../store/characters';
import Button from 'primevue/button';
import { useDialog } from 'primevue';
import ImportModal from './ImportModal.vue';

const dialog = useDialog();

const { afterEndIndex, beforeStartIndex, initialSnippetCharacters, snippetCharacters } =
  useCharactersStore();

const editorContainsText = computed<boolean>(() => {
  const snippetContainsText: boolean = snippetCharacters.value.length > 0;
  const textBeforeOrAfter: boolean =
    beforeStartIndex.value !== null || afterEndIndex.value !== null;
  // Allow import only when text was loaded empty from the database
  const hasInitialText: boolean = initialSnippetCharacters.value.length > 0;

  if (snippetContainsText) {
    return true;
  }

  if (!snippetContainsText && textBeforeOrAfter) {
    return true;
  }

  if (hasInitialText) {
    return true;
  }

  return false;
});

function openImportModal(): void {
  dialog.open(ImportModal, {
    props: {
      modal: true,
      closable: false,
      closeOnEscape: false,
      style: { width: '30rem' },
    },
  });
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
    :disabled="editorContainsText"
    @click="openImportModal"
  ></Button>
</template>

<style scoped>
.drop-area {
  border: 2px dashed var(--p-primary-500);
}
</style>
