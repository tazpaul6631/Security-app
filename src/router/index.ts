import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import store from '@/composables/useVuex';

// 🚀 THÊM MỚI Ở ĐÂY: Import sẵn toàn bộ các Component (Eager Load) 
// để tránh lỗi "Failed to fetch dynamically imported module" khi test Offline
import Nav from '@/components/Nav.vue';
import HomePage from '@/views/HomePage.vue';
import CPIndex from '@/views/CheckPoint/CPIndex.vue';
import CPDetail from '@/views/CheckPoint/CPDetail.vue';
import CPCreate from '@/views/CheckPoint/CPCreate.vue';
import Login from '@/views/Login/Login.vue';

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
      {
        path: 'checkpoint/:id',
        name: 'checkpoint',
        // CODE CŨ: component: () => import('@/views/CheckPoint/CPIndex.vue'),
        component: CPIndex, // CODE MỚI
        props: true,
      },
      {
        path: 'checkpoint/detail/:id',
        name: 'checkpoint-detail',
        // CODE CŨ: component: () => import('@/views/CheckPoint/CPDetail.vue'),
        component: CPDetail, // CODE MỚI
        props: true,
      },
      {
        path: 'checkpoint/create',
        name: 'checkpoint-create',
        // CODE CŨ: component: () => import('@/views/CheckPoint/CPCreate.vue'),
        component: CPCreate, // CODE MỚI
        props: true,
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