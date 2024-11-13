<script setup lang="ts">
import { WritableComputedRef, computed, ref } from 'vue';
import { useCollectionStore } from '../store/collection';
import EditorImportButton from './EditorImportButton.vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

defineExpose({
  validate,
});

const { collection } = useCollectionStore();

// This allows using v-model for title input changes.
// TODO: Replace with more generic async handling later
const displayedLabel: WritableComputedRef<string> = computed({
  get() {
    return collection.value?.label || '';
  },
  set(value: string) {
    if (collection.value) {
      collection.value.label = value;
    }
  },
});

const formRef = ref<HTMLFormElement | null>(null);

function validate(): boolean {
  return formRef.value.reportValidity();
}
</script>

<template>
  <div class="header">
    <div class="header-buttons flex justify-content-between mb-2">
      <RouterLink to="/">
        <Button icon="pi pi-home" aria-label="Home" class="w-2rem h-2rem" title="Overview"></Button>
      </RouterLink>
      <div>
        <EditorImportButton />
      </div>
    </div>
    <div class="label flex justify-content-center text-center">
      <form ref="formRef" action="" class="w-full px-3">
        <InputText
          id="label"
          v-model="displayedLabel"
          required
          spellcheck="false"
          :invalid="displayedLabel.length === 0"
          placeholder="No label provided"
          class="input-label text-center w-full text-xl font-bold"
        />
      </form>
    </div>
  </div>
</template>

<style scoped>
.input-label {
  border: none;
  outline: 0;
  box-shadow: none;

  &[aria-invalid='true'] {
    outline: 1px solid var(--color-input-invalid);
  }

  &:hover:not(:focus-visible) {
    background-color: rgba(var(--color-blue-base), 0.05);
  }

  &::placeholder {
    color: rgb(255, 173, 173);
    font-weight: normal;
  }

  &:focus-visible {
    box-shadow: var(--box-shadow-focus);
  }
}
</style>
