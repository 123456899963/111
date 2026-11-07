import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/api/request'
import type { Tea, TeaListItem, TeaListParams } from '@/types'

/** 茶品数据 Store */
export const useTeaStore = defineStore('tea', () => {
  const list = ref<TeaListItem[]>([])
  const total = ref(0)
  const current = ref<Tea | null>(null)
  const hotList = ref<TeaListItem[]>([])
  const random = ref<Tea | null>(null)
  const loading = ref(false)

  async function fetchList(params: TeaListParams) {
    loading.value = true
    try {
      const res = await request.get('/teas', { params })
      if (res.data) {
        list.value = res.data.items
        total.value = res.data.total
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(id: number) {
    loading.value = true
    try {
      const res = await request.get(`/teas/${id}`)
      current.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function fetchHot() {
    const res = await request.get('/teas/hot')
    hotList.value = res.data || []
  }

  async function fetchRandom(excludeId?: number) {
    const res = await request.get('/teas/random', { params: { exclude_id: excludeId } })
    random.value = res.data
  }

  return {
    list,
    total,
    current,
    hotList,
    random,
    loading,
    fetchList,
    fetchDetail,
    fetchHot,
    fetchRandom,
  }
})
