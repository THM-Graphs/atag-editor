<script setup lang="ts">
import { ref } from 'vue';
import { useCollectionStore } from '../store/collection';
import { capitalize } from '../helper/helper';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import Skeleton from 'primevue/skeleton';
import { IGuidelines } from '../../../server/src/models/IGuidelines';

defineExpose({
  validate,
});

const { collection } = useCollectionStore();

const props = defineProps<{
  guidelines: IGuidelines | null;
}>();

const formRef = ref<HTMLFormElement | null>(null);

async function handleCopy(): Promise<void> {
  await navigator.clipboard.writeText(collection.value.uuid);
}

function validate(): boolean {
  return formRef.value.reportValidity();
}
</script>

<template>
  <Panel header="Metadata" toggleable>
    <template v-if="collection && guidelines">
      <div class="flex align-items-center gap-3 mb-3">
        <InputText
          id="uuid"
          :disabled="true"
          :value="collection.uuid"
          class="flex-auto w-full"
          size="small"
        />
        <Button
          icon="pi pi-copy"
          severity="secondary"
          size="small"
          aria-label="Copy UUID"
          v-tooltip.hover.top="{ value: 'Copy UUID', showDelay: 150 }"
          @click="handleCopy"
        />
      </div>

      <form ref="formRef" @submit.prevent="validate">
        <div
          class="input-container"
          v-for="field in props.guidelines.collections['text'].properties"
          v-show="field.visible"
        >
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
            />
          </div>
        </div>
      </form>
    </template>
    <div v-else class="skeleton-container">
      <div v-for="n in 4" class="flex flex-row gap-2">
        <Skeleton class="mb-3" height="2rem" width="10rem"></Skeleton>
        <Skeleton class="mb-3" height="2rem"></Skeleton>
      </div>
    </div>
  </Panel>
</template>

<style scoped></style>
