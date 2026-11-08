<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  createAdminTea,
  getAdminTea,
  toggleAdminTea,
  updateAdminTea,
  updateAdminTips,
  uploadAdminImage,
} from '@/api/admin'
import { CATEGORY_LABELS, TEA_CATEGORIES, TEA_SEASONS } from '@/utils/teaQuery'
import type { AdminTeaPayload, AdminTeaCreatePayload, Tea, TeaCategory } from '@/types'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const teaId = computed(() => Number(route.params.id))

const FERMENTATION_OPTIONS = ['不发酵', '微发酵', '半发酵', '全发酵', '后发酵']

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const formRef = ref<FormInstance>()

const teaForm = reactive({
  name: '',
  category: 'green' as TeaCategory,
  origin: '',
  season: '' as string,
  fermentation: '' as string,
  price_range: '',
  representative_variety: '',
  shape_desc: '',
  soup_desc: '',
  aroma_desc: '',
  taste_desc: '',
  water_temp: 85,
  tea_amount: 3,
  brew_time: 90,
  main_image_url: '',
  is_active: true,
  tips_history: '',
  tips_suitable: '',
  tips_misconception: '',
  tips_official_note: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入茶名（1-100 字）', trigger: 'blur' }],
  category: [{ required: true, message: '请选择茶类', trigger: 'change' }],
  origin: [{ required: true, message: '请输入产地', trigger: 'blur' }],
  shape_desc: [{ required: true, message: '请填写外形描述', trigger: 'blur' }],
  soup_desc: [{ required: true, message: '请填写汤色描述', trigger: 'blur' }],
  aroma_desc: [{ required: true, message: '请填写香气描述', trigger: 'blur' }],
  taste_desc: [{ required: true, message: '请填写滋味描述', trigger: 'blur' }],
  water_temp: [{ required: true, message: '请填写水温', trigger: 'change' }],
  tea_amount: [{ required: true, message: '请填写投茶量', trigger: 'change' }],
  brew_time: [{ required: true, message: '请填写冲泡时间', trigger: 'change' }],
  main_image_url: [{ required: true, message: '请上传或填写主图地址', trigger: 'blur' }],
}

function nullableText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}

function fillForm(tea: Tea) {
  teaForm.name = tea.name
  teaForm.category = tea.category
  teaForm.origin = tea.origin
  teaForm.season = tea.season ?? ''
  teaForm.fermentation = tea.fermentation ?? ''
  teaForm.price_range = tea.price_range ?? ''
  teaForm.representative_variety = tea.representative_variety ?? ''
  teaForm.shape_desc = tea.shape_desc
  teaForm.soup_desc = tea.soup_desc
  teaForm.aroma_desc = tea.aroma_desc
  teaForm.taste_desc = tea.taste_desc
  teaForm.water_temp = tea.water_temp ?? 85
  teaForm.tea_amount = tea.tea_amount ?? 3
  teaForm.brew_time = tea.brew_time ?? 90
  teaForm.main_image_url = tea.main_image_url ?? ''
  teaForm.is_active = tea.is_active
  teaForm.tips_history = tea.tips_history ?? ''
  teaForm.tips_suitable = tea.tips_suitable ?? ''
  teaForm.tips_misconception = tea.tips_misconception ?? ''
  teaForm.tips_official_note = tea.tips_official_note ?? ''
}

async function loadDetail() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await getAdminTea(teaId.value)
    fillForm(res.data)
  } finally {
    loading.value = false
  }
}

function buildPayload(): AdminTeaPayload {
  return {
    name: teaForm.name.trim(),
    category: teaForm.category,
    origin: teaForm.origin.trim(),
    season: nullableText(teaForm.season),
    fermentation: nullableText(teaForm.fermentation),
    price_range: nullableText(teaForm.price_range),
    representative_variety: nullableText(teaForm.representative_variety),
    shape_desc: teaForm.shape_desc.trim(),
    soup_desc: teaForm.soup_desc.trim(),
    aroma_desc: teaForm.aroma_desc.trim(),
    taste_desc: teaForm.taste_desc.trim(),
    water_temp: teaForm.water_temp,
    tea_amount: teaForm.tea_amount,
    brew_time: teaForm.brew_time,
    main_image_url: teaForm.main_image_url.trim(),
  }
}

