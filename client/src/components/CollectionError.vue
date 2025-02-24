<script setup lang="ts">
import Button from 'primevue/button';

defineProps<{ uuid: string }>();
</script>

<template>
  <div class="error-container flex flex-column justify-content-center align-items-center gap-4">
    <div class="text">A Collection with UUID {{ uuid }} does not exist :/</div>
    <RouterLink to="/">
      <Button aria-label="Home">Go to overview</Button>
    </RouterLink>
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
