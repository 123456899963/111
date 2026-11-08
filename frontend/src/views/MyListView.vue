<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import CategoryTag from '@/components/CategoryTag.vue'
import NoteEditor from '@/components/NoteEditor.vue'
import SharePanel from '@/components/SharePanel.vue'
import { getMyList, updateListTitle } from '@/api/lists'
import { removeFavorite } from '@/api/favorites'
import { isValidListTitle } from '@/utils/list'
import { useToastStore } from '@/stores/toast'
import type { ListData, ListItem, ListShareBrief } from '@/types'

const route = useRoute()
const toast = useToastStore()

type PageState = 'loading' | 'ready' | 'error'

const state = ref<PageState>('loading')
const list = ref<ListData | null>(null)
const errorMessage = ref('')

const editingTitle = ref(false)
const titleDraft = ref('')
const savingTitle = ref(false)

const noteOpen = ref(false)
const noteTarget = ref<ListItem | null>(null)
const shareOpen = ref(false)
const removingId = ref<number | null>(null)

const items = computed(() => list.value?.items ?? [])
const noteCount = computed(() => items.value.filter((item) => !!item.tasting_note).length)
const unavailableCount = computed(() => items.value.filter((item) => !item.is_available).length)

onMounted(() => {
  void load()
})

async function load() {
  state.value = 'loading'
  errorMessage.value = ''
  try {
    const res = await getMyList()
    list.value = res.data
    state.value = 'ready'
    applyQueryActions()
  } catch (err) {
    state.value = 'error'
    errorMessage.value = err instanceof Error ? err.message : '清单加载失败'
  }
}

