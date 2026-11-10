/** 我的模块接口（S15 / API_CONTRACT §4.7） */

import request from './request'
import type { ApiEnvelope, UserStats } from '@/types'

/** GET /me/stats 当前用户统计与等级（需登录） */
export function getMyStats() {
  return request.get<unknown, ApiEnvelope<UserStats>>('/me/stats')
}
