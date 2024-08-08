<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize } from '../helper/helper';
import Button from 'primevue/button';
import ConfirmPopup from 'primevue/confirmpopup';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { useConfirm } from 'primevue/useconfirm';
import { Annotation } from '../models/types';

const confirm = useConfirm();

const { annotations, deleteAnnotation } = useAnnotationStore();
const { removeAnnotationFromCharacters } = useCharactersStore();
const { guidelines } = useGuidelinesStore();

// TODO: Use this for displaying forms. Currently all visible for debugging purposes
const displayedAnnotations: ComputedRef<Annotation[]> = computed(() =>
  annotations.value.filter(a => a.status !== 'deleted'),
);

function handleDeleteAnnotation(event: MouseEvent, uuid: string) {
  confirm.require({
    target: event.currentTarget as HTMLButtonElement,
    message: 'Do you want to delete this annotation?',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
    },
    accept: () => {
      deleteAnnotation(uuid);
      removeAnnotationFromCharacters(uuid);
    },
    reject: () => {},
  });
}
</script>

<template>
  <div class="annotation-details-panel h-full flex flex-column overflow-y-auto">
    <h3>Annotations [{{ displayedAnnotations.length }}]</h3>
    <div class="annotation-list flex-grow-1 overflow-y-scroll p-1">
      <Panel
        v-for="annotation in annotations"
        :key="annotation.data.uuid"
        :header="annotation.data.type"
        class="annotation-form mb-3"
        toggleable
      >
        <div class="status-indicator" :class="annotation.status">{{ annotation.status }}</div>
        <form>
          <div
            class="input-container"
            v-for="field in guidelines.annotations.properties"
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
        <div class="flex justify-content-center">
          <Button
            label="Delete"
            severity="danger"
            icon="pi pi-trash"
            size="small"
            @click="handleDeleteAnnotation($event, annotation.data.uuid)"
          />
          <ConfirmPopup></ConfirmPopup>
        </div>
      </Panel>
    </div>
  </div>
</template>

<style scoped>
.annotation-form {
  outline: 1px solid var(--p-primary-color);
}

.annotation-details-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.annotation-list {
  overflow-y: scroll;
}

.edited {
  background-color: rgb(191, 147, 77);
}

.deleted {
  background-color: red;
}

.existing {
  background-color: gray;
}

.created {
  background-color: lightgreen;
}
</style>
