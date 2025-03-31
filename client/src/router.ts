import { RouteRecordRaw, Router, createWebHistory, createRouter } from 'vue-router';
import Overview from './views/Overview.vue';
import Editor from './views/Editor.vue';
import CollectionEntry from './views/CollectionEntry.vue';
import Playground from './views/Playground.vue';

const allRoutes = [
  { path: '/', component: Overview },
  { path: '/collections', component: Overview },
  { path: '/collections/:uuid', component: CollectionEntry },
  { path: '/texts/:uuid', component: Editor },
  { path: '/playground', component: Playground },
];

const prodRoutes = allRoutes.filter(r => r.path !== '/playground');

const usedRoutes: RouteRecordRaw[] = import.meta.env.DEV ? allRoutes : prodRoutes;

const router: Router = createRouter({
  history: createWebHistory(),
  routes: usedRoutes,
});

export default router;
