<script setup lang="ts">
defineProps<{ annotationType: string }>();
</script>

<template>
  <span :class="`annotation-type-icon-${annotationType}`"></span>
</template>

<style scoped>
/* This styles the icon container which will be enriched with
custom SVG background-image properties by the users */
[class^='annotation-type-icon'] {
  display: block;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  width: 100%;
  height: 100%;
}
</style>
