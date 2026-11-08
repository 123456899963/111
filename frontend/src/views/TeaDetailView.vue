<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import CategoryTag from '@/components/CategoryTag.vue'
import TeaCard from '@/components/TeaCard.vue'
import FavoriteButton from '@/components/FavoriteButton.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import { getHotTeas, getTeaDetail, getTeaList } from '@/api/teas'
import { getFavoriteStatus } from '@/api/favorites'
import { clearPendingAction, loadPendingAction, savePendingAction } from '@/utils/pendingAction'
import type { Tea, TeaListItem } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toast = useToastStore()

type PageState = 'loading' | 'ready' | 'offline' | 'notfound' | 'error'

const state = ref<PageState>('loading')
const tea = ref<Tea | null>(null)
const related = ref<TeaListItem[]>([])
const fallbackHot = ref<TeaListItem[]>([])
const errorMessage = ref('')
const imageFailed = ref(false)
const favoriteCount = ref(0)

const hasImage = computed(() => !!tea.value?.main_image_url && !imageFailed.value)

const tips = computed(() => {
  const item = tea.value
  if (!item) return []
  return [
    { icon: '📜', title: '历史文化', text: item.tips_history },
    { icon: '👥', title: '适合人群', text: item.tips_suitable },
    { icon: '⚠️', title: '常见误区', text: item.tips_misconception },
    { icon: '✨', title: '官方备注', text: item.tips_official_note },
  ].filter((tip) => !!tip.text && tip.text.trim())
})

const brewItems = computed(() => {
  const item = tea.value
  if (!item) return []
  return [
    { icon: '🌡️', label: '水温', value: item.water_temp != null ? `${item.water_temp}℃` : '—' },
    { icon: '🫖', label: '投茶量', value: item.tea_amount != null ? `${item.tea_amount}g` : '—' },
    { icon: '⏱️', label: '浸泡时间', value: item.brew_time != null ? `${item.brew_time}s` : '—' },
  ]
})

const hasBrew = computed(
  () =>
    tea.value != null &&
    (tea.value.water_temp != null || tea.value.tea_amount != null || tea.value.brew_time != null),
)

const favoriteText = computed(() => favoriteCount.value.toLocaleString('zh-CN'))

watch(
  () => route.params.id,
  () => void load(),
  { immediate: true },
)

onMounted(() => {
  void replayPendingAction()
})

function getErrorCode(err: unknown): number | undefined {
  return (err as { response?: { data?: { code?: number } } }).response?.data?.code
}

async function load() {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const id = Number.parseInt(raw ?? '', 10)

  tea.value = null
  related.value = []
  fallbackHot.value = []
  errorMessage.value = ''
  imageFailed.value = false

  if (!Number.isFinite(id) || id < 1) {
    state.value = 'notfound'
    void loadFallbackHot()
    return
  }

  state.value = 'loading'
  try {
    const res = await getTeaDetail(id)
    tea.value = res.data
    if (!tea.value) {
      state.value = 'notfound'
      void loadFallbackHot()
      return
    }
    favoriteCount.value = res.data.favorite_count
    state.value = 'ready'
    void loadRelated(tea.value.id, tea.value.category)
  } catch (err) {
    const code = getErrorCode(err)
    if (code === 40401) {
      // 下架茶品：API 不返回茶类，无法给出同类推荐，改用热门推荐引导（见 build-log 口径）
      state.value = 'offline'
    } else if (code === 40400) {
      state.value = 'notfound'
    } else {
      state.value = 'error'
      errorMessage.value = err instanceof Error ? err.message : '加载失败'
    }
    void loadFallbackHot()
  }
}

async function loadRelated(id: number, category: Tea['category']) {
  try {
    const res = await getTeaList({
      category,
      page: 1,
      page_size: 6,
      sort: 'favorite',
    })
    related.value = (res.data?.items ?? []).filter((item) => item.id !== id).slice(0, 4)
  } catch {
    related.value = []
  }
}

