<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
const shareId = route.params.shareId
</script>

<template>
  <div class="page">
    <h2>分享清单（只读 · {{ shareId }}）</h2>
    <p class="text-secondary">原型参考：<code>原型/c/{shareId}/index.html</code></p>
  </div>
</template>

<style scoped>
.page { max-width: 960px; margin: 0 auto; padding: 32px 16px; }
</style>
