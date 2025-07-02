<script setup lang="ts">
import { Ref, ref, useTemplateRef } from 'vue';
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
  elm: ReturnType<typeof useTemplateRef>;
}

const { text } = useTextStore();
const { jumpToSnippetByIndex } = useCharactersStore();
const { hasUnsavedChanges } = useEditorStore();

const textSearchObject = ref<TextSearchObject>({
  fetchedItems: [],
  searchStr: '',
  mode: 'view',
  elm: useTemplateRef('searchbar'),
});

function jumpToText(item: SearchResult): void {
  // paginate characters to this startIndex/endIndex
}

async function searchTextMatches(searchString: string): Promise<void> {
  const textToSearch = text.value.data.text;

  // Return early if search string is empty
  //   if (!searchString.trim()) {
  //     textSearchObject.value.fetchedItems = [];
  //     return;
  //   }

  const matches: SearchResult[] = [];

  try {
    // Escape special regex characters in the search string to treat it as literal text
    const escapedSearchString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create regex object with global and case-insensitive flags
    const regex: RegExp = new RegExp(escapedSearchString, 'gi');

    let match;
    let index = 1;

    // Find all matches
    while ((match = regex.exec(textToSearch)) !== null) {
      matches.push({
        index: index++,
        match: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length - 1,
      } as SearchResult);

      // Prevent infinite loop if regex doesn't advance
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
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

function handleEntityItemSelect(item: SearchResult): void {
  if (hasUnsavedChanges()) {
    window.alert(
      'Save your changes before jumping to a new snippet. Be aware that if you have unsaved changes and still decide to jump to the snippet, the result might not be correct',
    );
    return;
  }

  //   addEntityItem(item, category);

  jumpToSnippetByIndex(item.startIndex);
  //   changeEntitiesSelectionMode(category, 'view');
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
    @option-select="handleEntityItemSelect($event.value)"
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
