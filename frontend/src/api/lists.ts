/**
 * 清单与品鉴笔记接口（API_CONTRACT §4.4）
 */

import request from './request'
import type { ListData, NoteUpdateData, TitleUpdateData } from '@/types'

interface Envelope<T> {
  code: number
  message: string
  data: T
}

/** GET /lists 我的默认清单（首次访问自动创建） */
export function getMyList() {
  return request.get<unknown, Envelope<ListData>>('/lists')
}

/** PUT /lists/title 修改清单标题 */
export function updateListTitle(title: string) {
  return request.put<unknown, Envelope<TitleUpdateData>>('/lists/title', { title })
}

/** PUT /lists/notes/{tea_id} 保存/清空品鉴笔记 */
export function saveTastingNote(teaId: number, content: string | null) {
  return request.put<unknown, Envelope<NoteUpdateData>>(`/lists/notes/${teaId}`, { content })
}
