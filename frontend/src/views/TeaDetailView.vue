<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
const teaId = route.params.id
</script>

<template>
  <div class="page">
    <h2>茶品详情（ID: {{ teaId }}）</h2>
    <p class="text-secondary">原型参考：<code>原型/teas/detail.html</code></p>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; margin: 0 auto; padding: 32px 16px; }
</style>
