<script setup lang="ts">
import { nextTick, Ref, ref, watch, useTemplateRef, ComponentPublicInstance } from 'vue';
import { useGuidelinesStore } from '../store/guidelines';
import { camelCaseToTitleCase, getDefaultValueForProperty } from '../utils/helper/helper';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Fieldset from 'primevue/fieldset';
import Message from 'primevue/message';
import { MultiSelect } from 'primevue';
import Tag from 'primevue/tag';
import { AdditionalText, PropertyConfig } from '../models/types';
import InputGroup from 'primevue/inputgroup';
import ICollection from '../models/ICollection';
import IText from '../models/IText';

/**
 * Interface for relevant state information about additional texts of the annotation
 */
interface InputObject {
  labelOptions: {
    collection: string[];
    text: string[];
  };
  input: {
    collectionLabels: string[];
    textLabels: string[];
    text: string;
  };
}

const additionalTexts = defineModel<AdditionalText[]>();

const props = defineProps<{
  initialAdditionalTexts: AdditionalText[];
  mode?: 'edit' | 'view';
}>();

const { guidelines, getAvailableTextLabels, getCollectionConfigFields } = useGuidelinesStore();

const sectionIsCollapsed = ref<boolean>(false);
const inputObject: Ref<InputObject> = ref<InputObject>({
  labelOptions: {
    collection: guidelines.value.annotations.additionalTexts,
    text: getAvailableTextLabels(),
  },
  input: {
    collectionLabels: [],
    textLabels: [],
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
      if (!textPreviewHandler.value.has(text.collection.data.uuid)) {
        textPreviewHandler.value.set(text.collection.data.uuid, 'collapsed');
      }
    });

    // Remove texts that no longer exist
    if (oldTexts) {
      oldTexts.value.forEach(text => {
        if (
          !newTexts.value.some(
            newText => newText.collection.data.uuid === text.collection.data.uuid,
          )
        ) {
          textPreviewHandler.value.delete(text.collection.data.uuid);
        }
      });
    }
  },
  { deep: true, immediate: true },
);

// TODO: Add JSDoc
function addAdditionalText(): void {
  const collectionLabels: string[] = inputObject.value.input.collectionLabels;
  const textLabels: string[] = inputObject.value.input.textLabels;
  const defaultCollectionFields: PropertyConfig[] = getCollectionConfigFields(collectionLabels);
  const newCollectionProperties: ICollection = {} as ICollection;

  defaultCollectionFields.forEach((field: PropertyConfig) => {
    newCollectionProperties[field.name] =
      field?.required === true ? getDefaultValueForProperty(field.type) : null;
  });

  additionalTexts.value.push({
    collection: {
      nodeLabels: collectionLabels,
      data: {
        ...newCollectionProperties,
        uuid: crypto.randomUUID(),
        // TODO: Fix this.....
        label: `${collectionLabels.join(' | ')} for annotation`,
      } as ICollection,
    },
    text: {
      nodeLabels: textLabels,
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
 * @param {string} collectionUuid - The UUID of the collection of the additional text to be deleted.
 * @returns {void} This function does not return any value.
 */
function handleDeleteAdditionalText(collectionUuid: string): void {
  additionalTexts.value = additionalTexts.value.filter(
    t => t.collection.data.uuid !== collectionUuid,
  );
}

/**
 * Resets the additional text input form (select input and text input). This prepares the form for new input.
 * Called when the form is submitted or cancelled.
 *
 * @returns {void} This function does not return any value.
 */
function resetInputForm(): void {
  inputObject.value.input = {
    collectionLabels: [],
    textLabels: [],
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
    <template v-for="additionalText in additionalTexts" :key="additionalText.collection.data.uuid">
      <div class="additional-text-entry">
        <div class="additional-text-header flex justify-content-between align-items-center">
          <span v-if="additionalText.collection.nodeLabels.length > 0" class="font-semibold">{{
            additionalText.collection.nodeLabels
              .map((l: string) => camelCaseToTitleCase(l))
              .join(' | ')
          }}</span>
          <span v-else class="font-italic"> No label provided yet... </span>
          <Button
            v-if="props.mode === 'edit'"
            icon="pi pi-times"
            severity="danger"
            title="Remove this text from annotation"
            @click="handleDeleteAdditionalText(additionalText.collection.data.uuid)"
          />
        </div>
        <div class="flex align-items-center gap-2 overflow">
          <a
            :href="`/texts/${additionalText.text.data.uuid}`"
            title="Open text in new editor tab"
            class="flex align-items-center gap-1"
            target="_blank"
          >
            <div :class="`preview ${textPreviewHandler.get(additionalText.collection.data.uuid)}`">
              {{ additionalText.text.data.text }}
            </div>
            <i class="pi pi-external-link"></i>
          </a>
        </div>
        <Button
          :icon="
            textPreviewHandler.get(additionalText.collection.data.uuid) === 'collapsed'
              ? 'pi pi-angle-double-down'
              : 'pi pi-angle-double-up'
          "
          severity="secondary"
          size="small"
          class="w-full"
          :title="
            textPreviewHandler.get(additionalText.collection.data.uuid) === 'collapsed'
              ? 'Show full text'
              : 'Hide full text'
          "
          @click="togglePreviewMode(additionalText.collection.data.uuid)"
        />
        <Message
          v-if="
            !props.initialAdditionalTexts
              .map(t => t.collection.data.uuid)
              .includes(additionalText.collection.data.uuid)
          "
          severity="warn"
        >
          Save changes to edit new text...
        </Message>
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
          <MultiSelect
            v-model="inputObject.input.collectionLabels"
            :options="inputObject.labelOptions.collection"
            display="chip"
            placeholder="Select label"
            size="small"
            class="text-center"
            :filter="false"
          >
            <template #chip="{ value }">
              <Tag :value="value" severity="contrast" class="mr-1" />
            </template>
          </MultiSelect>
          <MultiSelect
            v-model="inputObject.input.textLabels"
            :options="inputObject.labelOptions.text"
            display="chip"
            placeholder="Select label"
            size="small"
            class="text-center"
            :filter="false"
          >
            <template #chip="{ value }">
              <Tag :value="value" severity="contrast" class="mr-1" />
            </template>
          </MultiSelect>
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

.additional-text-header {
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
