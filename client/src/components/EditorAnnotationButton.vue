<script setup lang="ts">
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import { useCharactersStore } from '../store/characters';
import {
  cloneDeep,
  getDefaultValueForProperty,
  getParentCharacterSpan,
  getSelectionData,
  getSpansToAnnotate,
  isEditorElement,
} from '../utils/helper/helper';
import { useGuidelinesStore } from '../store/guidelines';
import { useFilterStore } from '../store/filter';
import { useEditorStore } from '../store/editor';
import { useShortcutsStore } from '../store/shortcuts';
import AnnotationRangeError from '../utils/errors/annotationRange.error';
import { Annotation, PropertyConfig, AnnotationType, Character } from '../models/types';
import IAnnotation from '../models/IAnnotation';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import ShortcutError from '../utils/errors/shortcut.error';
import { computed, inject, onMounted, ref, ShallowRef } from 'vue';
import { useAppStore } from '../store/app';
import { Editor, Mark, mergeAttributes } from '@tiptap/vue-3';
import { useAnnotationStore } from '../store/annotations';
import { AnnotationAttributes } from '../services/marks';

const { annotationType } = defineProps<{ annotationType: string }>();

const { addToastMessage } = useAppStore();
const { snippetAnnotations, addAnnotation } = useAnnotationStore();
const { snippetCharacters } = useCharactersStore();
const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();
const { selectedOptions } = useFilterStore();
const { normalizeKeys, registerShortcut } = useShortcutsStore();

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

const editor = inject('editor') as ShallowRef<Editor, Editor>;

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

// function isBetweenAnnotations(leftChar: Character, rightChar: Character): boolean {
//   const leftUuid: string = leftChar.annotations.find(a => a.type === annotationType)?.uuid;
//   const rightUuid: string = rightChar.annotations.find(a => a.type === annotationType)?.uuid;

//   return leftUuid && rightUuid && leftUuid !== rightUuid;
// }

// function findAnnotationToSplit(leftChar: Character, rightChar: Character): Annotation | null {
//   const leftUuid: string = leftChar.annotations.find(a => a.type === annotationType)?.uuid;
//   const rightUuid: string = rightChar.annotations.find(a => a.type === annotationType)?.uuid;

//   if (leftUuid && rightUuid && leftUuid === rightUuid) {
//     return annotations.value.find(a => a.data.properties.uuid === leftUuid);
//   }

//   return null;
// }

function handleClick(dropdownOption?: string | number): void {
  try {
    isAnnotationTypeEnabled();

    if (!editor?.value) {
      throw new AnnotationRangeError('Editor not available');
    }

    const { from, to, empty } = editor.value.state.selection;

    // Validation based on annotation type
    if (empty && !config.isZeroPoint && !config.isSeparator) {
      throw new AnnotationRangeError('Select some text to annotate.');
    }

    if (!empty && (config.isZeroPoint || config.isSeparator)) {
      throw new AnnotationRangeError(
        `To create ${config.isZeroPoint ? 'zero-point' : config.type} annotations, place the caret between two characters`,
      );
    }

    // Handle zero-point annotations
    if (config.isZeroPoint) {
      if (from === 0 || from >= editor.value.state.doc.content.size) {
        throw new AnnotationRangeError(
          'Cannot create zero-point annotation at the beginning or end of the text',
        );
      }

      // Create annotation for store
      const fakeCharacters: Character[] = [
        { data: { text: '', uuid: crypto.randomUUID() }, annotations: [] },
      ];

      const newAnnotation = createNewAnnotation(annotationType, dropdownOption, fakeCharacters);
      addAnnotation(newAnnotation);

      // Create FLAT attributes for Tiptap
      const annotationAttributes: AnnotationAttributes = {
        type: newAnnotation.data.properties.type,
        uuid: newAnnotation.data.properties.uuid,
        subType: newAnnotation.data.properties.subType,
        text: '',
        isZeroPoint: true,
      };

      // Insert zero-width space and mark it
      editor.value
        .chain()
        .focus()
        .insertContent('\u200B') // Insert zero-width space
        .setTextSelection({ from: from, to: from + 1 }) // Select the inserted character
        .setAnnotation(annotationAttributes) // Apply the mark
        .setTextSelection(from + 1) // Move cursor after
        .run();

      return;
    }

    // Handle regular annotations
    const selectedText = editor.value.state.doc.textBetween(from, to, ' ');

    // Create annotation for store
    const fakeCharacters: Character[] = [
      { data: { text: 'a', uuid: '123' }, annotations: [] },
      { data: { text: 'b', uuid: '456' }, annotations: [] },
    ];

    const newAnnotation = createNewAnnotation(annotationType, dropdownOption, fakeCharacters);
    addAnnotation(newAnnotation);

    // Create FLAT attributes for Tiptap
    const annotationAttributes: AnnotationAttributes = {
      type: newAnnotation.data.properties.type,
      uuid: newAnnotation.data.properties.uuid,
      subType: newAnnotation.data.properties.subType,
      text: selectedText,
      isZeroPoint: false,
    };

    // Apply the annotation mark with flat attributes
    editor.value.chain().focus().setAnnotation(annotationAttributes).setTextSelection(to).run();
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

  const newAnnotation: Annotation = {
    characterUuids: characters.map((char: Character) => char.data.uuid),
    data: {
      properties: cloneDeep(newAnnotationData),
      entities: [],
      additionalTexts: [],
    },
    initialData: {
      properties: cloneDeep(newAnnotationData),
      entities: [],
      additionalTexts: [],
    },
    isTruncated: false,
    startUuid: characters[0].data.uuid,
    endUuid: characters[characters.length - 1].data.uuid,
    status: 'created',
  };

  return newAnnotation;
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
