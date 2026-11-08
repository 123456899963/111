/**
 * 茶品只读接口（API_CONTRACT §4.2.1 ~ §4.2.6）
 * —— 全部对游客开放，本阶段无任何写操作。
 */

import request from './request'
import type {
  CategoryCount,
  OriginCount,
  Tea,
  TeaListData,
  TeaListItem,
  TeaListParams,
} from '@/types'

/** GET /teas 茶品列表（筛选 + 排序 + 分页） */
export function getTeaList(params: TeaListParams) {
  return request.get<unknown, { code: number; message: string; data: TeaListData }>('/teas', {
    params,
  })
}

/** GET /teas/categories 六大茶类计数（固定六项顺序） */
export function getCategories() {
  return request.get<unknown, { code: number; message: string; data: CategoryCount[] }>(
    '/teas/categories',
  )
}

/** GET /teas/origins 产地选项（省级 + 计数） */
export function getOrigins() {
  return request.get<unknown, { code: number; message: string; data: OriginCount[] }>(
    '/teas/origins',
  )
}

/** GET /teas/hot 热门推荐（limit 1-20，默认 8） */
export function getHotTeas(limit = 8) {
  return request.get<unknown, { code: number; message: string; data: TeaListItem[] }>('/teas/hot', {
    params: { limit },
  })
}

/** GET /teas/random 随机发现（exclude_id 排除当前，避免“换一批”重复） */
export function getRandomTea(excludeId?: number) {
  return request.get<unknown, { code: number; message: string; data: Tea | null }>('/teas/random', {
    params: excludeId ? { exclude_id: excludeId } : {},
  })
}

/** GET /teas/{id} 茶品详情（下架返回 40401） */
export function getTeaDetail(id: number) {
  return request.get<unknown, { code: number; message: string; data: Tea }>(`/teas/${id}`)
}
