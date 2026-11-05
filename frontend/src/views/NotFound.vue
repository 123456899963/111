<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="page-404">
    <h1 class="text-display text-primary-dark">404</h1>
    <p class="text-secondary">页面不存在</p>
    <el-button type="primary" @click="router.replace('/')">返回首页</el-button>
  </div>
</template>

<style scoped>
.page-404 { padding: 96px 16px; text-align: center; }
</style>
