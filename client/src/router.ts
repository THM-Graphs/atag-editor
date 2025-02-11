import { RouteRecordRaw, Router, createWebHistory, createRouter } from 'vue-router';
import Overview from './views/Overview.vue';
import Editor from './views/Editor.vue';
import CollectionEntry from './views/CollectionEntry.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', component: Overview },
  { path: '/collections', component: Overview },
  { path: '/collections/:uuid', component: CollectionEntry },
  { path: '/texts/:uuid', component: Editor },
];

const router: Router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