async function loadFallbackHot() {
  if (fallbackHot.value.length) return
  try {
    const res = await getHotTeas(3)
    fallbackHot.value = res.data ?? []
  } catch {
    fallbackHot.value = []
  }
}

/** 写笔记：必须已收藏，否则后端 40430；前端只做体验提示 */
async function openNoteEditor(teaId: number) {
  try {
    const res = await getFavoriteStatus(teaId)
    if (!res.data.is_favorited) {
      toast.info('请先收藏该茶品，再写品鉴笔记')
      return
    }
    void router.push({ name: 'my-list', query: { note: String(teaId) } })
  } catch {
    // 错误提示已由请求拦截器统一处理
  }
}

async function onNoteAction() {
  if (!tea.value) return
  if (!userStore.isLoggedIn) {
    savePendingAction({ type: 'note', teaId: tea.value.id, path: route.fullPath })
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  await openNoteEditor(tea.value.id)
}

/** 分享入口在我的清单页 */
function onShareAction() {
  if (!userStore.isLoggedIn) {
    if (tea.value) {
      savePendingAction({ type: 'share', teaId: tea.value.id, path: route.fullPath })
    }
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  void router.push({ name: 'my-list', query: { share: '1' } })
}

/** 登录后回到本页时，继续执行登录前被中断的笔记/分享动作 */
async function replayPendingAction() {
  const pending = loadPendingAction()
  if (!pending || !userStore.isLoggedIn || pending.path !== route.fullPath) return
  clearPendingAction()
  if (pending.type === 'note') {
    await openNoteEditor(pending.teaId)
    return
  }
  void router.push({ name: 'my-list', query: { share: '1' } })
}

function retry() {
  void load()
}
</script>

<template>
  <AppHeader />

  <main class="detail-page">
    <div class="container">
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/">首页</RouterLink>
        <span class="breadcrumb__sep">›</span>
        <RouterLink to="/teas">茶品列表</RouterLink>
        <template v-if="tea">
          <span class="breadcrumb__sep">›</span>
          <span class="breadcrumb__current">{{ tea.name }}</span>
        </template>
      </nav>

      <!-- 骨架屏 -->
      <div v-if="state === 'loading'" class="detail-skeleton" aria-hidden="true">
        <div class="skeleton detail-skeleton__image"></div>
        <div class="detail-skeleton__right">
          <div class="skeleton skeleton__line skeleton__line--title"></div>
          <div class="skeleton skeleton__line"></div>
          <div class="skeleton skeleton__line" style="width: 40%"></div>
        </div>
      </div>

      <!-- 正文 -->
      <article v-else-if="state === 'ready' && tea" class="detail-content">
        <section class="detail-header">
          <div class="detail-header__image-wrap">
            <img
              v-if="hasImage"
              class="detail-header__image"
              :src="tea.main_image_url as string"
              :alt="tea.name"
              @error="imageFailed = true"
            />
            <div
              v-else
              class="detail-header__image detail-header__image--placeholder"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.5c1 1.66.6 6-2 9-2 2.4-6.2 3-6.2 3zM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
                />
              </svg>
            </div>
            <CategoryTag class="detail-header__category-tag" :category="tea.category" clickable />
          </div>

          <div class="detail-header__info">
            <div class="detail-header__meta-top">
              <span v-if="tea.season">{{ tea.season }}</span>
              <span>♡ {{ favoriteText }} 人收藏</span>
            </div>
            <h1 class="detail-header__name">{{ tea.name }}</h1>
            <p class="detail-header__origin">{{ tea.origin }}</p>

            <div v-if="hasBrew" class="brew-card">
              <h3 class="brew-card__title">冲泡参考</h3>
              <div class="brew-card__grid">
                <div v-for="item in brewItems" :key="item.label" class="brew-card__item">
                  <span class="brew-card__icon">{{ item.icon }}</span>
                  <span class="brew-card__label">{{ item.label }}</span>
                  <span class="brew-card__value">{{ item.value }}</span>
                </div>
              </div>
            </div>

            <div class="detail-header__actions">
              <FavoriteButton
                variant="primary"
                :tea-id="tea.id"
                :count="favoriteCount"
                @change="favoriteCount = $event"
              />
              <button type="button" class="btn btn--secondary" @click="onNoteAction">
                ✏️ 写品鉴笔记
              </button>
              <button type="button" class="btn btn--ghost" @click="onShareAction">
                ↗️ 分享清单
              </button>
            </div>
          </div>
        </section>

        <!-- 四大感官 -->
        <section class="detail-section">
          <h2 class="detail-section__title">品鉴特征</h2>
          <div class="detail-senses">
            <div class="sense-card">
              <div class="sense-card__icon">🫛</div>
              <h4 class="sense-card__label">外形</h4>
              <p class="sense-card__text">{{ tea.shape_desc }}</p>
            </div>
            <div class="sense-card">
              <div class="sense-card__icon">🍶</div>
              <h4 class="sense-card__label">汤色</h4>
              <p class="sense-card__text">{{ tea.soup_desc }}</p>
            </div>
            <div class="sense-card">
              <div class="sense-card__icon">🌿</div>
              <h4 class="sense-card__label">香气</h4>
              <p class="sense-card__text">{{ tea.aroma_desc }}</p>
            </div>
            <div class="sense-card">
              <div class="sense-card__icon">👅</div>
              <h4 class="sense-card__label">滋味</h4>
              <p class="sense-card__text">{{ tea.taste_desc }}</p>
            </div>
          </div>
        </section>

        <!-- 小贴士（空内容整块隐藏；全部为空则整段隐藏） -->
        <section v-if="tips.length" class="detail-section">
          <h2 class="detail-section__title">茶小知识</h2>
          <div class="detail-tips">
            <div v-for="tip in tips" :key="tip.title" class="tip-card">
              <div class="tip-card__icon">{{ tip.icon }}</div>
              <div class="tip-card__body">
                <h4 class="tip-card__title">{{ tip.title }}</h4>
                <p class="tip-card__text">{{ tip.text }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 同类推荐 -->
        <section v-if="related.length" class="detail-section">
          <h2 class="detail-section__title">同属一类 · 你可能也喜欢</h2>
          <div class="related-grid">
            <TeaCard v-for="item in related" :key="item.id" :tea="item" />
          </div>
        </section>
      </article>

      <!-- 下架 / 不存在 / 加载失败 -->
      <div v-else class="detail-state">
        <div class="detail-state__icon">🫖</div>
        <h2 class="detail-state__title">
          <template v-if="state === 'offline'">这款茶已下架</template>
          <template v-else-if="state === 'notfound'">这款茶暂时找不到了</template>
          <template v-else>加载失败</template>
        </h2>
        <p class="detail-state__desc">
          <template v-if="state === 'offline'">它可能已下架，暂时无法查看详情</template>
          <template v-else-if="state === 'notfound'">它可能已下架，或者页面链接有误</template>
          <template v-else>{{ errorMessage }}</template>
        </p>
        <div class="detail-state__actions">
          <button v-if="state === 'error'" type="button" class="btn btn--secondary" @click="retry">
            重新加载
          </button>
          <RouterLink class="btn btn--secondary" to="/teas">浏览茶品列表</RouterLink>
          <RouterLink class="btn btn--ghost" to="/">回首页</RouterLink>
        </div>

        <div v-if="fallbackHot.length && state !== 'error'" class="detail-state__suggest">
          <TeaCard v-for="item in fallbackHot" :key="item.id" :tea="item" compact />
        </div>
      </div>
    </div>
  </main>

  <AppFooter />
</template>

<style scoped>
.detail-page {
  padding-top: 64px;
  padding-bottom: 48px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}

@media (max-width: 1023px) {
  .container {
    padding: 0 24px;
  }
}

@media (max-width: 767px) {
  .detail-page {
    padding-top: 56px;
  }
  .container {
    padding: 0 16px;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-small);
  color: var(--color-text-muted);
  padding: 8px 0 20px;
}

.breadcrumb__sep {
  color: var(--color-border-dark);
}

.breadcrumb__current {
  color: var(--color-text-primary);
}

/* 骨架屏 */
.detail-skeleton {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  padding-top: 20px;
}

@media (max-width: 767px) {
  .detail-skeleton {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

.detail-skeleton__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-lg);
}

.detail-skeleton__right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 20px;
}

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
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.skeleton__line {
  height: 24px;
  border-radius: var(--radius-sm);
}

.skeleton__line--title {
  height: 36px;
  width: 60%;
}

/* 头部 */
.detail-header {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 48px;
  padding: 20px 0 48px;
}

@media (max-width: 767px) {
  .detail-header {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

.detail-header__image-wrap {
  position: relative;
}

.detail-header__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-lg);
  object-fit: cover;
  background: var(--color-bg-muted);
}

.detail-header__image--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.detail-header__image--placeholder svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.detail-header__category-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  backdrop-filter: blur(4px);
}

.detail-header__info {
  display: flex;
  flex-direction: column;
}

.detail-header__meta-top {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: var(--text-small);
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.detail-header__name {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 12px;
  line-height: 1.3;
}

.detail-header__origin {
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  margin: 0 0 24px;
}

/* 冲泡参考 */
.brew-card {
  background: var(--color-bg-muted);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  margin-bottom: 24px;
}

.brew-card__title {
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 16px;
}

.brew-card__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 480px) {
  .brew-card__grid {
    grid-template-columns: 1fr;
  }
}

.brew-card__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.brew-card__icon {
  font-size: 20px;
}

.brew-card__label {
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}

.brew-card__value {
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--color-primary-dark);
  font-variant-numeric: tabular-nums;
}

