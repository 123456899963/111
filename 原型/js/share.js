/* ============================================================
   分享清单公开页（只读）
   依赖: TEA_MOCK, TEA_COMMON
   URL: /c/[shareId]/index.html
   localStorage 存储: tea_share_{shareId} = [teaId1, teaId2, ...]
   （由收藏清单页 my.js 的"生成分享链接"按钮写入）
   ============================================================ */

(function () {
  'use strict';

  const { CATEGORIES, getTeaById } = window.TEA_MOCK;
  const {
    renderNav, renderBreadcrumb, getCurrentUser,
    toggleFavorite, getFavorites, showToast, openLoginModal, requireLogin
  } = window.TEA_COMMON;

  const P = '../../'; // c/[shareId]/ 子目录
  const HOME_HREF = `${P}index.html`;

  document.addEventListener('DOMContentLoaded', () => {
    renderNav({ isHome: false, active: 'teas' });

    // 从 URL 解析 shareId —— 浏览器实际访问路径类似：.../原型/c/share_abc123/index.html
    // 但我们的文件系统路径是 c/[shareId]/index.html，所以读取路径名
    // 简化处理：用 URLSearchParams 的方式也行，但因为是静态文件，我们需要用 pathname
    const pathname = window.location.pathname;
    // 从路径中提取 shareId：匹配 /c/xxx/index.html 中的 xxx
    const match = pathname.match(/\/c\/([^\/]+)\/index\.html/);
    let shareId = match ? match[1] : null;

    if (!shareId) {
      // fallback: 尝试从 query string 读取
      shareId = new URLSearchParams(window.location.search).get('id');
    }

    if (!shareId) {
      showError();
      return;
    }

    // 从 localStorage 读取
    const raw = localStorage.getItem(`tea_share_${shareId}`);
    if (!raw) {
      showError();
      return;
    }

    let favIds;
    try {
      favIds = JSON.parse(raw);
    } catch (e) {
      showError();
      return;
    }

    renderBreadcrumb([
      { label: '首页', href: HOME_HREF },
      { label: '分享清单' },
    ]);

    const list = favIds.map(id => getTeaById(id)).filter(Boolean);
    if (list.length === 0) {
      showError();
      return;
    }

    document.getElementById('fav-content').classList.remove('hidden');
    document.getElementById('stat-total').textContent = list.length;
    renderList(list);

    // 一键收藏
    document.getElementById('btn-collect-all').addEventListener('click', () => {
      if (!requireLogin()) {
        openLoginModal();
        showToast('登录后才能一键收藏', 'info');
        return;
      }
      let added = 0;
      favIds.forEach(id => {
        if (!getFavorites().includes(id)) {
          toggleFavorite(id);
          added++;
        }
      });
      if (added === 0) {
        showToast('这些茶你都已经收藏过啦', 'info');
      } else {
        showToast(`已收藏 ${added} 款茶 ❤️`, 'success');
      }
    });
  });

  function showError() {
    document.getElementById('share-error').classList.remove('hidden');
    const bc = document.getElementById('breadcrumb');
    if (bc) {
      bc.innerHTML = renderBreadcrumb([
        { label: '首页', href: HOME_HREF },
        { label: '分享清单' },
      ]);
    }
  }

  function renderList(list) {
    const wrap = document.getElementById('fav-list');
    wrap.innerHTML = list.map(tea => {
      const cat = CATEGORIES.find(c => c.key === tea.category);
      const tagBg = cat ? cat.color : '#8B7355';
      const tagFg = tea.category === 'white' ? 'var(--primary-dark)' : '#fff';
      return `
        <div class="fav-item">
          <img class="fav-item__img" src="${tea.imageUrl}" alt="${tea.name}" onerror="this.style.background='var(--bg-muted)';this.src=''">
          <div class="fav-item__body">
            <div class="fav-item__header">
              <h3 class="fav-item__name">${tea.name}</h3>
              <span class="fav-item__tag" style="background:${tagBg};color:${tagFg}">${cat.name}</span>
            </div>
            <p class="fav-item__origin">${tea.origin} · ${tea.season}</p>
            <div style="margin-top:8px;">
              <a class="btn btn--ghost btn--sm" href="../../teas/detail.html?id=${tea.id}">查看详情</a>
            </div>
          </div>
          <!-- 只读：不显示移除按钮 -->
        </div>
      `;
    }).join('');
  }

})();
