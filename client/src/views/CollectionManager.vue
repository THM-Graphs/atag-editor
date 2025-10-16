<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import CollectionTopMenu from '../components/CollectionTopMenu.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Toast from 'primevue/toast';
import { useCollectionManagerStore } from '../store/collectionManager';
import CollectionBreadcrumbs from '../components/CollectionBreadcrumbs.vue';
import CollectionsColumn from '../components/CollectionsColumn.vue';
import CollectionEditPane from '../components/CollectionEditPane.vue';

// Initial pageload
const isLoading = ref<boolean>(false);

const { levels } = useCollectionManagerStore();
</script>

<template>
  <Toast />

  <LoadingSpinner v-if="isLoading === true" />

  <div v-else class="container flex flex-column h-screen">
    <CollectionTopMenu />
    <div class="main flex-grow-1 flex flex-column">
      <CollectionBreadcrumbs />
      <div>Here comes the additional action pane (remove selected collections etc.)</div>
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
    <div class="footer">I am the footer</div>
  </div>
</template>

<style scoped>
.container {
  outline: 1px solid green;
}
</style>
