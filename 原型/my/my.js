/* ============================================================
   收藏清单页（我的）
   依赖: TEA_MOCK, TEA_COMMON
   URL: /my/index.html
   ============================================================ */

(function () {
  'use strict';

  const { CATEGORIES, getTeaById } = window.TEA_MOCK;
  const {
    renderNav, renderBreadcrumb, getCurrentUser, isFavorited,
    toggleFavorite, getFavorites, showToast, openLoginModal, requireLogin
  } = window.TEA_COMMON;

  const P = '../';
  const HOME_HREF = `${P}index.html`;
  const TEAS_HREF = `${P}teas/index.html`;
  let editingTeaId = null;

  document.addEventListener('DOMContentLoaded', () => {
    renderNav({ isHome: false, active: 'my' });
    bindBreadcrumb();

    const user = getCurrentUser();
    if (!user) {
      // 未登录 → 显示登录守卫
      document.getElementById('auth-required').classList.remove('hidden');
      document.getElementById('auth-login').addEventListener('click', openLoginModal);
      // 监听登录事件（common.js 登录后会触发自定义事件）
      document.addEventListener('tea:login', () => location.reload());
      return;
    }

    // 已登录 → 渲染清单
    document.getElementById('fav-content').classList.remove('hidden');
    document.getElementById('user-name').textContent = user.username;
    bindBreadcrumb();

    renderList();
    bindToolbar();
    bindModal();
  });

  function bindBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    bc.innerHTML = renderBreadcrumb([
      { label: '首页', href: HOME_HREF },
      { label: '我的清单' },
    ]);
  }

  /* ---------- 渲染清单 ---------- */
  function renderList() {
    const favIds = getFavorites();
    const list = favIds.map(id => getTeaById(id)).filter(Boolean);
    const wrap = document.getElementById('fav-list');
    const empty = document.getElementById('fav-empty');

    // 统计
    document.getElementById('stat-total').textContent = list.length;
    const notesMap = getNotesMap();
    const noteCount = Object.values(notesMap).filter(v => v && v.trim()).length;
    document.getElementById('stat-notes').textContent = noteCount;
    document.getElementById('stat-days').textContent = calcDays();

    if (list.length === 0) {
      wrap.innerHTML = '';
      wrap.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    wrap.classList.remove('hidden');
    empty.classList.add('hidden');

    const notes = getNotesMap();
    wrap.innerHTML = list.map(tea => {
      const cat = CATEGORIES.find(c => c.key === tea.category);
      const tagBg = cat ? cat.color : '#8B7355';
      const tagFg = tea.category === 'white' ? 'var(--primary-dark)' : '#fff';
      const note = notes[tea.id];
      const noteHtml = note && note.trim()
        ? `<p class="fav-item__note"><span class="fav-item__note-title">📝 笔记：</span>${escapeHtml(note)}</p>`
        : '';
      return `
        <div class="fav-item" data-tea-id="${tea.id}">
          <img class="fav-item__img" src="${tea.imageUrl}" alt="${tea.name}" onerror="this.style.background='var(--bg-muted)';this.src=''">
          <div class="fav-item__body">
            <div class="fav-item__header">
              <h3 class="fav-item__name">${tea.name}</h3>
              <span class="fav-item__tag" style="background:${tagBg};color:${tagFg}">${cat.name}</span>
            </div>
            <p class="fav-item__origin">${tea.origin} · ${tea.season}</p>
            ${noteHtml}
            <div style="margin-top:8px;display:flex;gap:8px;">
              <button class="btn btn--ghost btn--sm" data-action="detail" data-id="${tea.id}">查看详情</button>
              <button class="btn btn--ghost btn--sm" data-action="note" data-id="${tea.id}">${note ? '编辑笔记' : '写笔记'}</button>
            </div>
          </div>
          <button class="fav-item__remove" data-action="remove" data-id="${tea.id}" title="移出清单">✕</button>
        </div>
      `;
    }).join('');

    // 绑定点击
    wrap.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = Number(btn.dataset.id);
        if (action === 'detail') {
          location.href = `${P}teas/detail.html?id=${id}`;
        } else if (action === 'note') {
          openNoteModal(id);
        } else if (action === 'remove') {
          const tea = getTeaById(id);
          toggleFavorite(id);
          showToast(`已从清单移除「${tea.name}」`, 'info');
          renderList();
        }
      });
    });
  }

  /* ---------- 工具栏 ---------- */
  function bindToolbar() {
    document.getElementById('btn-share').addEventListener('click', openShareModal);
  }

  /* ---------- 笔记 ---------- */
  function getNotesMap() {
    try { return JSON.parse(localStorage.getItem('tea_notes') || '{}'); }
    catch (e) { return {}; }
  }
  function setNotesMap(map) {
    localStorage.setItem('tea_notes', JSON.stringify(map));
  }

  function openNoteModal(teaId) {
    const tea = getTeaById(teaId);
    editingTeaId = teaId;
    document.getElementById('note-tea-name').textContent = tea.name;
    document.getElementById('note-content').value = getNotesMap()[teaId] || '';
    document.getElementById('note-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeNoteModal() {
    document.getElementById('note-modal').classList.add('hidden');
    document.body.style.overflow = '';
    editingTeaId = null;
  }
  function saveNote() {
    const content = document.getElementById('note-content').value.trim();
    const map = getNotesMap();
    if (content) map[editingTeaId] = content;
    else delete map[editingTeaId];
    setNotesMap(map);
    showToast('品鉴笔记已保存', 'success');
    closeNoteModal();
    renderList();
  }

  /* ---------- 分享 ---------- */
  function openShareModal() {
    const modal = document.getElementById('share-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const shareId = localStorage.getItem('tea_share_id') || `share_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('tea_share_id', shareId);
    // 记录该 shareId 对应的内容（实际上一个用户一个 shareId 足够）
    localStorage.setItem(`tea_share_${shareId}`, JSON.stringify(getFavorites()));

    const pathname = window.location.pathname.replace(/my\/.*$/, '');
    document.getElementById('share-link').value = `${window.location.origin}${pathname}c/${shareId}/index.html`;
  }
  function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }
  function copyShareLink() {
    const input = document.getElementById('share-link');
    input.select();
    document.execCommand('copy');
    showToast('分享链接已复制', 'success');
  }

  /* ---------- Modal 事件 ---------- */
  function bindModal() {
    document.getElementById('note-cancel').addEventListener('click', closeNoteModal);
    document.getElementById('note-save').addEventListener('click', saveNote);
    document.getElementById('share-cancel').addEventListener('click', closeShareModal);
    document.getElementById('share-copy').addEventListener('click', copyShareLink);
  }

  /* ---------- 工具 ---------- */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function calcDays() {
    // 用 localStorage 的 tea_days_track 模拟：每次访问 +1，保存最大 30 天
    const key = 'tea_days_track';
    const now = new Date().toDateString();
    let days = [];
    try { days = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
    if (!days.includes(now)) {
      days.push(now);
      if (days.length > 30) days = days.slice(-30);
      localStorage.setItem(key, JSON.stringify(days));
    }
    return days.length;
  }

})();
