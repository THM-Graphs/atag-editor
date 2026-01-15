<script setup lang="ts">
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import { cloneDeep, getDefaultValueForProperty } from '../utils/helper/helper';
import { useGuidelinesStore } from '../store/guidelines';
import { useShortcutsStore } from '../store/shortcuts';
import AnnotationRangeError from '../utils/errors/annotationRange.error';
import { AdditionalText, PropertyConfig, AnnotationType, AnnotationData } from '../models/types';
import IAnnotation from '../models/IAnnotation';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import ShortcutError from '../utils/errors/shortcut.error';
import { onMounted, ref } from 'vue';
import { useAppStore } from '../store/app';

const { annotationType, collectionNodeLabels, mode } = defineProps<{
  annotationType: string;
  collectionNodeLabels: string[];
  mode: 'edit' | 'view';
}>();

const emit = defineEmits(['addAnnotation']);

const { guidelines, getCollectionAnnotationFields, getCollectionAnnotationConfig } =
  useGuidelinesStore();
const { addToastMessage } = useAppStore();
const { normalizeKeys, registerShortcut } = useShortcutsStore();

const config: AnnotationType = getCollectionAnnotationConfig(collectionNodeLabels, annotationType);
const fields: PropertyConfig[] = getCollectionAnnotationFields(
  collectionNodeLabels,
  annotationType,
);
const subTypeField: PropertyConfig = fields.find(field => field.name === 'subType');
const options: string[] | number[] = subTypeField?.options ?? [];
const dropdownOptions = options.map((option: string | number) => {
  return {
    label: option.toString(),
    command: () => handleDropdownClick(option),
  };
});

const hasIcon = ref<boolean>(true);
const buttonElm = ref(null);

if (config.shortcut?.length > 0) {
  const shortcutCombo: string = normalizeKeys(config.shortcut?.map(key => key.toLowerCase()) ?? []);
  registerShortcut(shortcutCombo, handleClick);
}

// TODO: This is a temporary hack since PrimeVue makes problems with accessing the component's
// DOM element with the pcButton/pcDropdown pt option...fix maybe later, but works for now
onMounted(setButtonStylingManually);

function setButtonStylingManually(): void {
  // This function examines the DOM nodes of the annotation icon span. If the background image could not be loaded
  // (since it wasn't provided, bad internet connection etc.), the buttons shows the annotation type as string
  const iconElement: HTMLSpanElement = buttonElm.value.$el.querySelector(
    `.annotation-type-icon-${annotationType}`,
  );

  // Return if element was not found
  if (!iconElement) {
    return;
  }

  // If no background image, set hasIcon to false. This will style normal annotation buttons correctly (see Button props)
  const hasBackgroundImage: boolean =
    window.getComputedStyle(iconElement).backgroundImage !== 'none';

  hasIcon.value = hasBackgroundImage;

  // SplitButton has its flaws: Dropdown button and annotation button can not be accessed (wait for Primevue update),
  // therefore the DOM element need to be queried and styled manually. this is done via the subTypeField variable
  if (subTypeField) {
    const dropdownButton: HTMLButtonElement | null =
      buttonElm.value.$el.querySelector('.p-splitbutton-dropdown');
    const mainButton: HTMLButtonElement | null =
      buttonElm.value.$el.querySelector('.p-splitbutton-button');

    if (dropdownButton) {
      dropdownButton.style.width = '15px';
    }

    if (mainButton) {
      mainButton.style.width = '35px';
      mainButton.style.paddingLeft = '5px';
      mainButton.style.paddingRight = '5px';
    }

    // When there is no background image AND the annotation has a SplitButton component, the width is set to 'auto'
    // with the primeflex utility class 'w-auto'.
    if (!hasBackgroundImage) {
      const splitButtonElm: HTMLButtonElement = buttonElm.value.$el.querySelector(
        'button.p-splitbutton-button',
      );

      splitButtonElm?.classList.add('w-auto');
    }
  }
}

function handleDropdownClick(subType: string | number): void {
  handleClick(subType);
}

function handleButtonClick(): void {
  handleClick();
}

