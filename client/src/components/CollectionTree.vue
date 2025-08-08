<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import CollectionTreeNode from './CollectionTreeNode.vue';
import { buildFetchUrl } from '../utils/helper/helper';
import Button from 'primevue/button';
import { Collection, CollectionSubTree } from '../models/types';

type TreeNode = {
  data: {
    collection: Collection | null;
    totalChildCount: number;
    children: TreeNode[];
  };
  state: {
    isCollapsed: boolean;
    isFetched: boolean;
  };
};

const baseFetchUrl: string = '/api/collections';

const tree = ref<TreeNode>(null);

const asyncOperationRunning = ref<boolean>(false);

// Refs for fetch url params to re-fetch collections on change

const fetchUrl = computed<string>(() => {
  // const searchParams: URLSearchParams = new URLSearchParams();

  // searchParams.set('sort', sortField.value);
  // searchParams.set('order', sortDirection.value);
  // searchParams.set('limit', rowCount.value.toString());
  // searchParams.set('skip', offset.value.toString());
  // searchParams.set('search', debouncedSearchInput.value);

  return `${baseFetchUrl}`;
});

watch(fetchUrl, async () => await getCollections());

onMounted(async (): Promise<void> => {
  await getCollections();
});

async function getCollections(): Promise<void> {
  try {
    asyncOperationRunning.value = true;
    const url: string = buildFetchUrl(fetchUrl.value);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedSubTree: CollectionSubTree = await response.json();

    tree.value = {
      data: {
        collection: null,
        totalChildCount: fetchedSubTree.children.length,
        children: fetchedSubTree.children.map(child => ({
          data: {
            collection: child.collection,
            totalChildCount: child.childCount,
            children: [],
          },
          state: {
            isCollapsed: true,
            isFetched: false,
          },
        })),
      },
      state: {
        isCollapsed: false,
        isFetched: false,
      },
    };
    console.log(tree.value);
  } catch (error: unknown) {
    console.error('Error fetching collections:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}
</script>

<template>
  <div class="tree-container overflow-y-auto">
    <CollectionTreeNode v-model="tree" :is-root="true" :level="0" />
  </div>
</template>

<style scoped></style>
