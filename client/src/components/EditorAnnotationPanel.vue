<script setup lang="ts">
import { capitalize } from '../helper/helper';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { IGuidelines } from '../models/IGuidelines';
import { useAnnotationStore } from '../store/annotations';

const props = defineProps<{
  guidelines: IGuidelines | null;
}>();

const { annotations } = useAnnotationStore();
</script>

<template>
  <div class="annotation-details-panel">
    <h3>Annotation Details</h3>
    <div class="annotation-list">
      <Panel
        v-for="annotation in annotations"
        :key="annotation.data.uuid"
        :header="annotation.data.type"
        class="annotation-form mb-3"
        toggleable
      >
        <form>
          <div
            class="input-container"
            v-for="field in props.guidelines.annotations.properties"
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
                :invalid="field.required && !annotation.data[field.name]"
                :key="field.name"
                v-model="annotation.data[field.name]"
                class="flex-auto w-full"
              />
            </div>
          </div>
        </form>
      </Panel>
    </div>
  </div>
</template>

<style scoped>
.annotation-form {
  outline: 1px solid var(--p-primary-color);
}
</style>
