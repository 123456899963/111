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
  created_at: string // ISO8601 UTC
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

/** 茶品详情（API_CONTRACT §2.3 TeaDetail） */
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
  is_active: boolean
  favorite_count: number

  tips_history?: string | null
  tips_suitable?: string | null
  tips_misconception?: string | null
  tips_official_note?: string | null

  created_at: string // ISO8601 UTC 带 Z
  updated_at: string
}

/** 公开列表卡片（API_CONTRACT §2.2 TeaListItem） */
export interface TeaListItem {
  id: number
  name: string
  category: TeaCategory
  origin: string
  season?: string | null
  main_image_url?: string | null
  favorite_count: number
}

/** 茶品列表分页结构（API_CONTRACT §1.6） */
export interface TeaListData {
  items: TeaListItem[]
  total: number
  page: number
  page_size: number
}

/** 六大茶类计数（API_CONTRACT §2.3.1） */
export interface CategoryCount {
  category: TeaCategory
  count: number
}

/** 产地（省级）计数（API_CONTRACT §2.3.1） */
export interface OriginCount {
  origin: string
  count: number
}

export type TeaSort = 'newest' | 'favorite'

export interface TeaListParams {
  category?: string // 逗号分隔多选
  origin?: string
  season?: string
  sort?: TeaSort
  keyword?: string
  page?: number
  page_size?: number
}

// ===== 分享 =====
export interface ShareToken {
  token: string
  title: string
}
