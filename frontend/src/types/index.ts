/**
 * 共享 TS 类型定义
 * —— 与后端 Pydantic 模型一一对应
 * —— 集中放在这里，禁止到处散落 any
 */

// ===== 通用 =====
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T | null
}

export interface PaginationParams {
  page?: number
  page_size?: number
}

// ===== 认证 =====
export interface User {
  id: number
  username: string
  role: 'user' | 'admin'
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  password: string
}

// ===== 茶品 =====
export type TeaCategory = 'green' | 'white' | 'yellow' | 'red' | 'oolong' | 'dark'

export interface Tea {
  id: number
  name: string
  category: TeaCategory
  origin: string
  season?: string | null
  fermentation?: string | null
  price_range?: string | null
  representative_variety?: string | null

  shape_desc: string
  soup_desc: string
  aroma_desc: string
  taste_desc: string

  water_temp?: number | null
  tea_amount?: number | null
  brew_time?: number | null

  main_image_url?: string | null
  favorite_count: number

  tips_history?: string | null
  tips_suitable?: string | null
  tips_misconception?: string | null
  tips_official_note?: string | null
}

export interface TeaListItem {
  id: number
  name: string
  category: TeaCategory
  origin: string
  season?: string | null
  main_image_url?: string | null
  favorite_count: number
}

export interface TeaListParams {
  category?: string // 支持逗号多选
  origin?: string
  season?: string
  sort?: 'newest' | 'favorite'
  keyword?: string
  page?: number
  page_size?: number
}

// ===== 分享 =====
export interface ShareToken {
  token: string
  title: string
}
