import { ref } from 'vue';
import { Collection, NodeAncestry, Text, TextAccessObject } from '../models/types';
import { cloneDeep } from '../utils/helper/helper';

const text = ref<Text>(null);
const initialText = ref<Text>(null);
const correspondingCollection = ref<Collection>(null);
const paths = ref<NodeAncestry[]>([]);

export function useTextStore() {
  function initializeText(newText: TextAccessObject): void {
    text.value = newText.text;
    initialText.value = cloneDeep(newText.text);
    correspondingCollection.value = newText.collection;
    paths.value = newText.paths;
  }

  return {
    correspondingCollection,
    initialText,
    paths,
    text,
    initializeText,
  };
}
