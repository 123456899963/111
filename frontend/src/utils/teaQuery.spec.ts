import { describe, expect, it } from 'vitest'
import {
  buildListParams,
  defaultTeaFilterState,
  listActiveFilters,
  parseRouteQuery,
  serializeFilterState,
} from './teaQuery'
import type { TeaFilterState } from './teaQuery'

describe('parseRouteQuery', () => {
  it('解析逗号分隔的多选维度', () => {
    const state = parseRouteQuery({ category: 'green,white', origin: '浙江,福建', season: '明前' })
    expect(state.categories).toEqual(['green', 'white'])
    expect(state.origins).toEqual(['浙江', '福建'])
    expect(state.seasons).toEqual(['明前'])
  })

  it('丢弃非法茶类、非法季节与重复值', () => {
    const state = parseRouteQuery({ category: 'green,black,green', season: '明前,不明' })
    expect(state.categories).toEqual(['green'])
    expect(state.seasons).toEqual(['明前'])
  })

  it('sort 仅接受 favorite，其余回退 newest', () => {
    expect(parseRouteQuery({ sort: 'favorite' }).sort).toBe('favorite')
    expect(parseRouteQuery({ sort: 'hot' }).sort).toBe('newest')
    expect(parseRouteQuery({}).sort).toBe('newest')
  })

  it('page 非法时回退 1', () => {
    expect(parseRouteQuery({ page: '3' }).page).toBe(3)
    expect(parseRouteQuery({ page: '0' }).page).toBe(1)
    expect(parseRouteQuery({ page: '-2' }).page).toBe(1)
    expect(parseRouteQuery({ page: 'abc' }).page).toBe(1)
  })

  it('关键词去空格并截断到 50 字符', () => {
    expect(parseRouteQuery({ q: '  龙井  ' }).keyword).toBe('龙井')
    expect(parseRouteQuery({ q: 'a'.repeat(60) }).keyword).toHaveLength(50)
  })

  it('数组型 query 取第一个值', () => {
    expect(parseRouteQuery({ q: ['龙井', '白茶'] }).keyword).toBe('龙井')
  })
})

describe('serializeFilterState', () => {
  it('默认状态不产出任何参数（保持 URL 干净）', () => {
    expect(serializeFilterState(defaultTeaFilterState())).toEqual({})
  })

  it('多选维度以逗号拼接', () => {
    const state: TeaFilterState = { ...defaultTeaFilterState(), categories: ['green', 'red'] }
    expect(serializeFilterState(state)).toEqual({ category: 'green,red' })
  })

  it('非默认排序与页码写入 URL', () => {
    const state = { ...defaultTeaFilterState(), sort: 'favorite' as const, page: 2 }
    expect(serializeFilterState(state)).toEqual({ sort: 'favorite', page: '2' })
  })

  it('与 parseRouteQuery 往返一致', () => {
    const state: TeaFilterState = {
      categories: ['green', 'white'],
      origins: ['浙江'],
      seasons: ['明前'],
      keyword: '龙井',
      sort: 'favorite',
      page: 3,
    }
    expect(parseRouteQuery(serializeFilterState(state))).toEqual({
      categories: ['green', 'white'],
      origins: ['浙江'],
      seasons: ['明前'],
      keyword: '龙井',
      sort: 'favorite',
      page: 3,
    })
  })
})

describe('buildListParams', () => {
  it('默认每页 12 条并保留排序与页码', () => {
    expect(buildListParams(defaultTeaFilterState())).toEqual({
      sort: 'newest',
      page: 1,
      page_size: 12,
    })
  })

  it('关键词映射为 API 字段 keyword，空值不下发', () => {
    const params = buildListParams({
      ...defaultTeaFilterState(),
      keyword: '龙井',
    })
    expect(params.keyword).toBe('龙井')
    expect(params.category).toBeUndefined()
    expect(params.origin).toBeUndefined()
    expect(params.season).toBeUndefined()
  })

  it('多选维度以逗号拼接交给后端', () => {
    const params = buildListParams({
      ...defaultTeaFilterState(),
      categories: ['green', 'red'],
      origins: ['浙江', '福建'],
      seasons: ['明前'],
    })
    expect(params.category).toBe('green,red')
    expect(params.origin).toBe('浙江,福建')
    expect(params.season).toBe('明前')
  })
})

describe('listActiveFilters', () => {
  it('输出已选条件标签，茶类使用中文名', () => {
    const filters = listActiveFilters({
      ...defaultTeaFilterState(),
      categories: ['green'],
      origins: ['浙江'],
      seasons: ['明前'],
    })
    expect(filters).toEqual([
      { dimension: 'categories', value: 'green', label: '绿茶' },
      { dimension: 'origins', value: '浙江', label: '浙江' },
      { dimension: 'seasons', value: '明前', label: '明前' },
    ])
  })
})
