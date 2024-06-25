<script setup lang="ts">
import { WritableComputedRef, computed } from 'vue';
import { useCollectionStore } from '../store/collection';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

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
</script>

<template>
  <div class="header">
    <div class="header-buttons flex">
      <RouterLink to="/">
        <Button icon="pi pi-home" aria-label="Home"></Button>
      </RouterLink>
    </div>
    <div class="label flex justify-content-center text-center">
      <InputText
        id="label"
        v-model="displayedLabel"
        spellcheck="false"
        :invalid="displayedLabel.length === 0"
        placeholder="No label provided"
        class="input-label text-center w-full text-xl font-bold"
      />
    </div>
  </div>
</template>

<style scoped>
.input-label {
  &::placeholder {
    color: rgb(255, 173, 173);
    font-weight: normal;
  }

  &:not(:focus-visible):not(:hover):not([aria-invalid='true']) {
    outline: none;
    box-shadow: none;
    border-color: white;
  }
}
</style>
