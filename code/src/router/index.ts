/**
 * 路由配置
 */
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/projects',
  },
  {
    path: '/projects',
    name: 'ProjectList',
    component: () => import('@/pages/ProjectList.vue'),
    meta: { title: '项目列表' },
  },
  {
    path: '/projects/:projectId',
    name: 'ProjectDetail',
    component: () => import('@/pages/ProjectDetail.vue'),
    meta: { title: '项目详情' },
    props: true,
  },
  {
    path: '/projects/:projectId/bom/:versionId',
    name: 'BomEditor',
    component: () => import('@/pages/BomEditor.vue'),
    meta: { title: 'BOM编辑' },
    props: true,
  },
  {
    path: '/components',
    name: 'ComponentLibrary',
    component: () => import('@/pages/ComponentLibrary.vue'),
    meta: { title: '元器件库' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/Settings.vue'),
    meta: { title: '系统设置' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫：更新页面标题
router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} - BOMMaster`;
  }
  next();
});

export default router;