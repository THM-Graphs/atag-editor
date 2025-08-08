<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { buildFetchUrl } from '../utils/helper/helper';
import Button from 'primevue/button';
import { Collection, CollectionSubTree } from '../models/types';

const treeNode = defineModel<TreeNode>();
const { isRoot, level } = defineProps<{
  isRoot: boolean;
  level: number;
}>();

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

const asyncOperationRunning = ref<boolean>(false);

// Refs for fetch url params to re-fetch collections on change

// const fetchUrl = computed<string>(() => {
//   // const searchParams: URLSearchParams = new URLSearchParams();

//   // searchParams.set('sort', sortField.value);
//   // searchParams.set('order', sortDirection.value);
//   // searchParams.set('limit', rowCount.value.toString());
//   // searchParams.set('skip', offset.value.toString());
//   // searchParams.set('search', debouncedSearchInput.value);

//   return `${baseFetchUrl}`;
// });

async function getCollections(): Promise<void> {
  try {
    asyncOperationRunning.value = true;
    const url: string = buildFetchUrl(
      baseFetchUrl + `?uuid=${treeNode.value.data.collection?.data.uuid}`,
    );
    console.log(treeNode.value.data.collection?.data.uuid);

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const fetchedSubTree: CollectionSubTree = await response.json();

    // Add children data to node
    treeNode.value.data.children = fetchedSubTree.children.map(child => ({
      data: {
        collection: child.collection,
        totalChildCount: child.childCount,
        children: [],
      },
      state: {
        isCollapsed: true,
        isFetched: false,
      },
    }));

    // Set fetched state to true so that data aren't fetched again on next expand
    treeNode.value.state.isFetched = true;
  } catch (error: unknown) {
    console.error('Error fetching collections:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

async function toggleSubTree(): Promise<void> {
  const { isCollapsed, isFetched } = treeNode.value.state;

  if (!isFetched && isCollapsed && !isRoot) {
    // If the node is already fetched, just toggle the collapsed state
    await getCollections();
  }

  treeNode.value.state.isCollapsed = !isCollapsed;
}
</script>

<template>
  <div
    v-if="treeNode"
    class="flex align-items-center gap-2"
    :style="{ marginLeft: `${level * 20}px` }"
  >
    <div class="pad">
      <Button
        v-if="treeNode.data.totalChildCount > 0"
        class="w-full h-full"
        size="small"
        severity="secondary"
        :icon="`pi pi-chevron-${treeNode.state.isCollapsed ? 'right' : 'down'}`"
        @click="toggleSubTree"
      />
      <div v-else class="w-full"></div>
    </div>
    <template v-if="isRoot"> All Collections ({{ treeNode?.data.totalChildCount }}) </template>
    <template v-else>
      <span>
        <a :href="`/collections/${treeNode?.data.collection?.data.uuid}`">
          {{ treeNode?.data.collection?.data.label }}
          <i class="pi pi-external-link" style="font-size: 0.75rem"></i>
        </a>
        <span class="pl-1"> [{{ treeNode?.data.totalChildCount }}] </span>
      </span>
    </template>
  </div>

  <template v-if="!treeNode?.state.isCollapsed" v-for="(_, index) in treeNode?.data.children">
    <CollectionTreeNode
      v-model="treeNode.data.children[index]"
      :is-root="false"
      :level="level + 1"
    />
  </template>
</template>

<style scoped>
.pad {
  width: 30px;
  height: 30px;
}
</style>
