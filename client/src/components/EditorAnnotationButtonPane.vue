<script setup lang="ts">
import Button from 'primevue/button';
import { useCharactersStore } from '../store/characters';
import { useAnnotationStore } from '../store/annotations';
import { capitalize, getParentCharacterSpan, getSelectionData } from '../helper/helper';
import iconsMap from '../helper/icons';
import { useGuidelinesStore } from '../store/guidelines';
import { useFilterStore } from '../store/filter';
// import { useHistoryStore } from '../store/history';
import { useEditorStore } from '../store/editor';
import { Annotation, AnnotationProperty, Character } from '../models/types';
import IAnnotation from '../models/IAnnotation';

const { snippetCharacters, annotateCharacters } = useCharactersStore();
const { addAnnotation } = useAnnotationStore();
const { newRangeAnchorUuid } = useEditorStore();
const { groupedAnnotationTypes, getAnnotationFields } = useGuidelinesStore();
const { selectedOptions } = useFilterStore();
// const { pushHistoryEntry } = useHistoryStore();

function handleCreateAnnotation(event: MouseEvent) {
  const buttonElm: HTMLButtonElement = (event.target as HTMLElement).closest('button');
  const annotationType: string = buttonElm.dataset.annotationType;

  const { range, type } = getSelectionData();

  if (!range || type === 'None') {
    return;
  }

  const commonAncestorContainer: Node | undefined | Element = range.commonAncestorContainer;

  // Selection is outside of text component (with element node as container)
  if (commonAncestorContainer instanceof Element && !commonAncestorContainer.closest('#text')) {
    return false;
  }

  if (
    commonAncestorContainer.nodeType === Node.TEXT_NODE &&
    !commonAncestorContainer.parentElement.closest('#text')
  ) {
    return false;
  }

  // TODO: What about zero point annotations?
  if (type === 'Caret') {
    console.log('no text selected. Return');
    return;
  }

  const selectedCharacters: Character[] = getSelectedCharacters();
  const newAnnotation: Annotation = createNewAnnotation(annotationType, selectedCharacters);

  addAnnotation(newAnnotation);
  annotateCharacters(selectedCharacters, newAnnotation);
  // TODO: This snapshot should be taken BEFORE changing the state
  // pushHistoryEntry();
  newRangeAnchorUuid.value = selectedCharacters[selectedCharacters.length - 1].data.uuid;
}

function getSelectedCharacters(): Character[] {
  const { range, selection } = getSelectionData();

  // TODO: Is this needed?
  // Return if no selection or the anchorNode is the text container.
  if (!selection || selection.anchorNode?.nodeName === 'DIV') {
    return [];
  }

  const firstSpan: HTMLSpanElement = getParentCharacterSpan(range.startContainer);
  const lastSpan: HTMLSpanElement = getParentCharacterSpan(range.endContainer);

  const selectedCharacterSpans: HTMLSpanElement[] = findSpansWithinBoundaries(
    firstSpan as HTMLSpanElement,
    lastSpan as HTMLSpanElement,
  );

  const uuids: string[] = selectedCharacterSpans.map((span: HTMLSpanElement) => span.id);

  const characters: Character[] = snippetCharacters.value.filter((c: Character) =>
    uuids.includes(c.data.uuid),
  );

  return characters;
}

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

function createNewAnnotation(type: string, characters: Character[]): Annotation {
  const fields: AnnotationProperty[] = getAnnotationFields(type);
  const data: IAnnotation = {} as IAnnotation;

  // Base properties
  fields.forEach((field: AnnotationProperty) => {
    switch (field.type) {
      case 'text':
        data[field.name] = '';
        break;
      case 'textarea':
        data[field.name] = '';
        break;
      case 'selection':
        data[field.name] = field.options[0] ?? '';
        break;
      case 'checkbox':
        data[field.name] = false;
        break;
      default:
        data[field.name] = '';
    }
  });

  // Other fields (can only be set during save (indizes), must be set explicitly (uuid, text) etc.)
  data.type = type;
  data.startIndex = 0;
  data.endIndex = 0;
  data.text = characters.map((char: Character) => char.data.text).join('');
  data.uuid = crypto.randomUUID();

  const newAnnotation: Annotation = {
    characterUuids: characters.map((char: Character) => char.data.uuid),
    data: data,
    initialData: data,
    isTruncated: false,
    startUuid: characters[0].data.uuid,
    endUuid: characters[characters.length - 1].data.uuid,
    status: 'created',
  };

  return newAnnotation;
}
</script>

<template>
  <div class="annotation-button-pane flex flex-wrap gap-3 py-3">
    <div
      class="group"
      v-for="(annotationTypes, category) in groupedAnnotationTypes"
      :key="category"
    >
      <div class="name font-semibold pb-2">{{ capitalize(category) }}</div>
      <div class="buttons">
        <Button
          v-for="type in annotationTypes"
          class="button-annotation"
          severity="secondary"
          outlined
          raised
          :key="type.type"
          :disabled="!selectedOptions.includes(type.type)"
          :data-annotation-type="type.type"
          v-tooltip.hover.top="{ value: type.type, showDelay: 50 }"
          @click="handleCreateAnnotation"
        >
          <template #icon>
            <!-- TODO: Should this come from annotation type config? -->
            <img
              :src="`${iconsMap[type.type]}`"
              :title="type.type"
              :alt="type.type"
              class="button-icon w-full h-full"
            />
          </template>
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.button-annotation {
  width: 35px;
  height: 35px;
}

.button-icon {
  object-fit: contain;
}
</style>