function handleClick(dropdownOption?: string | number): void {
  try {
    const newAnnotation: AnnotationData = createNewAnnotation(annotationType, dropdownOption);

    // TODO: Push to store instead of emitting
    emit('addAnnotation', newAnnotation);
    // addAnnotation(newAnnotation);
  } catch (error) {
    if (error instanceof AnnotationRangeError) {
      addToastMessage({
        severity: 'warn',
        summary: 'Invalid selection',
        detail: error.message,
        life: 3000,
      });
    } else if (error instanceof ShortcutError) {
      addToastMessage({
        severity: 'warn',
        summary: 'Annotation type not enabled',
        detail: error.message,
        life: 3000,
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

function createNewAnnotation(type: string, subType: string | number | undefined): AnnotationData {
  const newAnnotationData: IAnnotation = {} as IAnnotation;

  // Base properties
  fields.forEach((field: PropertyConfig) => {
    newAnnotationData[field.name] =
      field?.required === true ? getDefaultValueForProperty(field.type) : null;
  });

  // TODO: This should come from the guidelines. When annotations
  // are generic, do this
  // Other fields (can only be set during save (indizes), must be set explicitly (uuid, text) etc.)
  newAnnotationData.type = type;
  // newAnnotationData.startIndex = 0;
  // newAnnotationData.endIndex = 0;
  // TODO: the text property is different...
  // newAnnotationData.text = '';
  newAnnotationData.uuid = crypto.randomUUID();

  // If a subType field exists (filled with a default value just before), but not subType was provided
  // (= the user clicked the button directly instead of selecting an entry from the dropdown),
  // set the first option as default value
  if (subTypeField) {
    newAnnotationData.subType = subType ?? subTypeField.options[0];
  }

  // Entities (= connected Entity nodes). Empty when created, but needed in Annotation structure -> empty arrays
  const entityCategories: string[] = guidelines.value.annotations.entities.map(r => r.category);
  const newAnnotationEntities = Object.fromEntries(entityCategories.map(m => [m, []]));

  // Additional texts (= connected Collection->Text nodes). Empty when created, but needed in Annotation structure -> empty arrays
  const additionalTexts: AdditionalText[] = [];

  const newAnnotation: AnnotationData = {
    properties: cloneDeep(newAnnotationData),
    entities: cloneDeep(newAnnotationEntities),
    additionalTexts: cloneDeep(additionalTexts),
  };

  return newAnnotation;
}
</script>

<template>
  <Button
    v-if="!subTypeField"
    severity="secondary"
    ref="buttonElm"
    outlined
    raised
    :style="{ height: '35px', width: '35px' }"
    :class="hasIcon ? '' : 'button-empty'"
    :data-annotation-type="annotationType"
    :disabled="mode === 'view'"
    v-tooltip.hover.top="{ value: annotationType, showDelay: 50 }"
    @click="handleButtonClick"
  >
    <template #icon>
      <AnnotationTypeIcon v-if="hasIcon" :annotationType="annotationType" />
    </template>
    <template #default>
      <span v-if="!hasIcon"> {{ annotationType }} </span>
    </template>
  </Button>
  <SplitButton
    v-else
    severity="secondary"
    outlined
    raised
    ref="buttonElm"
    :style="{ height: '35px' }"
    :class="hasIcon ? '' : 'w-auto'"
    :model="dropdownOptions"
    v-tooltip.hover.top="{ value: annotationType, showDelay: 50 }"
    @click="handleButtonClick"
    :pt="{
      pcMenu: {
        root: {
          style: {
            zIndex: 'var(--z-index-max)',
          },
        },
      },
    }"
  >
    <template #icon>
      <AnnotationTypeIcon :annotationType="annotationType" />
    </template>
    <template #default>
      <span v-if="!hasIcon"> {{ annotationType }} </span>
    </template>

    <template #item="{ label }">
      <div class="flex p-1 gap-1 align-items-center select-none cursor-pointer">
        <span :style="{ display: 'block', width: '20px', height: '20px' }">
          <AnnotationTypeIcon :annotationType="label as string" />
        </span>
        <span>{{ label }}</span>
      </div>
    </template>
  </SplitButton>
</template>

<style scoped>
.button-empty {
  padding: 0 5px;
  width: auto !important;
}
</style>
