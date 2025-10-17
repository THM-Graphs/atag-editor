<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import CollectionTopMenu from '../components/CollectionTopMenu.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Toast from 'primevue/toast';
import { useCollectionManagerStore } from '../store/collectionManager';
import CollectionBreadcrumbs from '../components/CollectionBreadcrumbs.vue';
import CollectionsColumn from '../components/CollectionsColumn.vue';
import CollectionEditPane from '../components/CollectionEditPane.vue';
import { useRoute } from 'vue-router';

// Initial pageload
const isLoading = ref<boolean>(true);

const route = useRoute();

const { levels, activateCollection, pathToActiveCollection } = useCollectionManagerStore();

watch(
  () => route.query.path,
  async (newValue, oldValue) => {
    if (isLoading.value) {
      return;
    }

    const oldUuids = (oldValue as string)?.split(',') ?? [];
    const newUuids = (newValue as string)?.split(',') ?? [];

    const { index, uuid } = getUrlChangeInfo(oldUuids, newUuids);

    await activateCollection(index, uuid);

    // console.log(
    //   index,
    //   uuid,
    //   levels.value[index].data.find(c => c.data.uuid === uuid),
    // );

    isLoading.value = false;
  },
  { immediate: true },
);

function getUrlChangeInfo(
  oldUuids: string[],
  newUuids: string[],
): { index: number; uuid: null | string } {
  let firstChangedIndex: number;
  let firstChangedUuid: string;

  let i = 0;

  // I changes on the same level occur OR earlier in the path
  while (i <= oldUuids.length && i <= newUuids.length) {
    firstChangedIndex = i;
    firstChangedUuid = newUuids[i];

    if (oldUuids[i] !== newUuids[i]) {
      return {
        index: firstChangedIndex,
        uuid: firstChangedUuid,
      };
    }

    i++;
  }

  // If not, find first uuid of new path
  if (newUuids.length > oldUuids.length) {
    const firstNewIndex: number = oldUuids.length + 1;

    return {
      index: firstNewIndex,
      uuid: newUuids[firstNewIndex],
    };
  }

  // If item earlier in the path is selected
  if (oldUuids.length > newUuids.length) {
    const lastOldIndex: number = oldUuids.length - 1;

    return {
      index: lastOldIndex,
      uuid: oldUuids[lastOldIndex],
    };
  }
}

onMounted((): void => {
  isLoading.value = false;
});
</script>

<template>
  <Toast />

  <LoadingSpinner v-if="isLoading === true" />

  <div v-else class="container flex flex-column h-screen">
    <CollectionTopMenu />
    <div class="main flex-grow-1 flex flex-column">
      <CollectionBreadcrumbs :path="pathToActiveCollection" />

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
              <CollectionsColumn v-for="(_, index) in levels" :index="index" />
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
