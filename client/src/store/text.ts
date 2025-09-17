import { readonly, ref } from 'vue';
import { useAppStore } from './app';
import { Collection, NodeAncestry, Text, TextAccessObject } from '../models/types';
import { cloneDeep } from '../utils/helper/helper';

const { api } = useAppStore();

// Data
const text = ref<Text>(null);
const initialText = ref<Text>(null);
const correspondingCollection = ref<Collection>(null);
const paths = ref<NodeAncestry[]>([]);

// Fetch status
const isFetching = ref<boolean>(false);
const error = ref<any>(null);

export function useTextStore() {
  async function fetchAndInitializeText(uuid: string): Promise<void> {
    isFetching.value = true;

    try {
      const text: TextAccessObject = await api.getTextAccessObject(uuid);

      initializeText(text);
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error fetching text:', e);
    } finally {
      isFetching.value = false;
    }
  }

  function initializeText(newText: TextAccessObject): void {
    text.value = newText.text;
    initialText.value = cloneDeep(newText.text);
    correspondingCollection.value = newText.collection;
    paths.value = newText.paths;
  }

  return {
    correspondingCollection: readonly(correspondingCollection),
    error: readonly(error),
    initialText,
    isFetching: readonly(isFetching),
    paths: readonly(paths),
    text,
    fetchAndInitializeText,
  };
}
