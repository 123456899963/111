/* ============================================================
   首页交互脚本
   依赖: TEA_MOCK (mock/teas.js), TEA_COMMON (common.js)
   功能: 导航栏注入、Hero 搜索、六大茶类入口、热门横向滚动、随机发现
   ============================================================ */

(function () {
  'use strict';

  const { CATEGORIES, getCategoriesWithCount, getHotTeas, getRandomTea, searchTeas } = window.TEA_MOCK;
  const { getIcon, renderNav, initHomeNavScroll, renderFavBtn, openLoginModal, requireLogin,
          toggleFavorite, isFavorited, showToast } = window.TEA_COMMON;

  /* ---------- DOM 就绪后全部初始化 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. 导航栏（首页态：透明初始）
    renderNav({ isHome: true, active: 'home' });
    initHomeNavScroll();

    // 2. 六大茶类入口
    renderCategoryCards();

    // 3. 热门推荐
    renderHotList();
    bindHotScroll();

    // 4. 随机发现
    renderRandomCard();
    bindRandomShuffle();

    // 5. Hero 搜索
    bindHeroSearch();

    // 6. 点随机卡时用占位（详情页第二批做）
    document.getElementById('random-card').addEventListener('click', onCardPlaceholder);
  });

  /* ---------- 六大茶类入口 ---------- */
  function renderCategoryCards() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;
    const list = getCategoriesWithCount();

    grid.innerHTML = list.map(cat => {
      // 按方案一配色：每个茶类卡片顶部 3px 彩条
      return `
        <a href="teas/index.html?category=${cat.key}" class="category-card" style="--cat-color:${cat.color}">
          <div class="category-card__icon">${cat.emoji}</div>
          <div class="category-card__name">${cat.name}</div>
          <div class="category-card__count">${cat.count} 款已收录</div>
        </a>
      `;
    }).join('');
  }

  /* ---------- 热门推荐 ---------- */
  function renderHotList() {
    const track = document.getElementById('hot-track');
    if (!track) return;
    const hot = getHotTeas(8);

    track.innerHTML = hot.map(tea => {
      const tagStyle = `background:${getCategoryColor(tea.category)};color:${tea.category === 'white' ? 'var(--primary-dark)' : '#fff'};`;
      const faved = isFavorited(tea.id);
      const favIcon = faved
        ? '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>';
      const favClass = faved ? 'card-hot__fav-btn card-hot__fav-btn--active' : 'card-hot__fav-btn';
      return `
        <a href="#" class="card-hot" data-tea-id="${tea.id}">
          <img class="card-hot__img" src="${tea.imageUrl}" alt="${tea.name}" loading="lazy" onerror="this.style.background='var(--bg-muted)';this.src=''">
          <button class="${favClass}" data-fav="${tea.id}" title="加入清单">${favIcon}</button>
          <div class="card-hot__body">
            <h4 class="card-hot__name">${tea.name}</h4>
            <p class="card-hot__origin">${tea.origin.split(' ')[0]}</p>
            <div class="card-hot__meta">
              <span class="card-hot__tag" style="${tagStyle}">${getCategoryName(tea.category)}</span>
              <span class="card-hot__fav">
                ♡ ${tea.favoriteCount.toLocaleString()}
              </span>
            </div>
          </div>
        </a>
      `;
    }).join('');

    // 收藏按钮（阻止卡片跳转）
    track.querySelectorAll('[data-fav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const teaId = Number(btn.dataset.fav);
        const tea = window.TEA_MOCK.getTeaById(teaId);
        if (!requireLogin()) {
          openLoginModal();
          showToast('登录后才能收藏哦～', 'info');
          return;
        }
        const isNew = toggleFavorite(teaId);
        showToast(isNew ? `已收藏「${tea.name}」❤️` : `已取消收藏「${tea.name}」`, isNew ? 'success' : 'info');
        // 立即刷新热门卡 UI（收藏状态变化）
        renderHotList();
      });
    });

    // 热门卡点击 → 跳转详情页
    track.querySelectorAll('.card-hot').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-fav]')) return; // 点收藏按钮不触发
        e.preventDefault();
        const teaId = card.dataset.teaId;
        window.location.href = `teas/detail.html?id=${teaId}`;
      });
    });
  }

  function bindHotScroll() {
    const track = document.getElementById('hot-track');
    const prev = document.getElementById('hot-prev');
    const next = document.getElementById('hot-next');
    if (!track) return;

    const scrollStep = 440; // 每次滚动的像素

    prev.addEventListener('click', () => track.scrollBy({ left: -scrollStep, behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: scrollStep, behavior: 'smooth' }));

    // 拖拽滚动（桌面端鼠标拖拽）
    let isDown = false, startX = 0, scrollLeft = 0;
    track.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX - track.offsetLeft; scrollLeft = track.scrollLeft; track.style.cursor = 'grabbing'; });
    track.addEventListener('mouseleave', () => { isDown = false; track.style.cursor = ''; });
    track.addEventListener('mouseup', () => { isDown = false; track.style.cursor = ''; });
    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      track.scrollLeft = scrollLeft - (x - startX);
    });
  }

  /* ---------- 随机发现 ---------- */
  let currentRandomId = null;

  function renderRandomCard() {
    const card = document.getElementById('random-card');
    if (!card) return;
    const tea = getRandomTea(currentRandomId);
    currentRandomId = tea.id;

    const catColor = getCategoryColor(tea.category);
    const tagStyle = `background:${catColor};color:${tea.category === 'white' ? 'var(--primary-dark)' : '#fff'};`;
    const faved = isFavorited(tea.id);
    const favIcon = faved
      ? '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>';
    const favClass = faved ? 'card-random__fav card-random__fav--active' : 'card-random__fav';

    card.innerHTML = `
      <img class="card-random__img" src="${tea.imageUrl}" alt="${tea.name}" onerror="this.style.background='var(--bg-muted)';this.src=''">
      <button class="${favClass}" data-fav="${tea.id}" title="加入清单">${favIcon}</button>
      <div class="card-random__body">
        <h3 class="card-random__name">${tea.name}</h3>
        <div class="card-random__tags">
          <span class="card-tea__tag" style="${tagStyle}">${getCategoryName(tea.category)}</span>
          <span class="card-hot__fav" style="color:var(--text-muted)">
            ♡ ${tea.favoriteCount.toLocaleString()}
          </span>
        </div>
        <div class="card-random__brew">
          <span>🌡️ ${tea.waterTemp}℃</span>
          <span>🫖 ${tea.teaAmount}g</span>
          <span>⏱ ${tea.brewTime}s</span>
        </div>
      </div>
    `;

    // 收藏按钮
    card.querySelector('[data-fav]').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const teaId = Number(e.currentTarget.dataset.fav);
      const t = window.TEA_MOCK.getTeaById(teaId);
      if (!requireLogin()) {
        openLoginModal();
        showToast('登录后才能收藏哦～', 'info');
        return;
      }
      const isNew = toggleFavorite(teaId);
      showToast(isNew ? `已收藏「${t.name}」❤️` : `已取消收藏`, isNew ? 'success' : 'info');
      renderRandomCard();
    });
  }

  function bindRandomShuffle() {
    const btn = document.getElementById('random-shuffle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (btn.classList.contains('spinning')) return;
      btn.classList.add('spinning');
      renderRandomCard();
      setTimeout(() => btn.classList.remove('spinning'), 400);
    });
  }

  /* ---------- Hero 搜索 ---------- */
  function bindHeroSearch() {
    const input = document.getElementById('hero-search-input');
    const suggest = document.getElementById('hero-search-suggest');
    if (!input) return;

    let debounceTimer = null;

    // 输入触发建议
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (!q) {
        suggest.classList.remove('hero__search-suggest--open');
        suggest.innerHTML = '';
        return;
      }
      debounceTimer = setTimeout(() => showSuggest(q), 150);
    });

    // 聚焦时：如果已有输入，显示建议
    input.addEventListener('focus', () => {
      if (input.value.trim()) showSuggest(input.value.trim());
    });

    // 点击外部关闭建议
    document.addEventListener('click', (e) => {
      if (!suggest.contains(e.target) && e.target !== input) {
        suggest.classList.remove('hero__search-suggest--open');
      }
    });

    // 回车 → 跳转列表页
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = input.value.trim();
        if (q) {
          window.location.href = `teas/index.html?q=${encodeURIComponent(q)}`;
        }
      }
    });
  }

  function showSuggest(keyword) {
    const suggest = document.getElementById('hero-search-suggest');
    const results = searchTeas(keyword).slice(0, 6);
    if (!results.length) {
      suggest.innerHTML = `<div style="padding:16px 20px;text-align:center;color:var(--text-muted);font-size:var(--text-small)">没有找到相关茶品</div>`;
    } else {
      suggest.innerHTML = results.map(tea => `
        <div class="hero__search-suggest-item" data-tea-id="${tea.id}">
          <img class="hero__search-suggest-item__thumb" src="${tea.imageUrl}" onerror="this.style.background='var(--bg-muted)';this.src=''">
          <div class="hero__search-suggest-item__info">
            <div class="hero__search-suggest-item__name">${tea.name}</div>
            <div class="hero__search-suggest-item__origin">${tea.origin}</div>
          </div>
        </div>
      `).join('');

      // 点建议项 → 跳转列表页带关键词
      suggest.querySelectorAll('.hero__search-suggest-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.teaId;
          const tea = window.TEA_MOCK.getTeaById(id);
          const params = new URLSearchParams();
          params.set('q', tea.name);
          window.location.href = `teas/index.html?${params.toString()}`;
        });
      });
    }
    suggest.classList.add('hero__search-suggest--open');
  }

  /* ---------- 工具函数 ---------- */
  function getCategoryColor(key) {
    const cat = CATEGORIES.find(c => c.key === key);
    return cat ? cat.color : '#8B7355';
  }

  function getCategoryName(key) {
    const cat = CATEGORIES.find(c => c.key === key);
    return cat ? cat.name : '';
  }

  function onCardPlaceholder(e) {
    e.preventDefault();
    if (e.target.closest('[data-fav]')) return;
    if (!currentRandomId) return;
    window.location.href = `teas/detail.html?id=${currentRandomId}`;
  }

})();
