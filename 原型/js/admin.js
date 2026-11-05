/* ============================================================
   管理员后台公共脚本
   全局挂载: window.TEA_ADMIN
   功能: 登录守卫、侧边栏、仪表盘统计、茶品管理 CRUD（内存模拟）
   数据存储: localStorage.admin_teas（管理员可修改的副本）
   ============================================================ */

(function () {
  'use strict';

  const ADMIN_KEY = 'tea_admin_auth'; // localStorage 存 admin: { username, ts }

  /* ---------- 管理员登录（硬编码 admin / admin123） ---------- */
  function login(username, password) {
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem(ADMIN_KEY, JSON.stringify({ username, ts: Date.now() }));
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(ADMIN_KEY);
  }

  function isLoggedIn() {
    try {
      const a = JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null');
      return !!a && a.username === 'admin';
    } catch (e) { return false; }
  }

  /* ---------- 茶品数据（管理员可读写副本） ---------- */
  // 管理员编辑/新增写入 localStorage.admin_teas_edited，优先使用
  const EDITED_KEY = 'admin_teas_edited';

  function getAdminTeas() {
    const base = window.TEA_MOCK ? window.TEA_MOCK.TEAS : [];
    try {
      const edited = JSON.parse(localStorage.getItem(EDITED_KEY) || 'null');
      if (edited && edited.length) return edited;
    } catch (e) {}
    return base.map(t => ({ ...t, status: 'published' }));
  }

  function saveAdminTeas(teas) {
    localStorage.setItem(EDITED_KEY, JSON.stringify(teas));
  }

  function getAdminTeaById(id) {
    return getAdminTeas().find(t => t.id === Number(id));
  }

  function updateTea(id, patch) {
    const list = getAdminTeas();
    const idx = list.findIndex(t => t.id === Number(id));
    if (idx > -1) {
      list[idx] = { ...list[idx], ...patch };
      saveAdminTeas(list);
      return list[idx];
    }
    return null;
  }

  function createTea(data) {
    const list = getAdminTeas();
    const maxId = Math.max(0, ...list.map(t => t.id));
    const newTea = { ...data, id: maxId + 1, status: 'published' };
    list.push(newTea);
    saveAdminTeas(list);
    return newTea;
  }

  function toggleStatus(id) {
    const list = getAdminTeas();
    const idx = list.findIndex(t => t.id === Number(id));
    if (idx > -1) {
      list[idx].status = list[idx].status === 'published' ? 'offline' : 'published';
      saveAdminTeas(list);
      return list[idx];
    }
    return null;
  }

  /* ---------- 仪表盘统计 ---------- */
  function getStats() {
    const list = getAdminTeas();
    const published = list.filter(t => t.status !== 'offline');
    const offline = list.filter(t => t.status === 'offline');
    const byCategory = {};
    (window.TEA_MOCK?.CATEGORIES || []).forEach(c => byCategory[c.key] = { name: c.name, color: c.color, count: 0 });
    published.forEach(t => { if (byCategory[t.category]) byCategory[t.category].count++; });
    return {
      total: list.length,
      published: published.length,
      offline: offline.length,
      byCategory: Object.values(byCategory),
      recent: list.slice().sort((a, b) => b.id - a.id).slice(0, 5),
    };
  }

  /* ---------- 布局渲染（侧边栏 + 顶部） ---------- */
  function renderLayout(active) {
    const root = document.getElementById('admin-layout');
    if (!root) return;
    root.innerHTML = `
      <aside class="admin-sidebar">
        <div class="admin-sidebar__logo">🫖 茶·图鉴</div>
        <div class="admin-sidebar__section">管理后台</div>
        <nav class="admin-sidebar__nav">
          <a class="admin-sidebar__item ${active === 'dashboard' ? 'admin-sidebar__item--active' : ''}" href="index.html">📊 仪表盘</a>
          <a class="admin-sidebar__item ${active === 'teas' ? 'admin-sidebar__item--active' : ''}" href="teas/index.html">🍵 茶品管理</a>
        </nav>
      </aside>
      <div class="admin-main">
        <header class="admin-topbar">
          <span class="admin-topbar__title">${document.title.replace(' — 茶·图鉴管理员', '')}</span>
          <div class="admin-topbar__user">
            <span>admin</span>
            <button id="admin-logout" class="btn btn--ghost btn--sm">退出</button>
          </div>
        </header>
        <div id="admin-content"></div>
      </div>
    `;
    document.getElementById('admin-logout').addEventListener('click', () => {
      logout();
      location.href = 'login.html';
    });
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      location.href = 'login.html';
      return false;
    }
    return true;
  }

  /* ---------- Toast ---------- */
  function toast(msg, type = 'info') {
    const root = document.getElementById('toast-root');
    if (!root) {
      // 自动创建
      const div = document.createElement('div');
      div.id = 'toast-root';
      div.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(div);
    }
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = msg;
    document.getElementById('toast-root').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; }, 2200);
    setTimeout(() => el.remove(), 2600);
  }

  /* ---------- 挂载 ---------- */
  window.TEA_ADMIN = {
    login, logout, isLoggedIn,
    getAdminTeas, getAdminTeaById, updateTea, createTea, toggleStatus,
    getStats,
    renderLayout, requireAuth, toast,
  };

})();
