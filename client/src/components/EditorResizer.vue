<script setup lang="ts">
import { ComputedRef, computed } from 'vue';
import Button from 'primevue/button';

const props = defineProps<{
  position: string;
  sidebarIsCollapsed: boolean;
  defaultWidth: number;
  isActive: boolean;
}>();

const emit = defineEmits(['toggleSidebar']);

const { position, defaultWidth } = props;
// Can not be destructured since reactivity would be lost
const sidebarIsCollapsed: ComputedRef<boolean> = computed(() => props.sidebarIsCollapsed);
const isActive: ComputedRef<boolean> = computed(() => props.isActive);
const width: ComputedRef<number> = computed(() => (sidebarIsCollapsed.value ? 0 : defaultWidth));

const arrowDirection: ComputedRef<string> = computed(() => {
  if (position === 'left') {
    return sidebarIsCollapsed.value ? 'pi pi-arrow-right' : 'pi pi-arrow-left';
  } else {
    return sidebarIsCollapsed.value ? 'pi pi-arrow-left' : 'pi pi-arrow-right';
  }
});

const resizerClasses: ComputedRef<string> = computed(() => {
  return ['resizer', `resizer-${position}`, `${isActive.value ? 'active' : ''}`].join(' ');
});

function toggleSidebar() {
  // This sends the OLD value to the parent element where the state is updated and passed into here.
  emit('toggleSidebar', position, sidebarIsCollapsed.value);
}
</script>

<template>
  <div :resizer-id="position" :class="resizerClasses" :style="{ minWidth: width + 'px' }">
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
  cursor: col-resize;
  position: relative;
  background-color: whitesmoke;

  --height: 3.5rem;
  --width: 1.5rem;

  &:hover:not(:has(.handle:hover)),
  &.active {
    background-color: var(--p-primary-color);
    transition: background-color 200ms;
  }

  .handle {
    color: black;
    border-color: gray;
    position: absolute;
    height: var(--height);
    width: var(--width);
    top: 50%;
    cursor: pointer;

    &.handle-left {
      left: 100%;
      border-left: none;
      transform: translateY(-50%);
      border-radius: 0 calc(var(--width) / 2) calc(var(--width) / 2) 0;
    }

    &.handle-right {
      right: 100%;
      border-right: none;
      transform: translateY(-50%);
      border-radius: calc(var(--width) / 2) 0 0 calc(var(--width) / 2);
    }
  }
}
</style>
