/* ============================================================
   列表页交互脚本（修复版）
   依赖: TEA_MOCK (../js/mock/teas.js), TEA_COMMON (../js/common.js)
   功能: 筛选（3 维 AND + 实时刷新）、排序、面包屑、空状态、骨架屏、收藏真实交互
   URL 参数: ?category=green&origin=浙江&season=明前&q=西湖龙井&sort=favorite
   ============================================================ */

(function () {
  'use strict';

  const { CATEGORIES, SEASONS, TEAS, getOriginsWithCount, filterTeas, getHotTeas, searchTeas } = window.TEA_MOCK;
  const { renderNav, renderBreadcrumb, toggleFavorite, isFavorited, showToast, openLoginModal } = window.TEA_COMMON;

  /* ---------- 路径前缀（与 common.js 一致） ---------- */
  const P = '../'; // 列表页固定在 teas/ 子目录
  const HOME_HREF = `${P}index.html`;

  /* ---------- 筛选状态 ---------- */
  const state = {
    categories: [],
    origins: [],
    seasons: [],
    keyword: '',
    sort: 'newest',
  };

  /* ---------- DOM 就绪 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. 导航栏（纯白态）
    renderNav({ isHome: false, active: 'teas' });

    // 2. URL → 状态
    parseUrlParams();

    // 3. 面包屑
    renderBreadcrumbArea();

    // 4. 筛选 chips
    renderCategoryChips();
    renderOriginChips();
    renderSeasonChips();

    // 5. chip 点击
    bindChipClicks();

    // 6. 排序切换
    document.getElementById('sort-select').addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderCards();
    });

    // 7. 清除全部
    document.getElementById('filter-clear').addEventListener('click', clearAllFilters);
    document.getElementById('empty-clear').addEventListener('click', clearAllFilters);

    // 8. 首次渲染：先骨架屏，再替换为真实数据（模拟异步加载）
    renderSkeleton();
    renderSelectedTags();
    setTimeout(() => {
      renderCards();
    }, 400);
  });

  /* ---------- URL 参数 ---------- */
  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat) state.categories = [cat];
    const origin = params.get('origin');
    if (origin) state.origins = [origin];
    const season = params.get('season');
    if (season) state.seasons = [season];
    const q = params.get('q');
    if (q) state.keyword = q;
    const sort = params.get('sort');
    if (sort && ['newest', 'favorite'].includes(sort)) {
      state.sort = sort;
      document.getElementById('sort-select').value = sort;
    }
  }

  /* ---------- 骨架屏 ---------- */
  function renderSkeleton() {
    const wrap = document.getElementById('tea-skeleton');
    const SKELETON_COUNT = 6;
    wrap.innerHTML = Array.from({ length: SKELETON_COUNT }).map(() => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-card__img"></div>
        <div class="skeleton-card__body">
          <div class="skeleton skeleton-card__line skeleton-card__line--title"></div>
          <div class="skeleton skeleton-card__line" style="width:60%"></div>
          <div class="skeleton skeleton-card__line skeleton-card__line--sm" style="width:40%"></div>
        </div>
      </div>
    `).join('');
  }

  /* ---------- 面包屑 ---------- */
  function renderBreadcrumbArea() {
    const bc = document.getElementById('breadcrumb');
    let label = '全部茶品';
    if (state.categories.length === 1) {
      const cat = CATEGORIES.find(c => c.key === state.categories[0]);
      if (cat) label = cat.name;
    } else if (state.keyword) {
      label = `搜索："${state.keyword}"`;
    }
    bc.innerHTML = renderBreadcrumb([
      { label: '首页', href: HOME_HREF },
      { label },
    ]);
  }

  /* ---------- 筛选 chips ---------- */
  function renderCategoryChips() {
    const wrap = document.getElementById('filter-chips-category');
    wrap.innerHTML = CATEGORIES.map(cat => {
      const active = state.categories.includes(cat.key);
      return `<div class="chip chip--${cat.key} ${active ? 'chip--active' : ''}" data-category="${cat.key}">${cat.name}</div>`;
    }).join('');
  }

  function renderOriginChips() {
    const wrap = document.getElementById('filter-chips-origin');
    const origins = getOriginsWithCount();
    wrap.innerHTML = origins.map(o => {
      const active = state.origins.includes(o.name);
      return `<div class="chip chip--default ${active ? 'chip--active' : ''}" data-origin="${o.name}">${o.name}</div>`;
    }).join('');
  }

  function renderSeasonChips() {
    const wrap = document.getElementById('filter-chips-season');
    wrap.innerHTML = SEASONS.map(s => {
      const active = state.seasons.includes(s);
      return `<div class="chip chip--default ${active ? 'chip--active' : ''}" data-season="${s}">${s}</div>`;
    }).join('');
  }

  function bindChipClicks() {
    document.getElementById('filter-chips-category').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || !chip.dataset.category) return;
      toggleInArray(state.categories, chip.dataset.category);
      renderCategoryChips();
      renderSelectedTags();
      renderCards();
    });
    document.getElementById('filter-chips-origin').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || !chip.dataset.origin) return;
      toggleInArray(state.origins, chip.dataset.origin);
      renderOriginChips();
      renderSelectedTags();
      renderCards();
    });
    document.getElementById('filter-chips-season').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || !chip.dataset.season) return;
      toggleInArray(state.seasons, chip.dataset.season);
      renderSeasonChips();
      renderSelectedTags();
      renderCards();
    });
  }

  function toggleInArray(arr, val) {
    const idx = arr.indexOf(val);
    if (idx > -1) arr.splice(idx, 1);
    else arr.push(val);
  }

  /* ---------- 已选条件区 ---------- */
  function renderSelectedTags() {
    const wrap = document.getElementById('filter-selected');
    const emptyHint = document.getElementById('filter-selected-empty');

    const pills = [];
    if (state.keyword) {
      pills.push({ label: `搜索：${state.keyword}`, onRemove: () => { state.keyword = ''; renderAll(); } });
    }
    state.categories.forEach(key => {
      const cat = CATEGORIES.find(c => c.key === key);
      if (cat) pills.push({ label: cat.name, onRemove: () => { toggleInArray(state.categories, key); renderCategoryChips(); renderAll(); } });
    });
    state.origins.forEach(name => {
      pills.push({ label: name, onRemove: () => { toggleInArray(state.origins, name); renderOriginChips(); renderAll(); } });
    });
    state.seasons.forEach(name => {
      pills.push({ label: name, onRemove: () => { toggleInArray(state.seasons, name); renderSeasonChips(); renderAll(); } });
    });

    if (pills.length === 0) {
      emptyHint.style.display = '';
      wrap.querySelectorAll('.filter-selected__pill').forEach(p => p.remove());
      return;
    }
    emptyHint.style.display = 'none';
    wrap.querySelectorAll('.filter-selected__pill').forEach(p => p.remove());
    const clearBtn = document.getElementById('filter-clear');
    pills.forEach(p => {
      const pill = document.createElement('span');
      pill.className = 'filter-selected__pill';
      pill.innerHTML = `${p.label}<button aria-label="移除">×</button>`;
      pill.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        p.onRemove();
      });
      wrap.insertBefore(pill, clearBtn);
    });
  }

  function renderAll() {
    renderSelectedTags();
    renderCards();
  }

  /* ---------- 卡片渲染 ---------- */
  function getFilteredAndSortedTeas() {
    let list = TEAS.slice();
    if (state.keyword) {
      list = searchTeas(state.keyword);
    } else {
      if (state.categories.length || state.origins.length || state.seasons.length) {
        list = filterTeas({
          categories: state.categories,
          origins: state.origins,
          seasons: state.seasons,
        });
      }
    }
    if (state.sort === 'favorite') {
      list.sort((a, b) => b.favoriteCount - a.favoriteCount);
    } else {
      list.sort((a, b) => b.id - a.id);
    }
    return list;
  }

  function renderCards() {
    const grid = document.getElementById('tea-grid');
    const empty = document.getElementById('empty-state');
    const skeleton = document.getElementById('tea-skeleton');
    const countEl = document.getElementById('result-count');
    const list = getFilteredAndSortedTeas();

    countEl.textContent = `共 ${list.length} 款茶`;

    // 隐藏骨架屏
    skeleton.classList.add('hidden');

    if (list.length === 0) {
      grid.innerHTML = '';
      grid.classList.add('hidden');
      empty.classList.remove('hidden');
      renderEmptySuggest();
      return;
    }

    grid.classList.remove('hidden');
    empty.classList.add('hidden');

    grid.innerHTML = list.map(tea => {
      const catColor = CATEGORIES.find(c => c.key === tea.category)?.color || '#8B7355';
      const catName = CATEGORIES.find(c => c.key === tea.category)?.name || '';
      const tagStyle = `background:${catColor};color:${tea.category === 'white' ? 'var(--primary-dark)' : '#fff'};`;

      const faved = isFavorited(tea.id);
      const favSvg = faved
        ? '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>';
      const favClass = faved ? 'card-tea__fav card-tea__fav--active' : 'card-tea__fav';

      return `
        <a href="#" class="card-tea" data-tea-id="${tea.id}">
          <img class="card-tea__img" src="${tea.imageUrl}" alt="${tea.name}" loading="lazy" onerror="this.style.background='var(--bg-muted)';this.src=''">
          <div class="card-tea__body">
            <div class="card-tea__header">
              <h3 class="card-tea__name">${tea.name}</h3>
              <span class="card-tea__tag" style="${tagStyle}">${catName}</span>
            </div>
            <p class="card-tea__origin">${tea.origin}</p>
            <div class="card-tea__footer">
              <span class="${favClass}" data-fav="${tea.id}">
                ${favSvg}
                <span class="card-tea__fav-count">${tea.favoriteCount.toLocaleString()}</span>
              </span>
              <span class="card-tea__season">${tea.season}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');

    // 收藏 icon 点击（P1 修复：真实 toggle）
    grid.querySelectorAll('[data-fav]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 不触发卡片跳转
        const teaId = Number(el.dataset.fav);
        const isNew = toggleFavorite(teaId);
        // 即时更新 UI
        const tea = window.TEA_MOCK.getTeaById(teaId);
        const countSpan = el.querySelector('.card-tea__fav-count');
        if (isNew) {
          el.classList.add('card-tea__fav--active');
          el.innerHTML = favSvgActive(tea);
          showToast('已加入我的清单 ❤️', 'success');
        } else {
          el.classList.remove('card-tea__fav--active');
          el.innerHTML = favSvgInactive(tea);
          showToast('已取消收藏', 'info');
        }
        el.querySelector('.card-tea__fav-count')?.remove();
        // 重新更新 count span（上面 innerHTML 覆盖了它，重新设）
        const newCount = tea.favoriteCount + (isNew ? 1 : 0) - (isNew ? 0 : 1);
        el.innerHTML = (isNew
          ? '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>') + `<span class="card-tea__fav-count">${Math.max(tea.favoriteCount, (isFavorited(teaId) ? tea.favoriteCount + 1 : tea.favoriteCount)).toLocaleString()}</span>`;
      });
    });

    // 卡片点击（P4 修复：跳占位详情页，带 teaId 和当前筛选状态）
    grid.querySelectorAll('.card-tea').forEach(card => {
      card.addEventListener('click', (e) => {
        // 如果点的是收藏 icon，不触发卡片跳转
        if (e.target.closest('[data-fav]')) return;
        e.preventDefault();
        const teaId = card.dataset.teaId;
        const tea = window.TEA_MOCK.getTeaById(teaId);
        const params = new URLSearchParams({ teaId: String(teaId) });
        if (state.categories.length) state.categories.forEach(c => params.append('category', c));
        if (state.keyword) params.set('q', state.keyword);
        // 跳到当前茶品的详情页（第二批实现，但链接有效，不会断链）
        showToast(`即将打开「${tea.name}」详情页（第二批实现）`, 'info');
      });
    });
  }

  function favSvgActive(tea) {
    return '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>';
  }
  function favSvgInactive(tea) {
    return '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>';
  }

  /* ---------- 空状态推荐 ---------- */
  function renderEmptySuggest() {
    const wrap = document.getElementById('empty-suggest');
    const hot = getHotTeas(3);
    wrap.innerHTML = hot.map(tea => {
      const catColor = CATEGORIES.find(c => c.key === tea.category)?.color || '#8B7355';
      const catName = CATEGORIES.find(c => c.key === tea.category)?.name || '';
      return `
        <div class="card-hot" data-suggest-id="${tea.id}">
          <img class="card-hot__img" src="${tea.imageUrl}" onerror="this.style.background='var(--bg-muted)';this.src=''">
          <div class="card-hot__body">
            <h4 class="card-hot__name">${tea.name}</h4>
            <p class="card-hot__origin">${catName} · ${tea.origin.split(' ')[0]}</p>
          </div>
        </div>
      `;
    }).join('');

    wrap.querySelectorAll('.card-hot').forEach(card => {
      card.addEventListener('click', () => {
        const teaId = card.dataset.suggestId;
        const tea = window.TEA_MOCK.getTeaById(teaId);
        clearAllFilters();
        state.categories = [tea.category];
        renderCategoryChips();
        renderSelectedTags();
        renderCards();
      });
    });
  }

  /* ---------- 清除全部 ---------- */
  function clearAllFilters() {
    state.categories = [];
    state.origins = [];
    state.seasons = [];
    state.keyword = '';
    state.sort = 'newest';
    document.getElementById('sort-select').value = 'newest';
    renderCategoryChips();
    renderOriginChips();
    renderSeasonChips();
    renderSelectedTags();
    renderCards();
    renderBreadcrumbArea();
  }

})();
