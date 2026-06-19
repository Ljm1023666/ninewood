import { createRouter, createWebHashHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes = [
  { path: '/intro', name: 'Intro', component: () => import('@/views/Intro.vue') },
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue'), meta: { guest: true } },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { auth: true },
    children: [
      { path: '', name: 'Home', component: () => import('@/views/Home.vue') },
      { path: 'demands/create', name: 'DemandCreate', component: () => import('@/views/DemandCreate.vue') },
      { path: 'demands/:id', name: 'DemandDetail', component: () => import('@/views/DemandDetail.vue') },
      { path: 'my-demands', name: 'MyDemands', component: () => import('@/views/MyDemands.vue') },
      { path: 'orders', name: 'Orders', component: () => import('@/views/Orders.vue') },
      { path: 'orders/:id', name: 'OrderDetail', component: () => import('@/views/OrderDetail.vue') },
      { path: 'payment/:id', name: 'Payment', component: () => import('@/views/Payment.vue') },
      { path: 'circles', name: 'Circles', component: () => import('@/views/Circles.vue') },
      { path: 'circles/:id', name: 'CircleDetail', component: () => import('@/views/CircleDetail.vue') },
      { path: 'messages', name: 'Messages', component: () => import('@/views/Messages.vue') },
      { path: 'messages/:userId', name: 'ChatDetail', component: () => import('@/views/ChatDetail.vue') },
      { path: 'shorts', name: 'Shorts', component: () => import('@/views/Shorts.vue') },
      { path: 'profile', name: 'Profile', component: () => import('@/views/Profile.vue') },
      { path: 'profile/:id', name: 'UserProfile', component: () => import('@/views/Profile.vue') },
      { path: 'cert-center', name: 'CertCenter', component: () => import('@/views/CertCenter.vue') },
      { path: 'settings', name: 'Settings', component: () => import('@/views/Settings.vue') },
      { path: 'search', name: 'Search', component: () => import('@/views/Search.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();
  if (to.meta.auth && !userStore.token) {
    next('/login');
  } else if (to.meta.guest && userStore.token) {
    next('/');
  } else {
    next();
  }
});

export default router;
