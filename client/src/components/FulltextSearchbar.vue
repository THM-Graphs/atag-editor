<script setup lang="ts">
import { ComponentPublicInstance, nextTick, ref, useTemplateRef } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import { useAnnotationStore } from '../store/annotations';
import { useCharactersStore } from '../store/characters';
import { useEditorStore } from '../store/editor';
import InputGroup from 'primevue/inputgroup';
import Button from 'primevue/button';

/**
 *  Enriches Search with an html key that contains the formatted search result
 */
type SearchResult = {
  index: number;
  match: string;
  startIndex: number;
  endIndex: number;
  html: string;
};

/**
 * Interface for relevant state information about the text search
 */
interface TextSearchObject {
  fetchedItems: SearchResult[];
  searchStr: string | null;
  mode: 'edit' | 'view';
  elm: ReturnType<typeof useTemplateRef<ComponentPublicInstance>>;
}

const PREVIEW_CHARACTER_SIZE: number = 25;

const { createFullTextFromCharacters, jumpToSnippetByIndex, totalCharacters } =
  useCharactersStore();
const { extractSnippetAnnotations, updateTruncationStatus } = useAnnotationStore();
const { hasUnsavedChanges, setNewRangeAnchorUuid, initializeHistory } = useEditorStore();

const isSearchActive = ref<boolean>(false);

const textSearchObject = ref<TextSearchObject>({
  fetchedItems: [],
  searchStr: '',
  mode: 'view',
  elm: useTemplateRef<ComponentPublicInstance>('searchbar'),
});

function resetSearch(): void {
  textSearchObject.value.searchStr = '';
  textSearchObject.value.fetchedItems = [];

  setIsSearchActive(false);
}

async function searchTextMatches(searchString: string): Promise<void> {
  const textToSearch: string = createFullTextFromCharacters();
  const searchResults: SearchResult[] = [];

  try {
    // Escape special regex characters in the search string to treat it as literal text
    const escapedSearchString: string = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex: RegExp = new RegExp(escapedSearchString, 'gi');

    const matches = textToSearch.matchAll(regex);

    matches.forEach(match => {
      searchResults.push({
        index: match.index,
        match: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length - 1,
        // Store HTML directly in prop to prevent unnecessary, primevue-enforced re-renders during hover
        html: renderHtml(match),
      });
    });
  } catch (error) {
    console.error('Error during regex search:', error);
    textSearchObject.value.fetchedItems = [];

    return;
  }

  textSearchObject.value.fetchedItems = searchResults;
}

function setIsSearchActive(mode: boolean): void {
  isSearchActive.value = mode;

  if (mode === false) {
    return;
  }

  nextTick(() => {
    const inputElm: HTMLInputElement = textSearchObject.value.elm?.$el?.querySelector('input');

    inputElm?.focus();
  });
}

/**
 * Generates an HTML string with the matched text highlighted and surrounding context preview.
 *
 * The function takes a RegExp match result and constructs an HTML snippet
 * that highlights the matched portion of the text, showing a preview of
 * characters before and after the match.
 *
 * Called for each search result of a fulltext search operation.
 *
 * @param {RegExpExecArray} match - The regex match result containing details of the match.
 * @returns {string} HTML string with the matched text highlighted and context preview.
 */

function renderHtml(match: RegExpExecArray): string {
  const textToSearch: string = match.input;

  const startIndex: number = match.index;
  const endIndex: number = startIndex + match[0].length - 1;

  const prevText: string = textToSearch.slice(startIndex - PREVIEW_CHARACTER_SIZE, startIndex);
  const nextText: string = textToSearch.slice(endIndex + 1, endIndex + 1 + PREVIEW_CHARACTER_SIZE);

  const hasMoreBefore: boolean = startIndex - PREVIEW_CHARACTER_SIZE > 0;
  const hasMoreAfter: boolean = endIndex + 1 + PREVIEW_CHARACTER_SIZE < textToSearch.length;

  const ellipsesBefore: string = hasMoreBefore ? '...' : '';
  const ellipsesAfter: string = hasMoreAfter ? '...' : '';

  return `<small>${ellipsesBefore}${prevText}<b>${match[0]}</b>${nextText}${ellipsesAfter}</small>`;
}

function handleResultItemSelect(item: SearchResult): void {
  if (hasUnsavedChanges()) {
    const answer: boolean = window.confirm(
      'Save your changes before jumping to a new snippet. Be aware that if you have unsaved changes and still decide to jump to the snippet, the result might not be correct',
    );

    if (!answer) {
      // Next tick necessary to prevent race conditions between state updates of this component and
      // PrimeVue's component
      nextTick(() => {
        textSearchObject.value.searchStr = item.match;
      });
      return;
    }
  }

  jumpToSnippetByIndex(item.startIndex);

  extractSnippetAnnotations();
  updateTruncationStatus();

  // TODO: This works when the user decides to jump to a new snippet despite the confirmation windows
  // warns him not to (since he/she has unsaved changes). Maybe find a more elegant way, but currently
  // this is the best solution
  setNewRangeAnchorUuid(totalCharacters.value[item.endIndex].data.uuid);

  initializeHistory();

  resetSearch();

  // Necessary since caret placement in EditorText.vue's onUpdated hook is overriden afterwards
  // by PrimeVue's focus and selection management. The emitted event is registered by an event listener
  // in EditorText.vue. Bit hacky, but it works. 100ms is currently enough, but might be adapted later...
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('forceCaretPlacement'));
  }, 100);
}
</script>

<template>
  <InputGroup class="mr-1" :pt="{ root: { style: { width: 'auto' } } }">
    <AutoComplete
      v-if="isSearchActive"
      :class="isSearchActive ? 'active' : 'inactive'"
      v-model="textSearchObject.searchStr"
      :placeholder="`Search for text`"
      :suggestions="textSearchObject.fetchedItems"
      class="searchbar h-2rem"
      variant="filled"
      ref="searchbar"
      title="Enter search term"
      @complete="searchTextMatches($event.query)"
      @option-select="handleResultItemSelect($event.value)"
      @blur="isSearchActive = textSearchObject.searchStr === '' ? false : true"
    >
      <template #header v-if="textSearchObject.fetchedItems.length > 0">
        <div class="font-medium px-3 py-2">{{ textSearchObject.fetchedItems.length }} Results</div>
      </template>
      <template #option="slotProps">
        <span v-html="slotProps.option.html" :title="slotProps.option.match"></span>
      </template>
    </AutoComplete>
    <Button
      v-if="!isSearchActive"
      severity="secondary"
      size="small"
      icon="pi pi-search"
      @click="setIsSearchActive(true)"
      title="Open search bar"
    />
    <Button
      v-if="isSearchActive"
      severity="secondary"
      size="small"
      icon="pi pi-times"
      title="Reset search"
      @click="resetSearch"
    />
  </InputGroup>
</template>

<style scoped></style>
