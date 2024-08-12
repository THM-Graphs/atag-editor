<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize, toggleTextHightlighting } from '../helper/helper';
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

<!-- TODO: Create component for each form, simplifies helper functions -->,
<template>
  <div class="annotation-details-panel h-full flex flex-column overflow-y-auto">
    <h3>Annotations [{{ displayedAnnotations.length }}]</h3>
    <div class="annotation-list flex-grow-1 overflow-y-scroll p-1">
      <Panel
        v-for="annotation in annotations"
        :key="annotation.data.uuid"
        :header="annotation.data.type"
        class="annotation-form mb-3"
        :data-annotation-uuid="annotation.data.uuid"
        toggleable
        collapsed="true"
      >
        <template #header>
          <div class="flex items-center gap-1 align-items-center">
            <div class="icon-container">
              <img
                :src="`../src/assets/icons/${annotation.data.type}.svg`"
                class="button-icon w-full h-full"
              />
            </div>
            <div class="annotation-type-container">
              <span class="font-bold">{{ annotation.data.type }}</span>
            </div>
            <div
              class="spy pi pi-eye cursor-pointer"
              @mouseover="toggleTextHightlighting($event, 'on')"
              @mouseleave="toggleTextHightlighting($event, 'off')"
            ></div>
          </div>
          <div class="status-indicator" :class="annotation.status">{{ annotation.status }}</div>
        </template>
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

.icon-container {
  width: 20px;
  height: 20px;
}

.button-icon {
  object-fit: contain;
}
</style>
