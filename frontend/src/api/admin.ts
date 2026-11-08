/**
 * 管理员后台接口（API_CONTRACT §4.6）
 * —— 所有请求由后端 get_admin_user 鉴权；前端守卫仅做体验层
 */

import request from './request'
import type {
  AdminStatsData,
  AdminTeaCreatePayload,
  AdminTeaListData,
  AdminTeaListParams,
  AdminTeaPayload,
  AdminTipsData,
  AdminTipsPayload,
  AdminToggleData,
  AdminUploadData,
  ApiEnvelope,
  Tea,
} from '@/types'

/** GET /admin/stats 仪表盘统计 */
export function getAdminStats() {
  return request.get<unknown, ApiEnvelope<AdminStatsData>>('/admin/stats')
}

/** GET /admin/teas 后台茶品列表（含下架） */
export function getAdminTeas(params: AdminTeaListParams) {
  return request.get<unknown, ApiEnvelope<AdminTeaListData>>('/admin/teas', { params })
}

/** GET /admin/teas/{id} 后台茶品详情（下架仍可查看） */
export function getAdminTea(id: number) {
  return request.get<unknown, ApiEnvelope<Tea>>(`/admin/teas/${id}`)
}

/** POST /admin/teas 新增茶品 */
export function createAdminTea(payload: AdminTeaCreatePayload) {
  return request.post<unknown, ApiEnvelope<Tea>>('/admin/teas', payload)
}

/** PUT /admin/teas/{id} 全量编辑茶品（不含 tips_* 与 is_active） */
export function updateAdminTea(id: number, payload: AdminTeaPayload) {
  return request.put<unknown, ApiEnvelope<Tea>>(`/admin/teas/${id}`, payload)
}

/** PATCH /admin/teas/{id}/toggle 上下架 */
export function toggleAdminTea(id: number) {
  return request.patch<unknown, ApiEnvelope<AdminToggleData>>(`/admin/teas/${id}/toggle`)
}

/** PUT /admin/teas/{id}/tips 官方小贴士（省略保持 / null 清空） */
export function updateAdminTips(id: number, payload: AdminTipsPayload) {
  return request.put<unknown, ApiEnvelope<AdminTipsData>>(`/admin/teas/${id}/tips`, payload)
}

/** POST /admin/upload 图片上传（JPEG/PNG/WebP ≤ 5MB） */
export function uploadAdminImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<unknown, ApiEnvelope<AdminUploadData>>('/admin/upload', formData)
}
