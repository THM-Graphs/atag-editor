import { RouteRecordRaw, Router, createWebHistory, createRouter } from 'vue-router';
import Overview from './views/Overview.vue';
import Editor from './views/Editor.vue';
import CollectionEntry from './views/CollectionEntry.vue';
import CollectionManager from './views/CollectionManager.vue';

const allRoutes = [
  { path: '/', component: Overview },
  { path: '/collection-manager/:uuid?', component: CollectionManager },
  { path: '/collections', component: Overview },
  { path: '/collections/:uuid', component: CollectionEntry },
  { path: '/texts/:uuid', component: Editor },
];

const prodRoutes = allRoutes.filter(r => r.path !== '/playground');

const usedRoutes: RouteRecordRaw[] = import.meta.env.DEV ? allRoutes : prodRoutes;

const router: Router = createRouter({
  history: createWebHistory(),
  routes: usedRoutes,
});

export default router;
