<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
const isEdit = !!route.params.id
</script>

<template>
  <div>
    <h2 class="text-h2 mb-lg">{{ isEdit ? '编辑茶品' : '新增茶品' }}</h2>
    <p class="text-secondary">
      原型参考：<code>原型/admin/teas/new.html</code> / <code>原型/admin/teas/edit.html</code>
    </p>
  </div>
</template>