function applyQueryActions() {
  const noteRaw = route.query.note
  const noteId = Number(Array.isArray(noteRaw) ? noteRaw[0] : noteRaw)
  if (Number.isFinite(noteId) && noteId > 0) {
    const target = items.value.find((item) => item.tea_id === noteId)
    if (target) openNote(target)
  }
  if (route.query.share === '1') shareOpen.value = true
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function startEditTitle() {
  if (!list.value) return
  titleDraft.value = list.value.title
  editingTitle.value = true
}

function cancelEditTitle() {
  editingTitle.value = false
  titleDraft.value = ''
}

async function saveTitle() {
  if (!list.value || savingTitle.value) return
  const normalized = titleDraft.value.trim()
  if (!isValidListTitle(normalized)) {
    toast.warn('清单标题需为 2–20 个字符')
    return
  }
  savingTitle.value = true
  try {
    const res = await updateListTitle(normalized)
    list.value.title = res.data.title
    list.value.updated_at = res.data.updated_at
    editingTitle.value = false
    toast.success('清单标题已更新')
  } catch {
    // 统一错误提示由请求拦截器处理
  } finally {
    savingTitle.value = false
  }
}

function openNote(item: ListItem) {
  noteTarget.value = item
  noteOpen.value = true
}

function onNoteSaved(note: string | null) {
  const target = noteTarget.value
  if (!target || !list.value) return
  const item = list.value.items.find((row) => row.tea_id === target.tea_id)
  if (item) item.tasting_note = note
}

async function removeItem(item: ListItem) {
  if (!list.value || removingId.value !== null) return
  const confirmed = window.confirm(`确定将“${item.name}”移出我的清单吗？`)
  if (!confirmed) return

  removingId.value = item.tea_id
  try {
    await removeFavorite(item.tea_id)
    list.value.items = list.value.items.filter((row) => row.tea_id !== item.tea_id)
    list.value.tea_count = list.value.items.length
    if (noteTarget.value?.tea_id === item.tea_id) {
      noteOpen.value = false
      noteTarget.value = null
    }
    toast.success('已移出我的清单')
  } catch {
    // 统一错误提示由请求拦截器处理
  } finally {
    removingId.value = null
  }
}

function onShareUpdate(share: ListShareBrief | null) {
  if (!list.value) return
  list.value.share = share
}
</script>

<template>
  <AppHeader />

  <main class="my-page">
    <div class="container">
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/">首页</RouterLink>
        <span class="breadcrumb__sep">›</span>
        <span class="breadcrumb__current">我的清单</span>
      </nav>

      <!-- 头部 -->
      <section v-if="state === 'loading'" class="list-hero list-hero--skeleton" aria-hidden="true">
        <div class="skeleton skeleton--title"></div>
        <div class="skeleton skeleton--line"></div>
      </section>

      <section v-else-if="state === 'ready' && list" class="list-hero">
        <div class="list-hero__main">
          <p class="list-hero__eyebrow">我的清单</p>

          <div v-if="!editingTitle" class="list-hero__title-row">
            <h1 class="list-hero__title">{{ list.title }}</h1>
            <button type="button" class="icon-btn" title="编辑标题" @click="startEditTitle">
              ✏️
            </button>
          </div>

          <form v-else class="title-form" @submit.prevent="saveTitle">
            <input
              v-model="titleDraft"
              class="title-form__input"
              maxlength="20"
              aria-label="清单标题"
              placeholder="2–20 个字符"
            />
            <button type="submit" class="btn btn--primary" :disabled="savingTitle">
              {{ savingTitle ? '保存中…' : '保存' }}
            </button>
            <button type="button" class="btn btn--ghost" @click="cancelEditTitle">取消</button>
          </form>

          <p class="list-hero__stats">
            共 {{ list.tea_count }} 款茶
            <span class="list-hero__dot">·</span>
            {{ noteCount }} 条私密笔记
            <template v-if="unavailableCount">
              <span class="list-hero__dot">·</span>
              {{ unavailableCount }} 款已下架
            </template>
          </p>
        </div>

        <div class="list-hero__actions">
          <button type="button" class="btn btn--primary" @click="shareOpen = true">
            ↗️ 分享清单
          </button>
          <RouterLink class="btn btn--secondary" to="/teas">去发现好茶</RouterLink>
        </div>
      </section>

      <!-- 错误 -->
      <div v-else class="page-state">
        <div class="page-state__icon">🫖</div>
        <h2 class="page-state__title">清单加载失败</h2>
        <p class="page-state__desc">{{ errorMessage || '请稍后重试' }}</p>
        <button type="button" class="btn btn--primary" @click="load">重新加载</button>
      </div>

      <!-- 空状态 -->
      <div v-if="state === 'ready' && list && !items.length" class="page-state">
        <div class="page-state__icon">🍃</div>
        <h2 class="page-state__title">清单还是空的</h2>
        <p class="page-state__desc">去茶品列表逛逛，收藏喜欢的茶，开启你的品鉴记录。</p>
        <RouterLink class="btn btn--primary" to="/teas">浏览茶品列表</RouterLink>
      </div>

      <!-- 条目 -->
      <ul v-if="state === 'ready' && items.length" class="list-items">
        <li
          v-for="item in items"
          :key="item.tea_id"
          class="list-item"
          :class="{ 'list-item--unavailable': !item.is_available }"
        >
          <RouterLink
            v-if="item.is_available"
            class="list-item__image-link"
            :to="{ name: 'tea-detail', params: { id: item.tea_id } }"
          >
            <img
              v-if="item.main_image_url"
              class="list-item__image"
              :src="item.main_image_url"
              :alt="item.name"
              loading="lazy"
            />
            <span v-else class="list-item__image list-item__image--placeholder" aria-hidden="true"
              >🫖</span
            >
          </RouterLink>
          <div v-else class="list-item__image-link">
            <img
              v-if="item.main_image_url"
              class="list-item__image"
              :src="item.main_image_url"
              :alt="item.name"
              loading="lazy"
            />
            <span v-else class="list-item__image list-item__image--placeholder" aria-hidden="true"
              >🫖</span
            >
            <span class="list-item__offline-badge">已下架</span>
          </div>

          <div class="list-item__body">
            <div class="list-item__title-row">
              <h3 class="list-item__name">{{ item.name }}</h3>
              <CategoryTag :category="item.category" />
            </div>
            <p class="list-item__meta">
              {{ item.origin }}
              <template v-if="item.season"> · {{ item.season }}</template>
              <template v-if="!item.is_available"> · 暂不可用</template>
            </p>

            <p v-if="item.tasting_note" class="list-item__note">
              <span class="list-item__note-label">私密笔记</span>
              {{ item.tasting_note }}
            </p>
            <p v-else class="list-item__note list-item__note--empty">还没有品鉴笔记</p>
          </div>

          <div class="list-item__side">
            <span class="list-item__date">收藏于 {{ formatDate(item.favorited_at) }}</span>
            <div class="list-item__actions">
              <button type="button" class="btn btn--tiny" @click="openNote(item)">
                {{ item.tasting_note ? '编辑笔记' : '写笔记' }}
              </button>
              <button
                type="button"
                class="btn btn--tiny btn--danger-text"
                :disabled="removingId === item.tea_id"
                @click="removeItem(item)"
              >
                {{ removingId === item.tea_id ? '移除中…' : '移除' }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </main>

  <AppFooter />

  <NoteEditor
    v-model="noteOpen"
    :tea-id="noteTarget?.tea_id ?? 0"
    :tea-name="noteTarget?.name ?? ''"
    :initial-note="noteTarget?.tasting_note ?? null"
    @saved="onNoteSaved"
  />

  <SharePanel v-model="shareOpen" :share="list?.share ?? null" @update:share="onShareUpdate" />
</template>

<style scoped>
.my-page {
  padding-top: 64px;
  padding-bottom: 48px;
  min-height: 100svh;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 32px;
}

@media (max-width: 767px) {
  .container {
    padding: 0 16px;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 20px;
  font-size: var(--text-small);
  color: var(--color-text-muted);
}

.breadcrumb__sep {
  color: var(--color-border-dark);
}

.breadcrumb__current {
  color: var(--color-text-primary);
}

/* 头部 */
.list-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: 24px;
}

.list-hero--skeleton {
  display: block;
  min-height: 140px;
}

.list-hero__eyebrow {
  margin: 0 0 6px;
  font-size: var(--text-caption);
  letter-spacing: 0.18em;
  color: var(--color-text-muted);
}

.list-hero__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.list-hero__title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  color: var(--color-text-primary);
  margin: 0;
}

.list-hero__stats {
  margin: 10px 0 0;
  font-size: var(--text-small);
  color: var(--color-text-secondary);
}

.list-hero__dot {
  margin: 0 6px;
  color: var(--color-border-dark);
}

.list-hero__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
  font-size: 13px;
}

