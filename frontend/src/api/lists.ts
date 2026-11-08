/**
 * 清单与品鉴笔记接口（API_CONTRACT §4.4）
 */

import request from './request'
import type { ApiEnvelope, ListData, NoteUpdateData, TitleUpdateData } from '@/types'

/** GET /lists 我的默认清单（首次访问自动创建） */
export function getMyList() {
  return request.get<unknown, ApiEnvelope<ListData>>('/lists')
}

/** PUT /lists/title 修改清单标题 */
export function updateListTitle(title: string) {
  return request.put<unknown, ApiEnvelope<TitleUpdateData>>('/lists/title', { title })
}

/** PUT /lists/notes/{tea_id} 保存/清空品鉴笔记 */
export function saveTastingNote(teaId: number, content: string | null) {
  return request.put<unknown, ApiEnvelope<NoteUpdateData>>(`/lists/notes/${teaId}`, { content })
}
