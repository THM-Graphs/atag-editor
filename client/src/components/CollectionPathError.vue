<script setup lang="ts">
import { computed } from 'vue';
import { Router, useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';

const router: Router = useRouter();
const route = useRoute();
</script>

<template>
  <div class="error-container flex flex-column justify-content-center align-items-center gap-4">
    <div class="text">
      The provided Collection path does not exist in the database :/ Maybe one of the collections
      was deleted
    </div>
    <Button @click="router.back()" aria-label="Go back">Go back</Button>
  </div>
</template>

<style scoped>
.error-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
