import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/api/request'
import type { User, LoginPayload, RegisterPayload } from '@/types'

/**
 * 用户登录态 Store
 * —— 登录状态由后端 HttpOnly Cookie 维护，前端只读；
 * —— localStorage 仅存当前用户基础信息（非敏感）。
 */
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(payload: LoginPayload) {
    loading.value = true
    try {
      const res = await request.post('/auth/login', payload)
      if (res.data) {
        user.value = { id: res.data.user_id, username: res.data.username, role: 'user' }
        localStorage.setItem('tea_user', JSON.stringify(user.value))
      }
      return res
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    loading.value = true
    try {
      const res = await request.post('/auth/register', payload)
      if (res.data) {
        user.value = { id: res.data.user_id, username: res.data.username, role: 'user' }
        localStorage.setItem('tea_user', JSON.stringify(user.value))
      }
      return res
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await request.post('/auth/logout')
    user.value = null
    localStorage.removeItem('tea_user')
  }

  /** 从 localStorage 恢复登录态（页面刷新时调用） */
  function hydrate() {
    const raw = localStorage.getItem('tea_user')
    if (raw) {
      try {
        user.value = JSON.parse(raw)
      } catch {
        localStorage.removeItem('tea_user')
      }
    }
  }

  return { user, loading, isLoggedIn, isAdmin, login, register, logout, hydrate }
})
