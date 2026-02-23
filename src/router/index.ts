import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login/Login.vue'),
  },
  {
    path: '/',
    component: () => import('@/components/Nav.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/home',
        meta: { requiresAuth: true }
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/HomePage.vue'),
        meta: { requiresAuth: true }
      },
      // {
      //   path: 'checkpoint',
      //   name: 'checkpoint',
      //   component: () => import('@/views/CheckPoint/CPIndex.vue'),
      //   meta: { requiresAuth: true },
      //   props: true,
        
      // },
      // {
      //   path: 'checkpoint/detail/:id',
      //   name: 'checkpoint-detail',
      //   component: () => import('@/views/CheckPoint/CPDetail.vue'),
      //   meta: { requiresAuth: true },
      //   props: true,
      // },
      // {
      //   path: 'checkpoint/create',
      //   name: 'checkpoint-create',
      //   component: () => import('@/views/CheckPoint/CPCreate.vue'),
      //   meta: { requiresAuth: true },
      //   props: true,
      // },
    ]
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// === LOGIC KIỂM TRA ROUTER ===
router.beforeEach((to, from, next) => {
  // Kiểm tra xem user đã có token chưa (đơn giản hóa bằng localStorage)
  const isAuthenticated = localStorage.getItem('user_token');

  if (to.meta.requiresAuth && !isAuthenticated) {
    // 1. Nếu trang cần Auth mà chưa đăng nhập -> Đá về Login
    next('/login');
  } else if (to.path === '/login' && isAuthenticated) {
    // 2. Nếu đang ở trang Login mà đã đăng nhập rồi -> Đá về Home
    next('/home');
  } else {
    // 3. Các trường hợp khác cho đi tiếp
    next();
  }
});

export default router
