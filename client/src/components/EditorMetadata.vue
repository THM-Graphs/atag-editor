<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import { useCollectionStore } from '../store/collection';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize } from '../utils/helper/helper';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { CollectionProperty } from '../models/types';

defineExpose({
  validate,
});

const { collection, collectionNodeLabel } = useCollectionStore();
const { guidelines } = useGuidelinesStore();

// TODO: Still a workaround, should be mady dynamic.
const fields: ComputedRef<CollectionProperty[]> = computed(() => {
  if (collectionNodeLabel.value === 'Letter') {
    return guidelines.value.collections['text'].properties;
  } else {
    return guidelines.value.collections['comment'].properties;
  }
});

const formRef = ref<HTMLFormElement | null>(null);

async function handleCopy(): Promise<void> {
  await navigator.clipboard.writeText(collection.value.uuid);
}

function validate(): boolean {
  return formRef.value.reportValidity();
}
</script>

<template>
  <Panel
    header="Metadata"
    class="metadata-container mb-3"
    toggleable
    :toggle-button-props="{
      severity: 'secondary',
      title: 'Toggle full view',
      rounded: true,
      text: true,
    }"
  >
    <template #toggleicon="{ collapsed }">
      <i :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></i>
    </template>
    <div class="flex align-items-center gap-3 mb-3">
      <InputText
        id="uuid"
        :disabled="true"
        :value="collection.uuid"
        class="flex-auto w-full"
        size="small"
        spellcheck="false"
      />
      <Button
        icon="pi pi-copy"
        severity="secondary"
        size="small"
        aria-label="Copy UUID"
        title="Copy UUID"
        @click="handleCopy"
      />
    </div>

    <form ref="formRef" @submit.prevent="validate">
      <div class="input-container" v-for="field in fields" v-show="field.visible">
        <div class="flex align-items-center gap-3 mb-3" v-show="field.visible">
          <label :for="field.name" class="w-10rem font-semibold"
            >{{ capitalize(field.name) }}
          </label>
          <InputText
            :id="field.name"
            :disabled="!field.editable"
            :required="field.required"
            :invalid="field.required && !collection[field.name]"
            :key="field.name"
            v-model="collection[field.name]"
            class="flex-auto w-full"
            spellcheck="false"
          />
        </div>
      </div>
    </form>
  </Panel>
</template>

<style scoped>
.metadata-container {
  outline: 1px solid var(--p-primary-color);
}
</style>
