import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 前台页面（直接 import，首屏加载）
import HomeView from '@/views/HomeView.vue'
import TeaListView from '@/views/TeaListView.vue'
import TeaDetailView from '@/views/TeaDetailView.vue'
import MyListView from '@/views/MyListView.vue'
import ShareView from '@/views/ShareView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import NotFound from '@/views/NotFound.vue'

const routes: RouteRecordRaw[] = [
  // —— 前台 ——
  { path: '/', name: 'home', component: HomeView, meta: { title: '茶·图鉴' } },
  { path: '/teas', name: 'tea-list', component: TeaListView, meta: { title: '茶品列表' } },
  { path: '/teas/:id', name: 'tea-detail', component: TeaDetailView, meta: { title: '茶品详情' } },
  {
    path: '/my',
    name: 'my-list',
    component: MyListView,
    meta: { title: '我的收藏', requiresAuth: true },
  },
  { path: '/c/:shareId', name: 'share', component: ShareView, meta: { title: '分享清单' } },

  // —— 认证 ——
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录' } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: '注册' } },

  // —— 管理员后台（动态 import，按需加载）——
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/views/admin/AdminLogin.vue'),
    meta: { title: '管理员登录' },
  },
  {
    path: '/admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/AdminDashboard.vue'),
        meta: { title: '数据概览' },
      },
      {
        path: 'teas',
        name: 'admin-teas',
        component: () => import('@/views/admin/AdminTeas.vue'),
        meta: { title: '茶品管理' },
      },
      {
        path: 'teas/new',
        name: 'admin-tea-new',
        component: () => import('@/views/admin/AdminTeaEdit.vue'),
        meta: { title: '新增茶品' },
      },
      {
        path: 'teas/:id/edit',
        name: 'admin-tea-edit',
        component: () => import('@/views/admin/AdminTeaEdit.vue'),
        meta: { title: '编辑茶品' },
      },
    ],
  },

  // —— 404 ——
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0 }
  },
})

// —— 全局路由守卫 ——
// 前端守卫仅做体验跳转，不构成安全边界（SECURITY S-14）；
// 真正的权限控制由后端 get_current_user / get_admin_user 兜底。
router.beforeEach((to) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    return { name: 'admin-login' }
  }

  // 更新页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} | 茶·图鉴`
  }
})

export default router
