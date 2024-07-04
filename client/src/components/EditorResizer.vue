<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';

const props = defineProps({
  position: String,
  sidebarIsCollapsed: Boolean,
  width: Number,
});

const emit = defineEmits(['toggleSidebar']);

const { position, width } = props;

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
  <div
    :resizer-id="position"
    :class="['resizer', `resizer-${position}`]"
    :style="{ minWidth: width + 'px' }"
  >
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
  /* width: 20px; */
  cursor: col-resize;
  background-color: black;
  position: relative;

  --height: 3.5rem;
  --width: 1.5rem;

  .handle {
    background-color: hsla(240, 100%, 27%, 0.5);
    border-color: hsla(240, 100%, 27%, 0.5);
    color: white;
    position: absolute;
    height: var(--height);
    width: var(--width);
    top: 50%;
    cursor: pointer;
    /* z-index: 5; */
    transition: background-color 100ms;

    &.handle-left {
      left: 100%;
      transform: translateY(-50%);
      border-radius: 0 calc(var(--width) / 2) calc(var(--width) / 2) 0;
    }

    &.handle-right {
      right: 100%;
      transform: translateY(-50%);
      border-radius: calc(var(--width) / 2) 0 0 calc(var(--width) / 2);
    }

    &:hover {
      background-color: var;
      border-color: var;
      transition: background-color 100ms;
    }
  }
}
</style>