.icon-btn:hover {
  background: var(--color-bg-muted);
}

.title-form {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.title-form__input {
  height: 42px;
  min-width: 240px;
  padding: 0 14px;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-sm);
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: var(--text-body);
}

.title-form__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* 状态 */
.page-state {
  text-align: center;
  padding: 72px 24px;
  background: var(--color-bg-surface);
  border: 1px dashed var(--color-border-dark);
  border-radius: var(--radius-lg);
}

.page-state__icon {
  font-size: 56px;
  opacity: 0.6;
  margin-bottom: 12px;
}

.page-state__title {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  color: var(--color-text-secondary);
  margin: 0 0 8px;
}

.page-state__desc {
  font-size: var(--text-small);
  color: var(--color-text-muted);
  margin: 0 0 24px;
}

/* 条目 */
.list-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-item {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 20px;
  padding: 16px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.list-item:hover {
  border-color: var(--color-border-dark);
  box-shadow: var(--shadow-card);
}

.list-item--unavailable {
  background: var(--color-bg-muted);
}

.list-item--unavailable .list-item__image {
  filter: grayscale(1);
  opacity: 0.55;
}

.list-item--unavailable .list-item__name {
  color: var(--color-text-muted);
}

.list-item__image-link {
  position: relative;
  display: block;
  width: 120px;
  height: 90px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-bg-muted);
}

.list-item__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-item__image--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--color-text-muted);
}

.list-item__offline-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(44, 36, 24, 0.75);
  color: var(--color-text-inverse);
  font-size: var(--text-caption);
}

.list-item__body {
  min-width: 0;
}

.list-item__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.list-item__name {
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.list-item__meta {
  margin: 4px 0 10px;
  font-size: var(--text-small);
  color: var(--color-text-muted);
}

.list-item__note {
  margin: 0;
  font-size: var(--text-small);
  color: var(--color-text-secondary);
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.list-item__note--empty {
  color: var(--color-text-muted);
  font-style: italic;
}

.list-item__note-label {
  display: inline-block;
  margin-right: 8px;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  background: var(--color-bg-muted);
  color: var(--color-primary-dark);
  font-size: var(--text-caption);
  font-style: normal;
}

.list-item__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.list-item__date {
  font-size: var(--text-caption);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.list-item__actions {
  display: flex;
  gap: 8px;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 20px;
  border-radius: var(--radius-full);
  font-size: var(--text-small);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn--secondary {
  background: transparent;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--color-bg-muted);
}

.btn--ghost {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
}

.btn--ghost:hover:not(:disabled) {
  background: var(--color-bg-muted);
}

.btn--tiny {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--radius-sm);
  border-color: var(--color-border-dark);
  background: transparent;
  color: var(--color-text-secondary);
}

.btn--tiny:hover:not(:disabled) {
  background: var(--color-bg-muted);
}

.btn--danger-text {
  color: var(--color-error);
}

/* 骨架屏 */
.skeleton {
  background: var(--color-bg-muted);
  border-radius: var(--radius-sm);
  position: relative;
  overflow: hidden;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    var(--color-bg-muted) 0%,
    var(--color-border) 50%,
    var(--color-bg-muted) 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.skeleton--title {
  width: 42%;
  height: 34px;
  margin-bottom: 12px;
}

.skeleton--line {
  width: 60%;
  height: 18px;
}

@media (max-width: 767px) {
  .list-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
  }

  .list-item {
    grid-template-columns: 88px 1fr;
    gap: 14px;
  }

  .list-item__image-link {
    width: 88px;
    height: 72px;
  }

  .list-item__side {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
  }
}
</style>