function buildTips() {
  return {
    tips_history: nullableText(teaForm.tips_history),
    tips_suitable: nullableText(teaForm.tips_suitable),
    tips_misconception: nullableText(teaForm.tips_misconception),
    tips_official_note: nullableText(teaForm.tips_official_note),
  }
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    if (isEdit.value) {
      await updateAdminTea(teaId.value, buildPayload())
      await updateAdminTips(teaId.value, buildTips())
      ElMessage.success('茶品信息与小贴士已保存')
      await loadDetail()
    } else {
      const payload: AdminTeaCreatePayload = { ...buildPayload(), ...buildTips() }
      await createAdminTea(payload)
      ElMessage.success('新增茶品成功')
      router.push({ name: 'admin-teas' })
    }
  } catch {
    // 错误提示由 request 拦截器统一处理
  } finally {
    saving.value = false
  }
}

async function handleToggle() {
  const direction = teaForm.is_active ? '下架' : '上架'
  try {
    await ElMessageBox.confirm(
      `确定要${direction}该茶品吗？${teaForm.is_active ? '下架后前台不再展示，收藏与分享记录保留。' : '上架后前台立即可见。'}`,
      `${direction}确认`,
      { type: 'warning', confirmButtonText: `确认${direction}`, cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  const res = await toggleAdminTea(teaId.value)
  teaForm.is_active = res.data.is_active
  ElMessage.success(`已${teaForm.is_active ? '上架' : '下架'}`)
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('仅支持 JPEG / PNG / WebP 图片')
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5 MB')
    input.value = ''
    return
  }

  uploading.value = true
  try {
    const res = await uploadAdminImage(file)
    teaForm.main_image_url = res.data.url
    ElMessage.success('图片上传成功')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function triggerFileInput() {
  document.getElementById('tea-image-input')?.click()
}

onMounted(loadDetail)
</script>

<template>
  <div v-loading="loading">
    <div class="page-head">
      <div>
        <h2 class="text-h2">{{ isEdit ? '编辑茶品' : '新增茶品' }}</h2>
        <p class="text-small text-secondary">
          {{ isEdit ? 'PUT 全量保存；小贴士留空表示清空，不做审核流程。' : '保存后立即上架生效。' }}
        </p>
      </div>
      <div class="head-actions">
        <el-tag v-if="isEdit" :type="teaForm.is_active ? 'success' : 'info'">
          {{ teaForm.is_active ? '已上架' : '已下架' }}
        </el-tag>
        <el-button v-if="isEdit" type="warning" plain @click="handleToggle">
          {{ teaForm.is_active ? '下架' : '上架' }}
        </el-button>
        <el-button @click="router.push({ name: 'admin-teas' })">返回列表</el-button>
      </div>
    </div>

    <el-form ref="formRef" :model="teaForm" :rules="rules" label-width="96px" class="tea-form">
      <section class="form-section">
        <h3 class="text-h3 section-title">基本信息</h3>
        <div class="form-grid">
          <el-form-item label="茶名" prop="name">
            <el-input v-model="teaForm.name" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="茶类" prop="category">
            <el-select v-model="teaForm.category" class="full-width">
              <el-option
                v-for="category in TEA_CATEGORIES"
                :key="category"
                :label="CATEGORY_LABELS[category]"
                :value="category"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="产地" prop="origin">
            <el-input
              v-model="teaForm.origin"
              maxlength="200"
              placeholder="如：浙江 杭州 西湖狮峰"
            />
          </el-form-item>
          <el-form-item label="季节">
            <el-select v-model="teaForm.season" clearable placeholder="可不填" class="full-width">
              <el-option
                v-for="season in TEA_SEASONS"
                :key="season"
                :label="season"
                :value="season"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="发酵程度">
            <el-select
              v-model="teaForm.fermentation"
              clearable
              placeholder="可不填"
              class="full-width"
            >
              <el-option
                v-for="item in FERMENTATION_OPTIONS"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="价格档位">
            <el-input
              v-model="teaForm.price_range"
              maxlength="32"
              placeholder="如：100-300元/50g"
            />
          </el-form-item>
          <el-form-item label="代表品种">
            <el-input v-model="teaForm.representative_variety" maxlength="100" />
          </el-form-item>
          <el-form-item label="主图" prop="main_image_url">
            <div class="image-field">
              <el-input
                v-model="teaForm.main_image_url"
                maxlength="500"
                placeholder="图片地址，如 /uploads/ 开头或 https 链接"
              />
              <el-button :loading="uploading" @click="triggerFileInput">上传图片</el-button>
              <input
                id="tea-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="file-input"
                @change="onFileChange"
              />
            </div>
            <div v-if="teaForm.main_image_url" class="image-preview">
              <img :src="teaForm.main_image_url" alt="主图预览" />
            </div>
          </el-form-item>
        </div>
      </section>

      <section class="form-section">
        <h3 class="text-h3 section-title">感官描述</h3>
        <div class="form-grid">
          <el-form-item label="外形" prop="shape_desc">
            <el-input v-model="teaForm.shape_desc" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="汤色" prop="soup_desc">
            <el-input v-model="teaForm.soup_desc" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="香气" prop="aroma_desc">
            <el-input v-model="teaForm.aroma_desc" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="滋味" prop="taste_desc">
            <el-input v-model="teaForm.taste_desc" type="textarea" :rows="3" />
          </el-form-item>
        </div>
      </section>

      <section class="form-section">
        <h3 class="text-h3 section-title">冲泡参考</h3>
        <div class="form-grid three">
          <el-form-item label="水温（℃）" prop="water_temp">
            <el-input-number
              v-model="teaForm.water_temp"
              :min="70"
              :max="100"
              :step="0.1"
              :precision="1"
              class="full-width"
            />
          </el-form-item>
          <el-form-item label="投茶量（g）" prop="tea_amount">
            <el-input-number
              v-model="teaForm.tea_amount"
              :min="0.1"
              :max="999.9"
              :step="0.1"
              :precision="1"
              class="full-width"
            />
          </el-form-item>
          <el-form-item label="时间（秒）" prop="brew_time">
            <el-input-number
              v-model="teaForm.brew_time"
              :min="0.1"
              :max="999.9"
              :step="0.1"
              :precision="1"
              class="full-width"
            />
          </el-form-item>
        </div>
      </section>

      <section class="form-section">
        <h3 class="text-h3 section-title">官方小贴士</h3>
        <p class="text-small text-secondary section-hint">
          选填；留空保存后该区块清空，不会影响茶品信息。
        </p>
        <div class="form-grid">
          <el-form-item label="历史典故">
            <el-input v-model="teaForm.tips_history" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="适合人群">
            <el-input v-model="teaForm.tips_suitable" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="冲泡误区">
            <el-input v-model="teaForm.tips_misconception" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="官方品鉴">
            <el-input v-model="teaForm.tips_official_note" type="textarea" :rows="3" />
          </el-form-item>
        </div>
      </section>

      <div class="form-actions">
        <el-button @click="router.push({ name: 'admin-teas' })">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">
          {{ isEdit ? '保存修改' : '创建茶品' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}
.page-head h2 {
  margin: 0 0 4px;
}
.page-head p {
  margin: 0;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tea-form {
  max-width: 1100px;
}
.form-section {
  margin-bottom: 18px;
  padding: 20px 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}
.section-title {
  margin: 0 0 16px;
}
.section-hint {
  margin: -8px 0 14px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 24px;
}
.form-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.full-width {
  width: 100%;
}
.image-field {
  display: flex;
  gap: 8px;
  width: 100%;
}
.file-input {
  display: none;
}
.image-preview {
  margin-top: 10px;
}
.image-preview img {
  max-width: 220px;
  max-height: 150px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  object-fit: cover;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 4px 0 24px;
}
</style>
