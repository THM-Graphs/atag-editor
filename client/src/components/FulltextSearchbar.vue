<script setup lang="ts">
import { ComponentPublicInstance, nextTick, onUpdated, Ref, ref, useTemplateRef } from 'vue';
import EditorHistoryButton from './EditorHistoryButton.vue';
import EditorImportButton from './EditorImportButton.vue';
import { useTextStore } from '../store/text';
import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import AutoComplete from 'primevue/autocomplete';
import { useCharactersStore } from '../store/characters';
import IText from '../models/IText';
import { useEditorStore } from '../store/editor';

/**
 *  Enriches Search with an html key that contains the highlighted parts of the node label
 */
type SearchResult = {
  index: number;
  match: string;
  startIndex: number;
  endIndex: number;
  html: string;
};

/**
 * Interface for relevant state information about each entities category
 */
interface TextSearchObject {
  fetchedItems: SearchResult[];
  searchStr: string | null;
  mode: 'edit' | 'view';
  elm: ReturnType<typeof useTemplateRef<ComponentPublicInstance>>;
}

const { text } = useTextStore();
const { jumpToSnippetByIndex, snippetCharacters } = useCharactersStore();
const { hasUnsavedChanges, setNewRangeAnchorUuid } = useEditorStore();

const textSearchObject = ref<TextSearchObject>({
  fetchedItems: [],
  searchStr: '',
  mode: 'view',
  elm: useTemplateRef<ComponentPublicInstance>('searchbar'),
});

async function searchTextMatches(searchString: string): Promise<void> {
  const textToSearch: string = text.value.data.text;

  // Return early if search string is empty
  //   if (!searchString.trim()) {
  //     textSearchObject.value.fetchedItems = [];
  //     return;
  //   }

  const matches: SearchResult[] = [];

  try {
    // Escape special regex characters in the search string to treat it as literal text
    const escapedSearchString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex: RegExp = new RegExp(escapedSearchString, 'gi');

    const stringMatches = textToSearch.matchAll(regex);

    stringMatches.forEach(match => {
      matches.push({
        index: match.index,
        match: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length - 1,
      } as SearchResult);
    });
  } catch (error) {
    console.error('Error during regex search:', error);
    textSearchObject.value.fetchedItems = [];

    return;
  }

  // Store HTML directly in prop to prevent unnecessary, primevue-enforced re-renders during hover
  const withHtml = matches.map((match: SearchResult) => ({
    ...match,
    html: `<span>${match.match}, ${match.startIndex}-${match.endIndex}</span>`,
  }));

  textSearchObject.value.fetchedItems = withHtml;
}

function handleResultItemSelect(item: SearchResult): void {
  if (hasUnsavedChanges()) {
    window.alert(
      'Save your changes before jumping to a new snippet. Be aware that if you have unsaved changes and still decide to jump to the snippet, the result might not be correct',
    );
    return;
  }

  jumpToSnippetByIndex(item.startIndex);

  textSearchObject.value.searchStr = '';

  setNewRangeAnchorUuid(snippetCharacters.value[snippetCharacters.value.length - 1]?.data.uuid);

  // Necessary since caret placement in EditorText.vue's onUpdated hook is overriden afterwards
  // by PrimeVue's focus and selection management. The emitted event is registered by an event listener
  // in EditorText.vue. Bit hacky, but it works. 100ms is currently enough, but might be adapted later...
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('forceCaretPlacement'));
  }, 100);
}
</script>

<template>
  <AutoComplete
    v-model="textSearchObject.searchStr"
    :placeholder="`Search for text`"
    :suggestions="textSearchObject.fetchedItems"
    class="mt-2 h-2rem"
    variant="filled"
    ref="searchbar"
    @complete="searchTextMatches($event.query)"
    @option-select="handleResultItemSelect($event.value)"
  >
    <template #header v-if="textSearchObject.fetchedItems.length > 0">
      <div class="font-medium px-3 py-2">{{ textSearchObject.fetchedItems.length }} Results</div>
    </template>
    <template #option="slotProps">
      <span v-html="slotProps.option.html" :title="slotProps.option.label"></span>
    </template>
  </AutoComplete>
</template>

<style scoped></style>
