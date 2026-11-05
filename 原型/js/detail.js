/* ============================================================
   茶品详情页交互脚本
   依赖: TEA_MOCK (../js/mock/teas.js), TEA_COMMON (../js/common.js)
   URL 参数: ?id={teaId}
   ============================================================ */

(function () {
  'use strict';

  const { CATEGORIES, getTeaById, getRelatedTeas, toggleFavorite, isFavorited, showToast, openLoginModal, requireLogin } = window.TEA_COMMON
    ? {
        CATEGORIES: window.TEA_MOCK.CATEGORIES,
        getTeaById: window.TEA_MOCK.getTeaById,
        getRelatedTeas: window.TEA_MOCK.getRelatedTeas,
        toggleFavorite: window.TEA_COMMON.toggleFavorite,
        isFavorited: window.TEA_COMMON.isFavorited,
        showToast: window.TEA_COMMON.showToast,
        openLoginModal: window.TEA_COMMON.openLoginModal,
        requireLogin: window.TEA_COMMON.requireLogin,
      }
    : window.TEA_MOCK && window.TEA_MOCK.CATEGORIES ? {
        CATEGORIES: window.TEA_MOCK.CATEGORIES,
        getTeaById: window.TEA_MOCK.getTeaById,
        getRelatedTeas: window.TEA_MOCK.getRelatedTeas,
        toggleFavorite: () => false, isFavorited: () => false, showToast: () => {}, openLoginModal: () => {}, requireLogin: () => false,
      } : {};

  /* ---------- 路径前缀 ---------- */
  const P = '../'; // 详情页固定在 teas/ 子目录
  const HOME_HREF    = `${P}index.html`;
  const TEAS_HREF    = `${P}teas/index.html`;

  let currentTea = null;
  let currentNotes = {}; // localStorage: tea_notes

  /* ---------- DOM 就绪 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderNav();
    loadTea();
    bindActions();
  });

  function renderNav() {
    // 复用 common.js 的 renderNav，但覆盖路径
    if (window.TEA_COMMON && window.TEA_COMMON.renderNav) {
      window.TEA_COMMON.renderNav({ isHome: false, active: 'teas' });
      // 覆盖 href —— renderNav 内部会自动检测层级，这里已经是 teas/ 子目录，renderNav 会自动加 ../
    }
  }

  /* ---------- 加载茶品 ---------- */
  function loadTea() {
    const params = new URLSearchParams(window.location.search);
    const idStr = params.get('id');
    const id = idStr ? Number(idStr) : null;

    if (!id || !getTeaById) {
      showError();
      return;
    }

    setTimeout(() => {
      const tea = getTeaById(id);
      if (!tea) {
        showError();
        return;
      }
      currentTea = tea;
      populateDetail(tea);
      populateRelated(tea);
    }, 350);
  }

  function showError() {
    document.getElementById('detail-skeleton').classList.add('hidden');
    document.getElementById('detail-content').classList.add('hidden');
    document.getElementById('detail-error').classList.remove('hidden');
    renderBreadcrumb(null);
  }

  /* ---------- 填充详情 ---------- */
  function populateDetail(tea) {
    const cat = CATEGORIES.find(c => c.key === tea.category);

    // 隐藏骨架屏
    document.getElementById('detail-skeleton').classList.add('hidden');
    document.getElementById('detail-content').classList.remove('hidden');

    // 面包屑
    renderBreadcrumb(tea);

    // 主图
    const img = document.getElementById('detail-image');
    img.src = tea.imageUrl;
    img.alt = tea.name;

    // 茶类标签（图片上叠加，可点击跳列表页带筛选）
    const tagEl = document.getElementById('detail-category-tag');
    tagEl.textContent = `${cat.emoji} ${cat.name}`;
    tagEl.style.background = cat.color;
    if (tea.category === 'white') {
      tagEl.style.color = 'var(--primary-dark)';
    }
    tagEl.title = `点击查看全部 ${cat.name}`;
    tagEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = `${P}teas/index.html?category=${tea.category}`;
    });

    // 名称 + 产地 + 季节
    document.getElementById('detail-name').textContent = tea.name;
    document.getElementById('detail-origin').textContent = tea.origin;
    document.getElementById('detail-season').textContent = `采摘 · ${tea.season}`;
    document.getElementById('detail-favorite-inline').textContent = `♡ ${tea.favoriteCount.toLocaleString()} 人收藏`;

    // 冲泡参数
    document.getElementById('detail-watertemp').textContent = `${tea.waterTemp}℃`;
    document.getElementById('detail-teaamount').textContent = `${tea.teaAmount}g`;
    document.getElementById('detail-brewtime').textContent = `${tea.brewTime}秒`;

    // 四大感官
    document.getElementById('detail-shape').textContent = tea.shape || '—';
    document.getElementById('detail-soup').textContent  = tea.soup   || '—';
    document.getElementById('detail-aroma').textContent = tea.aroma || '—';
    document.getElementById('detail-taste').textContent = tea.taste || '—';

    // 小贴士（4 块）
    populateTips(tea.tips);

    // 收藏按钮状态
    updateFavButton();
  }

  function populateTips(tips) {
    const section = document.getElementById('detail-tips-section');
    const map = [
      { key: 'history',        id: 'tip-history',        title: '历史文化' },
      { key: 'suitable',       id: 'tip-suitable',       title: '适合人群' },
      { key: 'misconception',  id: 'tip-misconception',  title: '常见误区' },
      { key: 'officialNote',   id: 'tip-official',       title: '官方备注' },
    ];

    let hasAny = false;
    map.forEach(m => {
      const el = document.getElementById(m.id);
      const content = tips && tips[m.key];
      if (content) {
        el.classList.remove('hidden');
        el.querySelector('.tip-card__text').textContent = content;
        hasAny = true;
      } else {
        el.classList.add('hidden');
      }
    });

    if (hasAny) section.classList.remove('hidden');
    else section.classList.add('hidden');
  }

  /* ---------- 同类推荐 ---------- */
  function populateRelated(tea) {
    const wrap = document.getElementById('detail-related');
    let related = [];
    if (window.TEA_MOCK && window.TEA_MOCK.filterTeas) {
      related = window.TEA_MOCK.filterTeas({ categories: [tea.category] }).filter(t => t.id !== tea.id).slice(0, 4);
    }
    if (related.length === 0) {
      wrap.innerHTML = '<p style="color:var(--text-muted);">暂无同类推荐</p>';
      return;
    }

    wrap.innerHTML = related.map(r => {
      const cat = CATEGORIES.find(c => c.key === r.category);
      const tagBg = cat ? cat.color : '#8B7355';
      const tagFg = r.category === 'white' ? 'var(--primary-dark)' : '#fff';
      return `
        <a href="detail.html?id=${r.id}" class="card-tea">
          <img class="card-tea__img" src="${r.imageUrl}" onerror="this.style.background='var(--bg-muted)';this.src=''">
          <div class="card-tea__body">
            <div class="card-tea__header">
              <h3 class="card-tea__name">${r.name}</h3>
              <span class="card-tea__tag" style="background:${tagBg};color:${tagFg}">${cat.name}</span>
            </div>
            <p class="card-tea__origin">${r.origin}</p>
            <div class="card-tea__footer">
              <span class="card-tea__fav">♡ ${r.favoriteCount.toLocaleString()}</span>
              <span class="card-tea__season">${r.season}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  /* ---------- 面包屑 ---------- */
  function renderBreadcrumb(tea) {
    const bc = document.getElementById('breadcrumb');
    const items = [
      { label: '首页', href: HOME_HREF },
      { label: '六大茶类', href: TEAS_HREF },
    ];
    if (tea) {
      const cat = CATEGORIES.find(c => c.key === tea.category);
      const queryCat = encodeURIComponent(`category=${tea.category}`);
      items.push({ label: cat ? cat.name : '', href: `${TEAS_HREF}?${queryCat}` });
      items.push({ label: tea.name });
    } else {
      items.push({ label: '详情' });
    }

    const html = items.map((it, i) => {
      const isLast = i === items.length - 1;
      const label = isLast
        ? `<span class="breadcrumb__current">${it.label}</span>`
        : `<a class="breadcrumb__link" href="${it.href}">${it.label}</a>`;
      const sep = isLast ? '' : `<span class="breadcrumb__sep">›</span>`;
      return `${label}${sep}`;
    }).join('');
    bc.innerHTML = `<nav aria-label="breadcrumb">${html}</nav>`;
  }

  /* ---------- 收藏按钮 ---------- */
  function updateFavButton() {
    const iconEl = document.getElementById('btn-favorite-icon');
    const textEl = document.getElementById('btn-favorite-text');
    const favInline = document.getElementById('detail-favorite-inline');
    if (!currentTea) return;

    if (isFavorited(currentTea.id)) {
      iconEl.innerHTML = '❤️';
      textEl.textContent = '已加入清单';
      document.getElementById('btn-favorite').classList.add('btn--active');
      favInline.textContent = `❤️ 已收藏 · ${currentTea.favoriteCount.toLocaleString()} 人`;
    } else {
      iconEl.textContent = '♡';
      textEl.textContent = '加入我的清单';
      document.getElementById('btn-favorite').classList.remove('btn--active');
      favInline.textContent = `♡ ${currentTea.favoriteCount.toLocaleString()} 人收藏`;
    }
  }

  /* ---------- 绑定交互 ---------- */
  function bindActions() {
    // 收藏
    document.getElementById('btn-favorite').addEventListener('click', () => {
      if (!requireLogin || !requireLogin()) {
        openLoginModal();
        showToast('登录后才能收藏哦～', 'info');
        return;
      }
      const isNew = toggleFavorite(currentTea.id);
      updateFavButton();
      showToast(isNew ? '已加入我的清单 ❤️' : '已取消收藏', isNew ? 'success' : 'info');
    });

    // 写笔记
    document.getElementById('btn-note').addEventListener('click', () => {
      if (!requireLogin || !requireLogin()) {
        openLoginModal();
        showToast('登录后才能写品鉴笔记哦～', 'info');
        return;
      }
      openNoteModal();
    });
    document.getElementById('note-cancel').addEventListener('click', closeNoteModal);
    document.getElementById('note-save').addEventListener('click', saveNote);

    // 分享
    document.getElementById('btn-share').addEventListener('click', () => {
      openShareModal();
    });
    document.getElementById('share-cancel').addEventListener('click', closeShareModal);
    document.getElementById('share-copy').addEventListener('click', copyShareLink);
  }

  /* ---------- 笔记 ---------- */
  function getNotesMap() {
    try { return JSON.parse(localStorage.getItem('tea_notes') || '{}'); }
    catch (e) { return {}; }
  }
  function setNotesMap(map) {
    localStorage.setItem('tea_notes', JSON.stringify(map));
  }

  function openNoteModal() {
    const modal = document.getElementById('note-modal');
    modal.classList.remove('hidden');
    document.getElementById('note-tea-name').textContent = currentTea.name;
    const map = getNotesMap();
    document.getElementById('note-content').value = map[currentTea.id] || '';
    document.body.style.overflow = 'hidden';
  }
  function closeNoteModal() {
    document.getElementById('note-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }
  function saveNote() {
    const content = document.getElementById('note-content').value.trim();
    const map = getNotesMap();
    if (content) {
      map[currentTea.id] = content;
      showToast('品鉴笔记已保存 📝', 'success');
    } else {
      delete map[currentTea.id];
      showToast('已清空该条笔记', 'info');
    }
    setNotesMap(map);
    closeNoteModal();
  }

  /* ---------- 分享 ---------- */
  function openShareModal() {
    const modal = document.getElementById('share-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const input = document.getElementById('share-link');
    const user = window.TEA_COMMON ? window.TEA_COMMON.getCurrentUser && window.TEA_COMMON.getCurrentUser() : null;
    if (user) {
      // 复用 my.js 的分享逻辑：shareId + localStorage 写入
      let shareId = localStorage.getItem('tea_share_id');
      if (!shareId) {
        shareId = `share_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem('tea_share_id', shareId);
      }
      // 写入当前用户的收藏清单（分享内容）
      const favIds = window.TEA_COMMON.getFavorites ? window.TEA_COMMON.getFavorites() : [];
      localStorage.setItem(`tea_share_${shareId}`, JSON.stringify(favIds));

      // 正确路径：/c/{shareId}/index.html
      const pathname = window.location.pathname.replace(/teas\/.*$/, '');
      input.value = `${window.location.origin}${pathname}c/${shareId}/index.html`;
      input.removeAttribute('readonly');
    } else {
      input.value = '';
      input.setAttribute('readonly', 'readonly');
    }
  }
  function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }
  function copyShareLink() {
    const input = document.getElementById('share-link');
    if (!input.value) {
      showToast('请先登录后再分享', 'info');
      return;
    }
    input.select();
    document.execCommand('copy');
    showToast('分享链接已复制到剪贴板', 'success');
  }

})();
