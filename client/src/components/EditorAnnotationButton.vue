<script setup lang="ts">
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import { useCharactersStore } from '../store/characters';
import {
  cloneDeep,
  getDefaultValueForProperty,
  getParentCharacterSpan,
  getSelectionData,
  isEditorElement,
} from '../utils/helper/helper';
import { useGuidelinesStore } from '../store/guidelines';
import { useFilterStore } from '../store/filter';
import { useEditorStore } from '../store/editor';
import { useShortcutsStore } from '../store/shortcuts';
import { useToast } from 'primevue/usetoast';
import AnnotationRangeError from '../utils/errors/annotationRange.error';
import {
  AdditionalText,
  Annotation,
  PropertyConfig,
  AnnotationType,
  Character,
} from '../models/types';
import IAnnotation from '../models/IAnnotation';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import { ToastServiceMethods } from 'primevue/toastservice';
import ShortcutError from '../utils/errors/shortcut.error';
import { onMounted, ref } from 'vue';
import { useAnnotationStore } from '../store/annotations';

const { annotationType } = defineProps<{ annotationType: string }>();

const { snippetCharacters } = useCharactersStore();
const { snippetAnnotations } = useAnnotationStore();
const { execCommand } = useEditorStore();
const { guidelines, getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();
const { selectedOptions } = useFilterStore();
const { normalizeKeys, registerShortcut } = useShortcutsStore();
const toast: ToastServiceMethods = useToast();

const config: AnnotationType = getAnnotationConfig(annotationType);
const fields: PropertyConfig[] = getAnnotationFields(annotationType);
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

function isBetweenAnnotations(leftChar: Character, rightChar: Character): boolean {
  const leftUuid: string = leftChar.annotations.find(a => a.type === annotationType)?.uuid;
  const rightUuid: string = rightChar.annotations.find(a => a.type === annotationType)?.uuid;

  return leftUuid && rightUuid && leftUuid !== rightUuid;
}

function findAnnotationToSplit(leftChar: Character, rightChar: Character): Annotation | null {
  const leftUuid: string = leftChar.annotations.find(a => a.type === annotationType)?.uuid;
  const rightUuid: string = rightChar.annotations.find(a => a.type === annotationType)?.uuid;

  if (leftUuid && rightUuid && leftUuid === rightUuid) {
    return snippetAnnotations.value.find(a => a.data.properties.uuid === leftUuid);
  }

  return null;
}

function handleClick(dropdownOption?: string | number): void {
  try {
    isAnnotationTypeEnabled();
    isSelectionValid();

    // TODO: This needs to be overhauled completely
    // For paragraph annotations
    if (config.isSeparator) {
      const { range } = getSelectionData();
      const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      let leftSpan: HTMLSpanElement;
      let rightSpan: HTMLSpanElement;
      let previousCharacters: Character[] = [];
      let nextCharacters: Character[] = [];
      if (range.startOffset === 0) {
        leftSpan = referenceSpanElement.previousElementSibling as HTMLSpanElement;
        rightSpan = referenceSpanElement;
      } else {
        leftSpan = referenceSpanElement;
        rightSpan = referenceSpanElement.nextElementSibling as HTMLSpanElement;
      }

      const leftCharIndex = snippetCharacters.value.findIndex(c => c.data.uuid === leftSpan.id);
      const rightCharIndex = snippetCharacters.value.findIndex(c => c.data.uuid === rightSpan.id);
      const leftChar = snippetCharacters.value[leftCharIndex];
      const rightChar = snippetCharacters.value[rightCharIndex];
      if (isBetweenAnnotations(leftChar, rightChar)) {
        throw new AnnotationRangeError(
          `An empty ${annotationType} annotation cannot be created between two existing annotations`,
        );
      }
      // Indicates whether to split the annotation the caret is currently inside of
      const annotationToSplit: Annotation | null = findAnnotationToSplit(leftChar, rightChar);
      // Throw error if annotation is truncated (whole annotated text must be loaded)
      if (annotationToSplit?.isTruncated) {
        throw new AnnotationRangeError(
          'The annotation is truncated. Please load the full annotation first.',
        );
      }
      // Remove annotation that is being split
      if (annotationToSplit) {
        // removeAnnotationFromCharacters(annotationToSplit.data.properties.uuid);
        // deleteAnnotation(annotationToSplit.data.properties.uuid);

        execCommand('deleteAnnotation', { annotation: annotationToSplit });
      }
      let current: Character = leftChar;
      let index: number = leftCharIndex;
      let newAnnotation: Annotation = null;
      // Annotate previous characters
      while (current && !current.annotations.some(a => a.type === annotationType) && index >= 0) {
        previousCharacters.unshift(current);
        index--;
        current = snippetCharacters.value[index];
      }
      newAnnotation = createNewAnnotation(annotationType, dropdownOption, previousCharacters);

      execCommand('createAnnotation', {
        annotation: newAnnotation,
        characters: previousCharacters,
      });
      // addAnnotation(newAnnotation);
      // annotateCharacters(previousCharacters, newAnnotation);
      // Annotate next characters
      current = rightChar;
      index = rightCharIndex;
      while (
        current &&
        !current.annotations.some(a => a.type === annotationType) &&
        index <= snippetCharacters.value.length - 1
      ) {
        nextCharacters.push(current);
        index++;
        current = snippetCharacters.value[index];
      }
      newAnnotation = createNewAnnotation(annotationType, dropdownOption, nextCharacters);

      execCommand('createAnnotation', {
        annotation: newAnnotation,
        characters: nextCharacters,
      });

      // addAnnotation(newAnnotation);
      // annotateCharacters(nextCharacters, newAnnotation);
      // setNewRangeAnchorUuid(previousCharacters[previousCharacters.length - 1].data.uuid);
    } else {
      const selectedCharacters: Character[] = getCharactersToAnnotate();
      // TODO: All logic should be moved to the store...soon
      const newAnnotation: Annotation = createNewAnnotation(
        annotationType,
        dropdownOption,
        selectedCharacters,
      );

      execCommand('createAnnotation', {
        annotation: newAnnotation,
        characters: selectedCharacters,
      });
    }
  } catch (error) {
    if (error instanceof AnnotationRangeError) {
      toast.add({
        severity: 'warn',
        summary: 'Invalid selection',
        detail: error.message,
        life: 3000,
      });
    } else if (error instanceof ShortcutError) {
      toast.add({
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

/**
 * Checks if the annotation type is enabled by verifying if it is included in the selected options. If not, an `ShortcutError` is thrown.
 *
 * @throws {ShortcutError} If the annotation type is not enabled in the current filter settings.
 * @returns {boolean} True if the annotation type is enabled.
 */
function isAnnotationTypeEnabled(): boolean {
  if (!selectedOptions.value.includes(annotationType)) {
    throw new ShortcutError(
      `Annotations of type "${config.type}" are not enabled currently. Use the Filter component to enable the type.`,
    );
  }

  return true;
}

function isSelectionValid(): boolean {
  const { range, type } = getSelectionData();

  if (!range || type === 'None') {
    throw new AnnotationRangeError('No valid text selected.');
  }

  const commonAncestorContainer: Node | undefined | Element = range.commonAncestorContainer;

  if (commonAncestorContainer instanceof Element && !commonAncestorContainer.closest('#text')) {
    throw new AnnotationRangeError('Selection is outside the text component.');
  }

  if (
    commonAncestorContainer.nodeType === Node.TEXT_NODE &&
    !commonAncestorContainer.parentElement.closest('#text')
  ) {
    throw new AnnotationRangeError('Text selection is outside the text component.');
  }

  if (type === 'Caret' && !config.isZeroPoint && !config.isSeparator) {
    throw new AnnotationRangeError('Select some text to annotate.');
  }

  if ((type === 'Caret' && config.isZeroPoint) || config.isSeparator) {
    if (isEditorElement(range.startContainer)) {
      throw new AnnotationRangeError(
        'For creating zero-point annotations, place the caret between two characters',
      );
    } else {
      const parentSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
      const caretIsAtBeginning: boolean =
        range.startOffset === 0 && !parentSpanElement.previousElementSibling;
      const caretIsAtEnd: boolean =
        range.startOffset === 1 && !parentSpanElement.nextElementSibling;

      if (caretIsAtBeginning || caretIsAtEnd) {
        if (config.isZeroPoint) {
          throw new AnnotationRangeError(
            'To create zero-point annotations, place the caret between two characters',
          );
        }
        if (config.isSeparator) {
          throw new AnnotationRangeError(
            `To create ${annotationType} annotations, the caret can not be at the start or end`,
          );
        }
      }
    }
  }

  if (type === 'Range' && config.isZeroPoint) {
    throw new AnnotationRangeError(
      'To create zero-point annotations, place the caret between two characters',
    );
  }

  if (type === 'Range' && config.isSeparator) {
    throw new AnnotationRangeError(
      `To create ${annotationType} annotations, place the caret between two characters`,
    );
  }

  return true;
}

function createNewAnnotation(
  type: string,
  subType: string | number | undefined,
  characters: Character[],
): Annotation {
  const newAnnotationData: IAnnotation = {} as IAnnotation;

  // Base properties
  fields.forEach((field: PropertyConfig) => {
    newAnnotationData[field.name] =
      field?.required === true ? getDefaultValueForProperty(field.type) : null;
  });

  // Other fields (can only be set during save (indizes), must be set explicitly (uuid, text) etc.)
  newAnnotationData.type = type;
  newAnnotationData.startIndex = 0;
  newAnnotationData.endIndex = 0;
  newAnnotationData.text = characters.map((char: Character) => char.data.text).join('');
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

  const newAnnotation: Annotation = {
    characterUuids: characters.map((char: Character) => char.data.uuid),
    data: {
      properties: cloneDeep(newAnnotationData),
      entities: cloneDeep(newAnnotationEntities),
      additionalTexts: cloneDeep(additionalTexts),
    },
    initialData: {
      properties: cloneDeep(newAnnotationData),
      entities: cloneDeep(newAnnotationEntities),
      additionalTexts: cloneDeep(additionalTexts),
    },
    isTruncated: false,
    startUuid: characters[0].data.uuid,
    endUuid: characters[characters.length - 1].data.uuid,
    status: 'created',
  };

  return newAnnotation;
}

/**
 * Get the HTML span elements that the user wants to annotate. If selection is of type 'Range', all spans between
 * the range's start and end container are returned. If selection is of type 'Caret', the span elements to the left and right
 * of the caret are returned (this is the case for zero-point annotations). The `isSelectionValid` function takes care of the existence
 * of previous and next elements.
 *
 * @returns {HTMLSpanElement[]} An array of HTML span elements to annotate.
 */
function getSpansToAnnotate(): HTMLSpanElement[] {
  const { range, type } = getSelectionData();
  let spans: HTMLSpanElement[] = [];

  if (type === 'Range') {
    const firstSpan: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
    const lastSpan: HTMLSpanElement = getParentCharacterSpan(range.endContainer);
    spans = findSpansWithinBoundaries(firstSpan, lastSpan);
  }

  if (type === 'Caret') {
    const referenceSpanElement: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
    let leftSpan: HTMLSpanElement;
    let rightSpan: HTMLSpanElement;

    if (range.startOffset === 0) {
      leftSpan = referenceSpanElement.previousElementSibling as HTMLSpanElement;
      rightSpan = referenceSpanElement;
    } else {
      leftSpan = referenceSpanElement;
      rightSpan = referenceSpanElement.nextElementSibling as HTMLSpanElement;
    }

    spans = [leftSpan, rightSpan];
  }

  return spans;
}

/**
 * Return the characters that the user wants to annotate. This is the selection as an array of Character objects.
 *
 * @returns {Character[]} The characters that the user wants to annotate.
 */
function getCharactersToAnnotate(): Character[] {
  const spans: HTMLSpanElement[] = getSpansToAnnotate();
  const uuids: string[] = spans.map((span: HTMLSpanElement) => span.id);
  const characters: Character[] = snippetCharacters.value.filter((c: Character) =>
    uuids.includes(c.data.uuid),
  );

  return characters;
}

/**
 * Finds all HTML span elements between two given span elements. Used for iterating over the DOM when the selection is of type 'Range'.
 *
 * @param {HTMLSpanElement} firstChar The first span element to include in the result.
 * @param {HTMLSpanElement} lastChar The last span element to include in the result.
 *
 * @returns {HTMLSpanElement[]} An array of all span elements between (and including) the given `firstChar` and `lastChar`.
 */
function findSpansWithinBoundaries(
  firstChar: HTMLSpanElement,
  lastChar: HTMLSpanElement,
): HTMLSpanElement[] {
  const spans: HTMLSpanElement[] = [];
  let current: HTMLSpanElement = firstChar;

  while (current && current !== lastChar) {
    spans.push(current);
    current = current.nextElementSibling as HTMLSpanElement;
  }

  spans.push(lastChar);

  return spans;
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
    :disabled="!selectedOptions.includes(annotationType)"
    :data-annotation-type="annotationType"
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
    :disabled="!selectedOptions.includes(annotationType)"
    v-tooltip.hover.top="{ value: annotationType, showDelay: 50 }"
    @click="handleButtonClick"
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
