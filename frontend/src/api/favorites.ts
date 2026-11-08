/**
 * 收藏接口（API_CONTRACT §4.3）
 */

import request from './request'
import type { FavoriteState } from '@/types'

interface Envelope<T> {
  code: number
  message: string
  data: T
}

/** POST /favorites/{tea_id} 收藏（幂等） */
export function addFavorite(teaId: number) {
  return request.post<unknown, Envelope<FavoriteState>>(`/favorites/${teaId}`)
}

/** DELETE /favorites/{tea_id} 取消收藏（幂等） */
export function removeFavorite(teaId: number) {
  return request.delete<unknown, Envelope<FavoriteState>>(`/favorites/${teaId}`)
}

/** GET /favorites/{tea_id}/status 收藏状态 */
export function getFavoriteStatus(teaId: number) {
  return request.get<unknown, Envelope<FavoriteState>>(`/favorites/${teaId}/status`)
}
