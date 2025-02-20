import { ref } from 'vue';
import { Collection, Text, TextAccessObject } from '../models/types';
import { cloneDeep } from '../utils/helper/helper';

const text = ref<Text>(null);
const initialText = ref<Text>(null);
const correspondingCollection = ref<Collection>(null);
const path = ref<Text[] | Collection[]>([]);

function initializeText(newText: TextAccessObject): void {
  text.value = newText.text;
  initialText.value = cloneDeep(newText.text);
  correspondingCollection.value = newText.collection;
  path.value = newText.path;
}
export function useTextStore() {
  return {
    correspondingCollection,
    initialText,
    path,
    text,
    initializeText,
  };
}
