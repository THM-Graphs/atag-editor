import { RouteRecordRaw, Router, createWebHistory, createRouter } from 'vue-router';
import Editor from './views/Editor.vue';
import CollectionManager from './views/CollectionManager.vue';
import { useNavigationGuard } from './composables/useNavigationGuard';

const { hasOpenModal, redirectToCollectionPath } = useNavigationGuard();

const allRoutes = [
  { path: '/', component: CollectionManager },
  { path: '/test', component: CollectionManager },
  {
    path: '/collections/:uuid',
    component: { template: '</div>' },
    beforeEnter: redirectToCollectionPath,
  },
  { path: '/texts/:uuid', component: Editor },
];

const prodRoutes = allRoutes.filter(r => r.path !== '/playground');

const usedRoutes = import.meta.env.DEV ? allRoutes : prodRoutes;

const router: Router = createRouter({
  history: createWebHistory(),
  routes: usedRoutes as RouteRecordRaw[],
});

router.beforeEach(() => hasOpenModal());

export default router;
