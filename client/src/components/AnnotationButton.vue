<script setup lang="ts">
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import { useGuidelinesStore } from '../store/guidelines';
import { useShortcutsStore } from '../store/shortcuts';
import { PropertyConfig, AnnotationType } from '../models/types';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import { onMounted, ref } from 'vue';

const props = defineProps<{ type: string; disabled: boolean; config: AnnotationType }>();

const emit = defineEmits<{
  (e: 'clicked', data: { type: string; subType?: string | number }): void;
}>();

const { getAnnotationFields } = useGuidelinesStore();
const { normalizeKeys, registerShortcut } = useShortcutsStore();

const fields: PropertyConfig[] = getAnnotationFields(props.type);
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

if (props.config.shortcut?.length > 0) {
  const shortcutCombo: string = normalizeKeys(
    props.config.shortcut?.map(key => key.toLowerCase()) ?? [],
  );
  registerShortcut(shortcutCombo, handleClick);
}

// TODO: This is a temporary hack since PrimeVue makes problems with accessing the component's
// DOM element with the pcButton/pcDropdown pt option...fix maybe later, but works for now
onMounted(setButtonStylingManually);

function setButtonStylingManually(): void {
  // This function examines the DOM nodes of the annotation icon span. If the background image could not be loaded
  // (since it wasn't provided, bad internet connection etc.), the buttons shows the annotation type as string
  const iconElement: HTMLSpanElement = buttonElm.value.$el.querySelector(
    `.annotation-type-icon-${props.type}`,
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
  emit('clicked', { type: props.type, subType: dropdownOption });
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
    :disabled="disabled"
    :data-annotation-type="props.type"
    v-tooltip.hover.top="{ value: props.type, showDelay: 50 }"
    @click="handleButtonClick"
  >
    <template #icon>
      <AnnotationTypeIcon v-if="hasIcon" :annotationType="props.type" />
    </template>
    <template #default>
      <span v-if="!hasIcon"> {{ props.type }} </span>
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
    :disabled="disabled"
    v-tooltip.hover.top="{ value: props.type, showDelay: 50 }"
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
      <AnnotationTypeIcon :annotationType="props.type" />
    </template>
    <template #default>
      <span v-if="!hasIcon"> {{ props.type }} </span>
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
