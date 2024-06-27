import { RouteRecordRaw, Router, createWebHistory, createRouter } from 'vue-router';
import Overview from './views/Overview.vue';
import Editor from './views/Editor.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', component: Overview },
  { path: '/texts/:uuid', component: Editor },
];

const router: Router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
