<script setup lang="ts">
defineProps<{ annotationType: string }>();
</script>

<template>
  <div :class="`annotation-type-icon-${annotationType}`"></div>
</template>

<style scoped>
/* This styles the icon container which will be enriched with
custom SVG background-image properties by the users */
div[class^='annotation-type-icon'] {
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  width: 100%;
  height: 100%;
}
</style>
