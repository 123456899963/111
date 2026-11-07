<script setup lang="ts">
// 管理员后台布局 — 侧边栏 + 顶栏 + RouterView 插槽
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <strong>茶·图鉴</strong>
        <span class="text-caption">管理后台</span>
      </div>
      <el-menu :default-active="$route.name as string" router>
        <el-menu-item index="admin-dashboard">数据概览</el-menu-item>
        <el-menu-item index="admin-teas">茶品管理</el-menu-item>
        <el-menu-item index="admin-tea-new">新增茶品</el-menu-item>
      </el-menu>
    </aside>
    <main class="admin-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100svh;
}
.admin-sidebar {
  width: 240px;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-surface);
}
.admin-brand {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.admin-main {
  flex: 1;
  padding: 24px 32px;
  background: var(--color-bg-page);
}
</style>
