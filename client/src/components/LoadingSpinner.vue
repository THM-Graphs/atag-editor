<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner';
</script>

<template>
  <ProgressSpinner
    class="loading-spinner"
    style="width: 80px; height: 80px"
    strokeWidth="2"
    fill="transparent"
    animationDuration="1.5s"
    aria-label="Custom ProgressSpinner"
    :dt="{
      root: {
        colorOne: '#F16667',
        colorTwo: '#8DCC93',
        colorThree: '#F79767',
        colorFour: '#4C8EDA',
      },
    }"
  />
</template>

<style scoped>
.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
