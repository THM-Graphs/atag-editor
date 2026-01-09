<script setup lang="ts">
import { Teleport, useAttrs } from 'vue';

// Apply classes, style instructions etc. from parent that uses this component.
const attrs: ReturnType<typeof useAttrs> = useAttrs();
</script>

<template>
  <Teleport to="body">
    <div class="container w-screen h-screen" v-bind="attrs">
      <slot> </slot>
    </div>
  </Teleport>
</template>

<style scoped>
.container {
  position: absolute;
  top: 0;
  left: 0;
  z-index: var(--z-index-overlay);
}
</style>
