import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import store from '@/composables/useVuex';

// THÊM MỚI Ở ĐÂY: Import sẵn toàn bộ các Component (Eager Load) 
// để tránh lỗi "Failed to fetch dynamically imported module" khi test Offline
import Nav from '@/components/Nav.vue';
import HomePage from '@/views/HomePage.vue';
import CPDetail from '@/views/Area/AreaDetail.vue';
import CPCreate from '@/views/Area/AreaCreate.vue';
import Login from '@/views/Login/Login.vue';
import AreaBase from '@/views/Area/AreaIndex.vue';
import UserIndex from '@/views/User/UserIndex.vue';
import RoleIndex from '@/views/Role/RoleIndex.vue';
import MenuCategoryIndex from '@/views/MenuCategory/MenuCategoryIndex.vue';
import ReportIndex from '@/views/Report/ReportIndex.vue';
import RouteIndex from '@/views/Route/RouteIndex.vue';
import TutorialIndex from '@/views/Tutorial/TutorialIndex.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: Nav,
    meta: { requiresAuth: true },
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        component: HomePage,
      },
      {
        path: 'checkpoint/detail/:id',
        name: 'checkpoint-detail',
        component: CPDetail,
        props: true,
      },
      {
        path: 'checkpoint/create',
        name: 'checkpoint-create',
        component: CPCreate,
        props: true,
      },
      {
        path: 'area',
        name: 'area',
        component: AreaBase,
      },
      {
        path: 'user',
        name: 'user',
        component: UserIndex,
      },
      {
        path: 'role',
        name: 'role',
        component: RoleIndex,
      },
      {
        path: 'menucategory',
        name: 'menucategory',
        component: MenuCategoryIndex,
      },
      {
        path: 'route',
        name: 'route',
        component: RouteIndex,
      },
      {
        path: 'report',
        name: 'report',
        component: ReportIndex,
      },
      {
        path: 'tutorial',
        name: 'tutorial',
        component: TutorialIndex,
      },
    ]
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: to => {
      return store.state.token ? '/home' : '/login';
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  // 1. Hydrate an toàn
  if (!store.state.isHydrated) {
    try {
      await store.dispatch('initApp');
    } catch (e) {
      console.error("Init App Failed", e);
    }
  }

  const token = store.state.token;
  // Kiểm tra meta của từng bản ghi trong route
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // TRƯỜNG HỢP 1: Cần auth nhưng ko có token
  if (requiresAuth && !token) {
    return next({ name: 'login' });
  }

  // TRƯỜNG HỢP 2: Có token rồi mà vẫn vào login
  if (to.name === 'login' && token) {
    return next({ name: 'home' });
  }

  // TRƯỜNG HỢP 3: Cho đi tiếp
  next();
});

export default router;