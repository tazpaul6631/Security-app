import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import store from '@/composables/useVuex';

// THÊM MỚI Ở ĐÂY: Import sẵn toàn bộ các Component (Eager Load) 
// để tránh lỗi "Failed to fetch dynamically imported module" khi test Offline
import Nav from '@/components/Nav.vue';
import HomePage from '@/views/HomePage.vue';
import CPIndex from '@/views/Area/CPIndex.vue';
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
    // CODE CŨ (Lazy Load): component: () => import('@/components/Nav.vue'),
    component: Nav, // CODE MỚI (Eager Load)
    meta: { requiresAuth: true },
    // SỬA Ở ĐÂY: Thêm redirect mặc định cho route cha
    // Nếu không có dòng này, khi vào '/' nó chỉ load Nav.vue mà không load ruột (home), dẫn đến màn hình trống
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        // CODE CŨ: component: () => import('@/views/HomePage.vue'),
        component: HomePage, // CODE MỚI
      },
      // {
      //   path: 'checkpoint/:id',
      //   name: 'checkpoint',
      //   // CODE CŨ: component: () => import('@/views/Area/CPIndex.vue'),
      //   component: CPIndex, // CODE MỚI
      //   props: true,
      // },
      {
        path: 'checkpoint/detail/:id',
        name: 'checkpoint-detail',
        // CODE CŨ: component: () => import('@/views/Area/AreaDetail.vue'),
        component: CPDetail, // CODE MỚI
        props: true,
      },
      {
        path: 'checkpoint/create',
        name: 'checkpoint-create',
        // CODE CŨ: component: () => import('@/views/Area/AreaCreate.vue'),
        component: CPCreate, // CODE MỚI
        props: true,
      },
      {
        path: 'area',
        name: 'area',
        // CODE CŨ: component: () => import('@/views/Area/AreaIndex.vue'),
        component: AreaBase, // CODE MỚI
      },
      {
        path: 'user',
        name: 'user',
        // CODE CŨ: component: () => import('@/views/User/UserIndex.vue'),
        component: UserIndex, // CODE MỚI
      },
      {
        path: 'role',
        name: 'role',
        // CODE CŨ: component: () => import('@/views/Role/RoleIndex.vue'),
        component: RoleIndex, // CODE MỚI
      },
      {
        path: 'menucategory',
        name: 'menucategory',
        // CODE CŨ: component: () => import('@/views/MenuCategory/MenuCategoryIndex.vue'),
        component: MenuCategoryIndex, // CODE MỚI
      },
      {
        path: 'route',
        name: 'route',
        // CODE CŨ: component: () => import('@/views/Route/RouteIndex.vue'),
        component: RouteIndex, // CODE MỚI
      },
      {
        path: 'report',
        name: 'report',
        // CODE CŨ: component: () => import('@/views/Report/ReportIndex.vue'),
        component: ReportIndex, // CODE MỚI
      },
      {
        path: 'tutorial',
        name: 'tutorial',
        // CODE CŨ: component: () => import('@/views/Tutorial/TutorialIndex.vue'),
        component: TutorialIndex, // CODE MỚI
      },
    ]
  },
  {
    path: '/login',
    name: 'login',
    // CODE CŨ: component: () => import('@/views/Login/Login.vue'),
    component: Login, // CODE MỚI
    meta: { requiresAuth: false }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: to => {
      // Đảm bảo không bị lỗi loop nếu gõ sai URL
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