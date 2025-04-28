<script setup lang="ts">
import { nextTick, Ref, ref, watch } from 'vue';
import { templateRef } from '@vueuse/core';
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
interface AdditionalTextInputObject {
  availableLabels: string[];
  inputElm: Ref<any>;
  inputLabels: string[];
  inputText: string;
  mode: 'edit' | 'view';
}

const additionalTexts = defineModel<AdditionalText[]>();

const props = defineProps<{
  initialAdditionalTexts: AdditionalText[];
  mode?: 'edit' | 'view';
}>();

const { guidelines, getCollectionConfigFields } = useGuidelinesStore();

const additionalTextIsCollapsed = ref<boolean>(false);
const additionalTextInputObject = ref<AdditionalTextInputObject>({
  inputText: '',
  availableLabels: guidelines.value.annotations.additionalTexts,
  inputLabels: [],
  mode: 'view',
  inputElm: templateRef('additional-text-input'),
});

// Used for toggling additional text preview mode. Bit hacky for now, but works.
const additionalTextStatusObject = ref<Map<string, 'collapsed' | 'expanded'>>(new Map());

watch(
  () => additionalTexts,
  (newTexts, oldTexts) => {
    // Add new text if it doesn't already exist
    newTexts.value.forEach(text => {
      if (!additionalTextStatusObject.value.has(text.collection.data.uuid)) {
        additionalTextStatusObject.value.set(text.collection.data.uuid, 'collapsed');
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
          additionalTextStatusObject.value.delete(text.collection.data.uuid);
        }
      });
    }
  },
  { deep: true, immediate: true },
);

// TODO: Add JSDoc
function addAdditionalText(): void {
  const nodeLabels: string[] = additionalTextInputObject.value.inputLabels;
  const defaultFields: PropertyConfig[] = getCollectionConfigFields(nodeLabels);
  const newCollectionProperties: ICollection = {} as ICollection;

  defaultFields.forEach((field: PropertyConfig) => {
    newCollectionProperties[field.name] =
      field?.required === true ? getDefaultValueForProperty(field.type) : null;
  });

  additionalTexts.value.push({
    collection: {
      nodeLabels,
      data: {
        ...newCollectionProperties,
        uuid: crypto.randomUUID(),
        // TODO: Fix this.....
        label: `${nodeLabels.join(' | ')} for annotation this beautiful annotation`,
      } as ICollection,
    },
    text: {
      // TODO: Text node labels should be made selectable too in the future
      nodeLabels: [],
      data: {
        uuid: crypto.randomUUID(),
        text: additionalTextInputObject.value.inputText,
      } as IText,
    },
  });

  finishAdditionalTextInputOperation();
}

/**
 * Cancels an additional text input operation without submitting any data. This resets the form and
 * changes the mode to 'view'. Is called when the cancel button is clicked explicitly by the user.
 *
 * @returns {void} This function does not return any value.
 */
function cancelAdditionalTextOperation(): void {
  finishAdditionalTextInputOperation();
}

/**
 * Changes the mode of the additional text input component between `view` and `edit`. If set to `edit`,
 * the input field will be focused.
 *
 * @param {'view' | 'edit'} mode - The new mode. Is either 'view' or 'edit'.
 * @returns {void} This function does not return any value.
 */
function changeAdditionalTextSelectionMode(mode: 'view' | 'edit'): void {
  additionalTextInputObject.value.mode = mode;

  if (mode === 'view') {
    return;
  }

  // // Wait for DOM to update before trying to focus the element
  nextTick(() => {
    // TODO: A bit hacky, replace this when upgraded to Vue 3.5?
    const inputElm: HTMLInputElement | null = additionalTextInputObject.value.inputElm.$el;

    if (!inputElm) {
      console.warn('Focus failed: Element not found');
      return;
    }

    inputElm.focus();
  });
}

/**
 * Finishes an additional text input operation one way or another (submit or cancel).
 * This resets the form and changes the mode to 'view'.
 *
 * @returns {void} This function does not return any value.
 */
function finishAdditionalTextInputOperation(): void {
  resetAdditionalTextInputForm();
  changeAdditionalTextSelectionMode('view');
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
function resetAdditionalTextInputForm(): void {
  additionalTextInputObject.value.inputLabels = [];
  additionalTextInputObject.value.inputText = '';
}

/**
 * Toggles the view modeof an additional text entry. By default, the whole text is shown as preview to keep
 * the form compact, but can be expanded on button click.
 *
 * @param {string} uuid - The UUID of the additional text for which the mode should be toggled.
 */
function toggleAdditionalTextPreviewMode(uuid: string): void {
  const currentViewMode: 'collapsed' | 'expanded' = additionalTextStatusObject.value.get(uuid);
  additionalTextStatusObject.value.set(
    uuid,
    currentViewMode === 'collapsed' ? 'expanded' : 'collapsed',
  );
}
</script>

<template>
  <Fieldset
    legend="Additional texts"
    :toggle-button-props="{
      title: `${additionalTextIsCollapsed ? 'Expand' : 'Collapse'} additional texts`,
    }"
    :toggleable="true"
    @toggle="additionalTextIsCollapsed = !additionalTextIsCollapsed"
  >
    <template #toggleicon>
      <span :class="`pi pi-chevron-${additionalTextIsCollapsed ? 'down' : 'up'}`"></span>
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
            <div
              :class="`preview ${additionalTextStatusObject.get(additionalText.collection.data.uuid)}`"
            >
              {{ additionalText.text.data.text }}
            </div>
            <i class="pi pi-external-link"></i>
          </a>
        </div>
        <Button
          :icon="
            additionalTextStatusObject.get(additionalText.collection.data.uuid) === 'collapsed'
              ? 'pi pi-angle-double-down'
              : 'pi pi-angle-double-up'
          "
          severity="secondary"
          size="small"
          class="w-full"
          :title="
            additionalTextStatusObject.get(additionalText.collection.data.uuid) === 'collapsed'
              ? 'Show full text'
              : 'Hide full text'
          "
          @click="toggleAdditionalTextPreviewMode(additionalText.collection.data.uuid)"
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
      <!-- TODO: the next button was disabled when annotation was truncated. Why? -> Find out... -->

      <Button
        v-if="props.mode === 'edit'"
        v-show="additionalTextInputObject.mode === 'view'"
        class="mt-2 w-full h-2rem"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        label="Add text"
        title="Add new additional text entry"
        @click="changeAdditionalTextSelectionMode('edit')"
      />
      <form v-show="additionalTextInputObject.mode === 'edit'" @submit.prevent="addAdditionalText">
        <InputGroup>
          <MultiSelect
            v-model="additionalTextInputObject.inputLabels"
            :options="additionalTextInputObject.availableLabels"
            display="chip"
            placeholder="Select collection labels"
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
            v-model="additionalTextInputObject.inputText"
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
            @click="cancelAdditionalTextOperation"
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
