<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();
const hasHistory = ref<boolean>(false);

onMounted(() => {
  hasHistory.value = window.history.state.back;
});

function goBack() {
  router.back();
}

// Must be outside of vue router for now
function goHome() {
  window.location.href = '/';
}
</script>

<template>
  <div class="error-container flex flex-column justify-content-center align-items-center gap-4">
    <div class="text">The provided path does not exist in the database :/</div>
    <div class="flex gap-2">
      <Button v-if="hasHistory" @click="goBack" icon="pi pi-arrow-left" label="Go back" />
      <Button @click="goHome" icon="pi pi-home" label="Go to home" />
    </div>
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
