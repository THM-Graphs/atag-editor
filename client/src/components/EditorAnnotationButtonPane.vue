<script setup lang="ts">
import Button from 'primevue/button';
import { useCharactersStore } from '../store/characters';
import { useAnnotationStore } from '../store/annotations';
import { capitalize, getParentCharacterSpan, getSelectionData } from '../helper/helper';
import { Annotation, Character } from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';
import { useFilterStore } from '../store/filter';

const { snippetCharacters, annotateCharacters } = useCharactersStore();
const { addAnnotation } = useAnnotationStore();
const { groupedAnnotationTypes } = useGuidelinesStore();
const { selectedOptions } = useFilterStore();

function handleCreateAnnotation(event: MouseEvent) {
  const buttonElm: HTMLButtonElement = (event.target as HTMLElement).closest('button');
  const annotationType: string = buttonElm.dataset.annotationType;

  // TODO: What about zero point annotations?
  if (getSelectionData().type === 'Caret') {
    console.log('no text selected. Return');
    return;
  }

  const selectedCharacters: Character[] = getSelectedCharacters();
  const newAnnotation: Annotation = createNewAnnotation(annotationType, selectedCharacters);

  addAnnotation(newAnnotation);
  annotateCharacters(selectedCharacters, newAnnotation);
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

  const uuids: string[] = selectedCharacterSpans.map((span: HTMLSpanElement) => span.dataset.uuid);

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
  const newAnnotation: Annotation = {
    characterUuids: characters.map((char: Character) => char.data.uuid),
    // TODO: This should come from the guidelines
    data: {
      comment: '',
      commentInternal: '',
      // TODO: Update with Cypher
      endIndex: 0,
      originalText: '',
      // TODO: Update with Cypher
      startIndex: 0,
      subtype: '',
      text: characters.map((char: Character) => char.data.text).join(''),
      type: type,
      url: '',
      uuid: crypto.randomUUID(),
    },
    startUuid: characters[0].data.uuid,
    endUuid: characters[characters.length - 1].data.uuid,
    status: 'created',
  };

  return newAnnotation;
}
</script>

<template>
  <div class="annotation-button-pane flex flex-wrap gap-1">
    <div
      class="group"
      v-for="(annotationTypes, category) in groupedAnnotationTypes"
      :key="category"
    >
      <div class="name">{{ capitalize(category) }}</div>
      <div class="buttons">
        <Button
          class="button-annotation"
          v-for="type in annotationTypes"
          :key="type.type"
          :label="type.text"
          size="small"
          :disabled="!selectedOptions.includes(type.type)"
          :data-annotation-type="type.type"
          @click="handleCreateAnnotation"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
