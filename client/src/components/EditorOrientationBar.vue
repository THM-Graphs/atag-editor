<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { useCharactersStore } from '../store/characters';

const { beforeStartIndex, totalCharacters, initialCharacters } = useCharactersStore();

const totalCharCount: ComputedRef<number> = computed(() => totalCharacters.value.length);
// Initial characters are used to keep the visualization even if the size of the snippet during edited changes.
// Otherwise, for example the highlighted div would have the size 0 if the user removed all text.
const snippetCharCount: ComputedRef<number> = computed(() => initialCharacters.value.length);

const snippetHeight: ComputedRef<number> = computed(() => {
  if (totalCharCount.value !== 0) {
    return (snippetCharCount.value / totalCharCount.value) * 100;
  } else {
    return 100;
  }
});
const snippetOffset: ComputedRef<number> = computed(() => {
  if (beforeStartIndex.value) {
    return (beforeStartIndex.value / totalCharCount.value) * 100;
  } else {
    return 0;
  }
});
</script>

<template>
  <div class="container relative w-1rem">
    <div
      class="snippet absolute w-full"
      :style="{ height: `${snippetHeight}%`, top: `${snippetOffset}%` }"
    ></div>
  </div>
</template>

<style scoped>
.container {
  background-color: rgb(226, 226, 226);
}

.snippet {
  background-color: pink;
}
</style>
