<script setup lang="ts">
import { useTemplateRef } from 'vue';
import Button from 'primevue/button';
import BookmarkPopover from './BookmarkPopover.vue';

const popover = useTemplateRef<InstanceType<typeof BookmarkPopover>>('popover');

/**
 * Toggle the visibility of the bookmark popover.
 *
 * Calls the toggle method of the popover instance.
 *
 * @param {PointerEvent} event - The event that triggered the toggle.
 * @returns {void} This function does not return any value.
 */
function togglePopoverVisibility(event: PointerEvent): void {
  popover.value.toggle(event);
}
</script>

<template>
  <Button
    type="button"
    severity="secondary"
    label="Bookmarks"
    icon="pi pi-bookmark-fill"
    size="small"
    @click="togglePopoverVisibility"
  />

  <BookmarkPopover ref="popover" />
</template>

<style scoped></style>
