<script setup lang="ts">
import { ref } from 'vue';
import Card from 'primevue/card';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import ScrollPanel from 'primevue/scrollpanel';
import { useCharactersStore } from '../store/characters';
import { Character } from '../models/types';

const { totalCharacters } = useCharactersStore();

const searchInput = ref<string>('');
const isCollapsed = ref<boolean>(false);

const matches = ref<Character[][]>([]);

function handleSearchInput() {
  const str: string = searchInput.value.toLowerCase();

  const totalMatches: Character[][] = [];

  totalCharacters.value.forEach((c: Character, index: number, arr: Character[]) => {
    if (c.data.text.toLowerCase() !== str[0]) {
      return;
    }

    const match: Character[] = [c];
    let offset: number = 1;

    while (offset < str.length && index + offset < arr.length) {
      const nextChar: Character = arr[index + offset];

      if (nextChar.data.text.toLowerCase() === str[offset]) {
        match.push(nextChar);
        offset++;
      } else {
        break;
      }
    }

    if (match.length === str.length) {
      totalMatches.push(match);
    }
  });

  matches.value = totalMatches;
}
</script>

<template>
  <div class="container pt-2 relative">
    <IconField>
      <InputIcon class="pi pi-search" />
      <InputText
        v-model="searchInput"
        placeholder="Search in this text"
        @input="handleSearchInput"
      />
    </IconField>
    <Card v-if="!isCollapsed" id="overlay_menu" class="dropdown absolute w-20rem z-1 h-10rem">
      <template #content>
        <ScrollPanel style="width: 100%; height: 100px">
          <div v-for="match of matches" class="entry cursor-pointer">
            {{ match.map(c => c.data.text).join('') }}
          </div>
        </ScrollPanel>
      </template>
      <template #footer>
        <div class="counter">{{ matches.length }} results</div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.entry:hover {
  background-color: var(--p-emerald-200);
}
</style>
