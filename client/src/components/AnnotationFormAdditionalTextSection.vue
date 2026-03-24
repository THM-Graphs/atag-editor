<script setup lang="ts">
import { nextTick, Ref, ref, watch, useTemplateRef, ComponentPublicInstance } from 'vue';
import { useGuidelinesStore } from '../store/guidelines';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Fieldset from 'primevue/fieldset';
import Select from 'primevue/select';
import { AdditionalText } from '../models/types';
import InputGroup from 'primevue/inputgroup';
import IText from '../models/IText';
import NodeTag from './NodeTag.vue';
import IAnnotation from '../models/IAnnotation';
import Tag from 'primevue/tag';

/**
 * Interface for relevant state information about additional texts of the annotation
 */
interface InputObject {
  annotationTypeOptions: string[];
  input: {
    annotationType: string;
    text: string;
  };
}

const additionalTexts = defineModel<AdditionalText[]>();

const props = defineProps<{
  initialAdditionalTexts: AdditionalText[];
  mode?: 'edit' | 'view';
}>();

const { guidelines } = useGuidelinesStore();

const sectionIsCollapsed = ref<boolean>(false);
const inputObject: Ref<InputObject> = ref<InputObject>({
  annotationTypeOptions: guidelines.value.annotations.additionalTexts,
  input: {
    annotationType: guidelines.value.annotations.additionalTexts[0] ?? null,
    text: '',
  },
});

const inputMode = ref<'edit' | 'view'>('view');
const inputElm = useTemplateRef<ComponentPublicInstance>('additional-text-input');

// Used for toggling additional text preview mode. Bit hacky for now, but works.
const textPreviewHandler = ref<Map<string, 'collapsed' | 'expanded'>>(new Map());

watch(
  () => additionalTexts,
  (newTexts, oldTexts) => {
    // Add new text if it doesn't already exist
    newTexts.value.forEach(text => {
      if (!textPreviewHandler.value.has(text.annotation.uuid)) {
        textPreviewHandler.value.set(text.annotation.uuid, 'collapsed');
      }
    });

    // Remove texts that no longer exist
    if (oldTexts) {
      oldTexts.value.forEach(text => {
        if (!newTexts.value.some(newText => newText.annotation.uuid === text.annotation.uuid)) {
          textPreviewHandler.value.delete(text.annotation.uuid);
        }
      });
    }
  },
  { deep: true, immediate: true },
);

/**
 * Adds a new additional text entry to the list of additional texts. The entry is based on the
 * current input values for annotation type and text content.
 *
 * After adding the entry, the input form is reset and the mode is changed to 'view'.
 *
 * @returns {void} This function does not return any value.
 */

function addAdditionalText(): void {
  const annotationType: string = inputObject.value.input.annotationType;

  additionalTexts.value.push({
    annotation: {
      type: annotationType ?? 'commentary',
      uuid: crypto.randomUUID(),
    } as IAnnotation,
    text: {
      nodeLabels: [],
      data: {
        uuid: crypto.randomUUID(),
        text: inputObject.value.input.text,
      } as IText,
    },
  });

  finishInputOperation();
}

/**
 * Cancels an input operation without submitting any data. This resets the form and
 * changes the mode to 'view'. Is called when the cancel button is clicked explicitly by the user.
 *
 * @returns {void} This function does not return any value.
 */
function cancelInputOperation(): void {
  finishInputOperation();
}

/**
 * Changes the mode of the input component between `view` and `edit`. If set to `edit`,
 * the input field will be focused.
 *
 * @param {'view' | 'edit'} mode - The new mode. Is either 'view' or 'edit'.
 * @returns {void} This function does not return any value.
 */
function changeSelectionMode(mode: 'view' | 'edit'): void {
  inputMode.value = mode;

  if (mode === 'view') {
    return;
  }

  // Wait for DOM to update before trying to focus the element
  nextTick(() => {
    inputElm.value.$el.focus();
  });
}

/**
 * Finishes an additional text input operation one way or another (submit or cancel).
 * This resets the form and changes the mode to 'view'.
 *
 * @returns {void} This function does not return any value.
 */
function finishInputOperation(): void {
  resetInputForm();
  changeSelectionMode('view');
}

/**
 * Deletes an additional text entry from the list of additional texts of the annotation.
 *
 * @param {string} annotationUuid - The UUID of the annotation of the additional text to be deleted.
 * @returns {void} This function does not return any value.
 */
function handleDeleteAdditionalText(annotationUuid: string): void {
  additionalTexts.value = additionalTexts.value.filter(t => t.annotation.uuid !== annotationUuid);
}

/**
 * Resets the additional text input form (select input and text input). This prepares the form for new input.
 * Called when the form is submitted or cancelled.
 *
 * @returns {void} This function does not return any value.
 */
function resetInputForm(): void {
  inputObject.value.input = {
    annotationType: null,
    text: '',
  };
}

