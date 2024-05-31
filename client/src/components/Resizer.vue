<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';

const props = defineProps({
  position: String,
  sidebarIsCollapsed: Boolean,
});

const emit = defineEmits(['toggleSidebar']);

const position = props.position;

const sidebarIsCollapsed = computed(() => props.sidebarIsCollapsed);

function toggleSidebar() {
  // This sends the OLD value to the parent element where the state is updated and passed into here.
  emit('toggleSidebar', position, sidebarIsCollapsed.value);
}

const arrowDirection = computed(() => {
  if (position === 'left') {
    return sidebarIsCollapsed.value ? 'pi pi-arrow-right' : 'pi pi-arrow-left';
  } else {
    return sidebarIsCollapsed.value ? 'pi pi-arrow-left' : 'pi pi-arrow-right';
  }
});
</script>

<template>
  <div :class="['resizer', `resizer-${position}`]">
    <Button
      :class="['handle', `handle-${position}`]"
      :icon="arrowDirection"
      severity="secondary"
      @click="toggleSidebar"
    ></Button>
  </div>
</template>

<style scoped>
.resizer {
  width: 0.2rem;
  cursor: col-resize;
  background-color: black;
  position: relative;

  --height: 2.5rem;
  --width: 1.25rem;

  .handle {
    /* display: flex; */
    /* justify-content: center; */
    /* align-items: center; */
    /* background-color: #b2b2d7; */
    /* color: #fff; */
    /* border: 1px solid #b2b2d7; */
    position: absolute;
    height: var(--height);
    width: var(--width);
    top: 50%;
    cursor: pointer;
    /* z-index: 5; */
    /* transition: background-color 100ms; */

    &.handle-left {
      left: 100%;
      transform: translateY(-50%);
      /* border-radius: 0 var(--width) var(--width) 0; */
    }

    &.handle-right {
      right: 100%;
      transform: translateY(-50%);
      /* border-radius: var(--width) 0 0 var(--width); */
    }

    /* &:hover {
      background-color: darkblue;
      border: 1px solid darkblue;
      transition: background-color 100ms;
    } */
  }
}
</style>
