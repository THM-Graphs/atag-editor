<script setup lang="ts">
import { ref, watch } from 'vue';
import CollectionTopMenu from '../components/CollectionTopMenu.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Toast from 'primevue/toast';
import { useCollectionManagerStore } from '../store/collectionManager';
import CollectionBreadcrumbs from '../components/CollectionBreadcrumbs.vue';
import CollectionsColumn from '../components/CollectionsColumn.vue';
import CollectionEditPane from '../components/CollectionEditPane.vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { Collection } from '../models/types';
import { useToast } from 'primevue';

// Initial pageload
const isLoading = ref<boolean>(true);
const isPathValid = ref<boolean>(false);

const toast = useToast();
const route = useRoute();

const {
  canNavigate,
  levels,
  pathToActiveCollection,
  createNewUrlPath,
  restoreDefaultView,
  validatePath,
  updateLevelsAndFetchData,
} = useCollectionManagerStore();

const router = useRouter();

watch(
  () => route.query.path,
  async (newValue: string, oldValue: string) => {
    // TODO: This can be refactored...
    // On first page load
    if (isLoading.value) {
      try {
        // If path exists on page load, validate it. Else, just fetch top-level collections
        const newPath: Collection[] = newValue ? await validatePath(newValue) : [];
        updateLevelsAndFetchData(newPath);

        isPathValid.value = true;
      } catch (error: unknown) {
        isPathValid.value = false;
      } finally {
        isLoading.value = false;
      }

      return;
    }

    // Empty path query -> Restore default view
    if (!newValue || newValue === '') {
      await restoreDefaultView();
      return;
    }

    try {
      const newPath: Collection[] = await validatePath(newValue as string);
      updateLevelsAndFetchData(newPath);

      isPathValid.value = true;
    } catch (error: unknown) {
      isPathValid.value = false;
    } finally {
      isLoading.value = false;
    }
  },
  { immediate: true },
);

onBeforeRouteLeave(() => {
  if (!canNavigate.value) {
    showUnsavedChangesWarning();
    return false;
  }

  return true;
});

onBeforeRouteUpdate(() => {
  if (!canNavigate.value) {
    showUnsavedChangesWarning();
    return false;
  }

  return true;
});

function handleBreadcrumbItemClick(data: { index: number; uuid: string }): void {
  if (!canNavigate.value) {
    showUnsavedChangesWarning();
    return;
  }

  const { index, uuid } = data;

  router.push({ query: { path: createNewUrlPath(uuid, index) } });
}

function handleBreadcrumbHomeClick(): void {
  if (!canNavigate.value) {
    showUnsavedChangesWarning();
    return;
  }

  router.push({ query: {} });
}

function showUnsavedChangesWarning() {
  toast.add({
    severity: 'warn',
    summary: 'You have unsaved changes.',
    detail: 'Please save or discard your changes before selecting other collections.',
    life: 3000,
  });
}
</script>

<template>
  <div v-if="!isLoading && !isPathValid">Path is not valid</div>
  <template v-else>
    <Toast />

    <LoadingSpinner v-if="isLoading === true" />

    <div v-else class="container flex flex-column h-screen">
      <div
        class="absolute overlay w-full h-full"
        v-if="canNavigate === false"
        @click="showUnsavedChangesWarning"
      ></div>
      <CollectionTopMenu />
      <div class="main flex-grow-1 flex flex-column">
        <CollectionBreadcrumbs
          :path="pathToActiveCollection"
          @item-clicked="handleBreadcrumbItemClick"
          @home-clicked="handleBreadcrumbHomeClick"
        />

        <div class="edit-area flex-grow-1">
          <Splitter
            class="h-full gap-2"
            :pt="{
              gutter: {
                style: {
                  width: '4px',
                  zIndex: 'var(--z-index-gutter)',
                },
              },
              gutterHandle: {
                style: {
                  width: '6px',
                  position: 'absolute',
                  backgroundColor: 'darkgray',
                  height: '40px',
                },
              },
            }"
          >
            <SplitterPanel class="overflow-y-auto">
              <div class="columns-container h-full flex overflow-x-scroll">
                <CollectionsColumn
                  v-for="(_, index) in levels"
                  :index="index"
                  :parentUuid="levels[index].parentUuid"
                />
                <!-- <div class="expansion-pane"></div> -->
              </div>
            </SplitterPanel>
            <SplitterPanel :size="20" class="overflow-y-auto">
              <CollectionEditPane />
            </SplitterPanel>
          </Splitter>
        </div>
      </div>
      <div class="footer"></div>
    </div>
  </template>
</template>

<style scoped>
.container {
  outline: 1px solid green;

  .main,
  .edit-area {
    overflow-y: hidden;
  }
}

.footer {
  height: 30px;
}

.expansion-pane {
  width: 400px;
  background-color: lightblue;
}

.overlay {
  z-index: var(--z-index-overlay);
}
</style>