/**
 * Toggles the view mode of an text entry. By default, the whole text is shown as preview to keep
 * the form compact, but can be expanded on button click.
 *
 * @param {string} uuid - The UUID of the additional text for which the mode should be toggled.
 */
function togglePreviewMode(uuid: string): void {
  const currentViewMode: 'collapsed' | 'expanded' = textPreviewHandler.value.get(uuid);
  textPreviewHandler.value.set(uuid, currentViewMode === 'collapsed' ? 'expanded' : 'collapsed');
}
</script>

<template>
  <Fieldset
    legend="Additional texts"
    :toggle-button-props="{
      title: `${sectionIsCollapsed ? 'Expand' : 'Collapse'} additional texts`,
    }"
    :toggleable="true"
    @toggle="sectionIsCollapsed = !sectionIsCollapsed"
  >
    <template #toggleicon>
      <span :class="`pi pi-chevron-${sectionIsCollapsed ? 'down' : 'up'}`"></span>
    </template>
    <template v-for="additionalText in additionalTexts" :key="additionalText.annotation.uuid">
      <div class="additional-text-entry">
        <div class="button-pane flex justify-content-center mb-2">
          <div class="annotation-type-tag-container flex justify-content-start w-full">
            <NodeTag type="Collection" :content="additionalText.annotation.type" />
          </div>
          <div class="flex">
            <Tag
              v-if="
                !props.initialAdditionalTexts
                  .map(t => t.annotation.uuid)
                  .includes(additionalText.annotation.uuid)
              "
              size="small"
              icon="pi pi-clock"
              severity="warn"
              class="mr-1"
              :style="{ height: '1rem', padding: '10px' }"
              title="This additional text is temporary, save changes to add it to the database"
            ></Tag>
            <Button
              v-if="props.mode === 'edit'"
              icon="pi pi-times"
              severity="danger"
              title="Remove this text from annotation"
              @click="handleDeleteAdditionalText(additionalText.annotation.uuid)"
            />
          </div>
        </div>
        <div class="text-container flex align-items-center gap-2 overflow">
          <a
            :href="`/texts/${additionalText.text.data.uuid}`"
            title="Open text in new editor tab"
            class="flex align-items-center gap-1"
            target="_blank"
          >
            <div :class="`preview ${textPreviewHandler.get(additionalText.annotation.uuid)}`">
              {{ additionalText.text.data.text }}
            </div>
            <i class="pi pi-external-link"></i>
          </a>
        </div>
        <Button
          :icon="
            textPreviewHandler.get(additionalText.annotation.uuid) === 'collapsed'
              ? 'pi pi-angle-double-down'
              : 'pi pi-angle-double-up'
          "
          severity="secondary"
          size="small"
          class="w-full"
          :title="
            textPreviewHandler.get(additionalText.annotation.uuid) === 'collapsed'
              ? 'Show full text'
              : 'Hide full text'
          "
          @click="togglePreviewMode(additionalText.annotation.uuid)"
        />
      </div>

      <hr />
    </template>
    <div>
      <Button
        v-if="props.mode === 'edit'"
        v-show="inputMode === 'view'"
        class="mt-2 w-full h-2rem"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        label="Add text"
        title="Add new additional text entry"
        @click="changeSelectionMode('edit')"
      />
      <form v-show="inputMode === 'edit'" @submit.prevent="addAdditionalText">
        <InputGroup>
          <Select
            v-if="inputObject.annotationTypeOptions.length > 0"
            v-model="inputObject.input.annotationType"
            :options="inputObject.annotationTypeOptions"
            display="chip"
            required
            placeholder="Annotation type"
            class="text-center"
            :filter="false"
            :pt="{
              root: {
                title: `Select Annotation type`,
              },
            }"
          />
          <InputText
            ref="additional-text-input"
            required
            v-model="inputObject.input.text"
            placeholder="Enter text"
            title="Enter text"
          />
          <Button
            type="submit"
            icon="pi pi-check"
            severity="secondary"
            size="small"
            title="Add new text"
          />
          <Button
            type="button"
            icon="pi pi-times"
            severity="secondary"
            size="small"
            title="Cancel"
            @click="cancelInputOperation"
          />
        </InputGroup>
      </form>
    </div>
  </Fieldset>
</template>

<style scoped>
.preview.collapsed {
  --fade-start: 50%;
  max-height: 4rem;
  mask-image: linear-gradient(to bottom, white var(--fade-start), transparent);
  transition: max-height 500ms;
}

.preview.expanded {
  max-height: auto;
  max-height: calc-size(auto);
}

.annotation-type-tag-container {
  cursor: default;
}

.additional-text-entry {
  border: 1px solid gray;
  border-radius: 5px;
  margin-bottom: 0.5rem;
  padding: 0.5rem;

  & button {
    width: 1rem;
    height: 1rem;
    padding: 10px;
  }
}

.hidden {
  display: none;
}
</style>