.detail-header__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 通用 section */
.detail-section {
  padding: 32px 0;
  border-top: 1px solid var(--color-border);
}

.detail-section__title {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 24px;
}

/* 四大感官 */
.detail-senses {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1023px) {
  .detail-senses {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .detail-senses {
    grid-template-columns: 1fr;
  }
}

.sense-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
}

.sense-card__icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.sense-card__label {
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
}

.sense-card__text {
  font-size: var(--text-body);
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.7;
}

/* 小贴士 */
.detail-tips {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 639px) {
  .detail-tips {
    grid-template-columns: 1fr;
  }
}

.tip-card {
  display: flex;
  gap: 16px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
}

.tip-card__icon {
  font-size: 24px;
  flex-shrink: 0;
}

.tip-card__body {
  flex: 1;
}

.tip-card__title {
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--color-primary-dark);
  margin: 0 0 8px;
}

.tip-card__text {
  font-size: var(--text-body);
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.7;
}

/* 同类推荐 */
.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1023px) {
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 639px) {
  .related-grid {
    grid-template-columns: 1fr;
  }
}

/* 下架 / 不存在 */
.detail-state {
  text-align: center;
  padding: 64px 24px;
}

.detail-state__icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.detail-state__title {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  color: var(--color-text-secondary);
  margin: 0 0 8px;
}

.detail-state__desc {
  font-size: var(--text-small);
  color: var(--color-text-muted);
  margin: 0 0 24px;
}

.detail-state__actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.detail-state__suggest {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 560px;
  margin: 40px auto 0;
}

@media (max-width: 639px) {
  .detail-state__suggest {
    grid-template-columns: 1fr;
  }
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 24px;
  border-radius: var(--radius-full);
  font-size: var(--text-body);
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
  white-space: nowrap;
}

.btn--primary {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.btn--primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn--secondary {
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}

.btn--secondary:hover {
  background: var(--color-bg-muted);
}

.btn--ghost {
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.btn--ghost:hover {
  background: var(--color-bg-muted);
}
</style>
