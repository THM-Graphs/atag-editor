<script setup lang="ts">
import { RouteLocationNormalized, useRoute } from 'vue-router';
import { Collection, NodeAncestry } from '../models/types';
import CollectionBreadcrumbs from '../components/CollectionBreadcrumbs.vue';
import Card from 'primevue/card';

const route: RouteLocationNormalized = useRoute();

const uuid: string = route.params.uuid as string;

// These two are added to the route in the beforeEnter navigation guard
const collection: Collection = route.meta.collection as Collection;
const ancestryPaths: NodeAncestry[] = route.meta.ancestryPaths as NodeAncestry[];
</script>
<template>
  <div class="container text-center">
    <h2>Collection "{{ collection.data.label }}"</h2>

    <p>This collection is part of {{ ancestryPaths.length }} hierarchies. Select one of them:</p>

    <div class="collection-path-pane flex flex-column align-items-center">
      <RouterLink
        v-for="path in ancestryPaths"
        :to="`/?path=${[...path.map(n => n.data.uuid), uuid].join(',')}`"
      >
        <Card
          class="path cursor-pointer mb-4"
          title="Open collection in this path"
          :style="{
            boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px,rgba(27, 31, 35, 0.15) 0px 0px 0px 1px',
            minWidth: '400px',
          }"
        >
          <template #content>
            <div class="flex justify-content-center">
              <CollectionBreadcrumbs :path="path" />
            </div>
          </template>
        </Card>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.path:hover {
  transition: 200ms;
  background-color: hsl(0, 0%, 90%) !important;
}
</style>
