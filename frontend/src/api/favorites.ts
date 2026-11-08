/**
 * 收藏接口（API_CONTRACT §4.3）
 */

import request from './request'
import type { ApiEnvelope, FavoriteState } from '@/types'

/** POST /favorites/{tea_id} 收藏（幂等） */
export function addFavorite(teaId: number) {
  return request.post<unknown, ApiEnvelope<FavoriteState>>(`/favorites/${teaId}`)
}

/** DELETE /favorites/{tea_id} 取消收藏（幂等） */
export function removeFavorite(teaId: number) {
  return request.delete<unknown, ApiEnvelope<FavoriteState>>(`/favorites/${teaId}`)
}

/** GET /favorites/{tea_id}/status 收藏状态 */
export function getFavoriteStatus(teaId: number) {
  return request.get<unknown, ApiEnvelope<FavoriteState>>(`/favorites/${teaId}/status`)
}
