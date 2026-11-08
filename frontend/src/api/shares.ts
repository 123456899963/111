/**
 * 分享接口（API_CONTRACT §4.5）
 */

import request from './request'
import type { CopyResult, ShareGenerateData, ShareRevokeData, ShareViewData } from '@/types'

interface Envelope<T> {
  code: number
  message: string
  data: T
}

/** POST /shares/generate 生成或复用分享令牌 */
export function generateShare() {
  return request.post<unknown, Envelope<ShareGenerateData>>('/shares/generate')
}

/** POST /shares/revoke/{token} 撤销分享（不可逆） */
export function revokeShare(token: string) {
  return request.post<unknown, Envelope<ShareRevokeData>>(`/shares/revoke/${token}`)
}

/** GET /shares/{token} 公开查看分享清单（游客可访问） */
export function getShareView(token: string) {
  return request.get<unknown, Envelope<ShareViewData>>(`/shares/${token}`)
}

/** POST /shares/{token}/copy 一键收藏全部 */
export function copyShare(token: string) {
  return request.post<unknown, Envelope<CopyResult>>(`/shares/${token}/copy`)
}
