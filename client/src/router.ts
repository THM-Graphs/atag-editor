import { RouteRecordRaw, Router, createWebHistory, createRouter } from 'vue-router';
import Editor from './views/Editor.vue';
import CollectionManager from './views/CollectionManager.vue';
import CollectionSingleView from './views/CollectionSingleView.vue';
import { useNavigationGuard } from './composables/useNavigationGuard';
import NewEditor from './views/NewEditor.vue';
import Playground from './views/Playground.vue';

const { hasOpenModal, redirectToCollectionPath } = useNavigationGuard();

const allRoutes = [
  { path: '/', component: CollectionManager },
  {
    path: '/collections/:uuid',
    component: CollectionSingleView,
    beforeEnter: redirectToCollectionPath,
  },
  { path: '/texts/:uuid', component: Editor },
  { path: '/editor/:uuid', component: NewEditor },
  { path: '/playground', component: Playground },
];

const prodRoutes = allRoutes.filter(r => !['/test', '/playground'].includes(r.path));

const usedRoutes = import.meta.env.DEV ? allRoutes : prodRoutes;

const router: Router = createRouter({
  history: createWebHistory(),
  routes: usedRoutes as RouteRecordRaw[],
});

router.beforeEach(() => hasOpenModal());

export default router;
