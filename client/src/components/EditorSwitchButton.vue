<script setup lang="ts">
import Button from 'primevue/button';
import BookmarkPopover from './BookmarkPopover.vue';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();

const newRoute = computed(() => {
  if (route.path.includes('/texts/')) {
    return '/editor/' + route.params.uuid;
  } else {
    return '/texts/' + route.params.uuid;
  }
});

const title = computed(() => {
  if (route.path.includes('/texts/')) {
    return 'New Editor';
  } else {
    return 'Old Editor';
  }
});
</script>

<template>
  <Button>
    <RouterLink :to="newRoute">{{ title }}</RouterLink>
  </Button>

  <BookmarkPopover ref="popover" />
</template>

<style scoped></style>
