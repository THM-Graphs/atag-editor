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
import { useRoute, useRouter } from 'vue-router';
import { Collection } from '../models/types';

// Initial pageload
const isLoading = ref<boolean>(true);
const isPathValid = ref<boolean>(false);

const route = useRoute();

const {
  levels,
  pathToActiveCollection,
  restoreDefaultView,
  validatePath,
  updateLevelsAndFetchData,
} = useCollectionManagerStore();

const router = useRouter();

function updateUrlPath(uuid: string, index: number): void {
  const uuidPath: string | null = new URLSearchParams(window.location.search).get('path');
  const currentUuids: string[] = uuidPath?.split(',') ?? [];
  const newUuids: string[] = [...currentUuids.slice(0, index), uuid];

  router.push({ query: { path: newUuids.join(',') } });
}

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

function handleBreadcrumbItemClick(data: { index: number; uuid: string }): void {
  const { index, uuid } = data;

  updateUrlPath(uuid, index);
}

function handleBreadcrumbHomeClick(): void {
  router.push({ query: {} });
}
</script>

<template>
  <div v-if="!isLoading && !isPathValid">Path is not valid</div>
  <template v-else>
    <Toast />

    <LoadingSpinner v-if="isLoading === true" />

    <div v-else class="container flex flex-column h-screen">
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
            <SplitterPanel :size="10" class="overflow-y-auto">
              <div class="columns-container h-full flex overflow-x-scroll">
                <CollectionsColumn
                  v-for="(_, index) in levels"
                  :index="index"
                  :parentUuid="levels[index].parentUuid"
                />
              </div>
            </SplitterPanel>
            <SplitterPanel :size="10" class="overflow-y-auto">
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
</style>
