/* ============================================================
   茶·图鉴 —— 公共交互库
   全局挂载: window.TEA_COMMON
   功能: 导航栏注入、Toast、登录模态框、localStorage 工具、SVG 图标
   所有页面 <body> 顶部需要 <div id="nav-placeholder"></div> 和 <div id="modal-root"></div>
   ============================================================ */

(function () {
  'use strict';

  /* ---------- SVG 图标库 ---------- */
  const ICONS = {
    leaf: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.5c1 1.66.6 6-2 9-2 2.4-6.2 3-6.2 3zM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>',
    heartFilled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 12h16M4 6h16M4 18h16"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>',
  };

  function getIcon(name, size) {
    const svg = ICONS[name] || '';
    if (!svg) return '';
    if (size) return svg.replace('<svg', `<svg width="${size}" height="${size}"`);
    return svg;
  }

  /* ---------- localStorage 收藏管理 ---------- */
  const FAV_KEY = 'tea_favorites';
  const USER_KEY = 'tea_current_user';

  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    } catch (e) { return []; }
  }

  function isFavorited(teaId) {
    return getFavorites().includes(Number(teaId));
  }

  function toggleFavorite(teaId) {
    const id = Number(teaId);
    const list = getFavorites();
    const idx = list.indexOf(id);
    if (idx > -1) {
      list.splice(idx, 1);
      localStorage.setItem(FAV_KEY, JSON.stringify(list));
      return false; // 已取消
    } else {
      list.push(id);
      localStorage.setItem(FAV_KEY, JSON.stringify(list));
      return true;  // 已收藏
    }
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (e) { return null; }
  }

  function setCurrentUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }

  /* ---------- Toast ---------- */
  function showToast(message, type = 'info', duration = 2800) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toast-out 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ---------- 登录模态框 ---------- */
  let modalOpen = false;
  let modalReturnUrl = null; // 登录成功后跳转的页面

  function openLoginModal(returnUrl) {
    modalReturnUrl = returnUrl || null;
    if (modalOpen) return;
    modalOpen = true;

    const root = document.getElementById('modal-root');
    if (!root) {
      console.warn('common.js: 页面缺少 #modal-root 容器');
      return;
    }

    root.innerHTML = `
      <div class="modal-backdrop modal-backdrop--open" id="login-backdrop">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title" id="modal-title">登录</h3>
            <button class="modal__close" id="modal-close" aria-label="关闭">${getIcon('close', 20)}</button>
          </div>
          <div class="modal__body">
            <div class="modal__tabs">
              <button class="modal__tab modal__tab--active" data-tab="login">登录</button>
              <button class="modal__tab" data-tab="register">注册</button>
            </div>
            <form id="login-form" class="auth-form">
              <div class="form-group">
                <label class="form-label">用户名</label>
                <input type="text" class="form-input" id="auth-username" placeholder="请输入用户名" required maxlength="20">
              </div>
              <div class="form-group">
                <label class="form-label">密码</label>
                <input type="password" class="form-input" id="auth-password" placeholder="请输入密码" required minlength="6">
              </div>
              <button type="submit" class="btn btn--primary" style="width:100%">登 录</button>
            </form>
            <form id="register-form" class="auth-form hidden">
              <div class="form-group">
                <label class="form-label">用户名</label>
                <input type="text" class="form-input" id="auth-reg-username" placeholder="3-20 字符" required maxlength="20">
                <div class="form-hint" id="reg-hint"></div>
              </div>
              <div class="form-group">
                <label class="form-label">密码</label>
                <input type="password" class="form-input" id="auth-reg-password" placeholder="至少 6 位" required minlength="6">
              </div>
              <div class="form-group">
                <label class="form-label">确认密码</label>
                <input type="password" class="form-input" id="auth-reg-password2" placeholder="再次输入密码" required>
              </div>
              <button type="submit" class="btn btn--primary" style="width:100%">注 册</button>
            </form>
          </div>
          <div class="modal__footer">
            <span style="font-size:12px;color:var(--text-muted)">
              MVP 演示模式：登录/注册均直接通过
            </span>
          </div>
        </div>
      </div>
    `;

    // 绑定关闭
    const backdrop = document.getElementById('login-backdrop');
    const closeBtn = document.getElementById('modal-close');
    backdrop.addEventListener('click', closeLoginModal);
    closeBtn.addEventListener('click', closeLoginModal);
    document.addEventListener('keydown', onEscClose);

    // Tab 切换
    root.querySelectorAll('.modal__tab').forEach(tab => {
      tab.addEventListener('click', () => {
        root.querySelectorAll('.modal__tab').forEach(t => t.classList.remove('modal__tab--active'));
        tab.classList.add('modal__tab--active');
        if (tab.dataset.tab === 'login') {
          document.getElementById('modal-title').textContent = '登录';
          document.getElementById('login-form').classList.remove('hidden');
          document.getElementById('register-form').classList.add('hidden');
        } else {
          document.getElementById('modal-title').textContent = '注册';
          document.getElementById('login-form').classList.add('hidden');
          document.getElementById('register-form').classList.remove('hidden');
        }
      });
    });

    // 登录表单
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('auth-username').value.trim();
      setCurrentUser({ username, loginTime: Date.now() });
      showToast(`欢迎回来，${username}`, 'success');
      closeLoginModal();
      updateNavAuthState();
    });

    // 注册表单
    document.getElementById('register-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('auth-reg-username').value.trim();
      const p = document.getElementById('auth-reg-password').value;
      const p2 = document.getElementById('auth-reg-password2').value;
      const hint = document.getElementById('reg-hint');
      hint.classList.remove('form-hint--error');

      if (u.length < 3 || u.length > 20) {
        hint.textContent = '用户名需 3-20 字符';
        hint.classList.add('form-hint--error'); return;
      }
      if (p.length < 6) {
        hint.textContent = '密码至少 6 位';
        hint.classList.add('form-hint--error'); return;
      }
      if (p !== p2) {
        hint.textContent = '两次密码不一致';
        hint.classList.add('form-hint--error'); return;
      }
      setCurrentUser({ username: u, loginTime: Date.now() });
      showToast(`注册成功，欢迎 ${u}！`, 'success');
      closeLoginModal();
      updateNavAuthState();
    });
  }

  function closeLoginModal() {
    modalOpen = false;
    modalReturnUrl = null;
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
    document.removeEventListener('keydown', onEscClose);
  }

  function onEscClose(e) {
    if (e.key === 'Escape') closeLoginModal();
  }

  function logout() {
    setCurrentUser(null);
    showToast('已退出登录', 'info');
    updateNavAuthState();
  }

  /* ---------- 导航栏渲染 ---------- */
  // opts.isHome: 是否首页（决定透明/纯白初始态）
  // opts.brandActive: 当前激活的导航项
  function renderNav(opts = {}) {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) {
      console.warn('common.js: 页面缺少 #nav-placeholder 容器');
      return;
    }

    const isHome = !!opts.isHome;
    const active = opts.active || ''; // 'home' | 'teas' | 'my'

    // 自动检测当前页面层级，生成正确的路径前缀
    // 文件层级: /原型/index.html (level 0) vs /原型/teas/index.html (level 1)
    const pathname = window.location.pathname;
    const isInTeasDir = pathname.includes('/teas/') || pathname.endsWith('/teas');
    const P = isInTeasDir ? '../' : '';   // 路径前缀
    const HOME_HREF    = `${P}index.html`;
    const TEAS_HREF    = `${P}teas/index.html`;

    const homeActive   = active === 'home'   ? 'nav__link--active' : '';
    const teasActive   = active === 'teas'   ? 'nav__link--active' : '';

    placeholder.innerHTML = `
      <nav class="nav ${isHome ? '' : 'nav--solid'}" id="main-nav">
        <div class="nav__inner">
          <div class="nav__left">
            <a href="${HOME_HREF}" class="nav__logo">
              <span class="nav__logo-icon">${getIcon('leaf', 40)}</span>
              <span class="nav__logo-text">茶·图鉴</span>
            </a>
            <ul class="nav__links">
              <li><a href="${HOME_HREF}" class="nav__link ${homeActive}">首页</a></li>
              <li><a href="${TEAS_HREF}" class="nav__link ${teasActive}">六大茶类</a></li>
            </ul>
          </div>
          <div class="nav__right">
            <button class="nav__search-btn" id="nav-search" title="搜索">${getIcon('search', 18)}</button>
            <div id="nav-auth-area"><!-- 登录/用户信息，JS 动态填充 --></div>
            <button class="nav__hamburger" id="nav-hamburger" aria-label="菜单">${getIcon('menu', 24)}</button>
          </div>
        </div>
      </nav>
      <div class="nav__drawer-backdrop" id="nav-drawer-backdrop"></div>
      <aside class="nav__drawer" id="nav-drawer">
        <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;">
          <li><a href="${HOME_HREF}" class="nav__link ${homeActive}" style="display:block;padding:12px 0;">首页</a></li>
          <li><a href="${TEAS_HREF}" class="nav__link ${teasActive}" style="display:block;padding:12px 0;">六大茶类</a></li>
        </ul>
        <div id="nav-drawer-auth" style="margin-top:24px;"></div>
      </aside>
    `;

    // 绑定汉堡菜单
    const hamburger = document.getElementById('nav-hamburger');
    const drawer = document.getElementById('nav-drawer');
    const backdrop = document.getElementById('nav-drawer-backdrop');
    function openDrawer() { drawer.classList.add('nav__drawer--open'); backdrop.classList.add('nav__drawer-backdrop--open'); }
    function closeDrawer() { drawer.classList.remove('nav__drawer--open'); backdrop.classList.remove('nav__drawer-backdrop--open'); }
    hamburger.addEventListener('click', openDrawer);
    backdrop.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));

    // 搜索按钮跳转
    const navSearch = document.getElementById('nav-search');
    navSearch.addEventListener('click', () => {
      window.location.href = TEAS_HREF;
    });

    updateNavAuthState();
  }

  function getPagePrefix() {
    // 与 renderNav 里逻辑一致：检测当前是否在子目录
    const pathname = window.location.pathname;
    const isInTeasDir = pathname.includes('/teas/') || pathname.endsWith('/teas');
    return isInTeasDir ? '../' : '';
  }

  function updateNavAuthState() {
    const P = getPagePrefix();
    const TEAS_HREF = `${P}teas/index.html`;
    const user = getCurrentUser();
    const area = document.getElementById('nav-auth-area');
    const drawerArea = document.getElementById('nav-drawer-auth');
    if (!area) return;

    if (user) {
      area.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <a href="${TEAS_HREF}" class="btn btn--ghost" style="height:40px">我的清单</a>
          <button class="btn btn--secondary" id="nav-logout" style="height:40px">${user.username} · 退出</button>
        </div>
      `;
      if (drawerArea) {
        drawerArea.innerHTML = `
          <div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">已登录：${user.username}</div>
          <button class="btn btn--primary" id="nav-drawer-logout" style="width:100%">退出登录</button>
        `;
        const dlo = document.getElementById('nav-drawer-logout');
        if (dlo) dlo.addEventListener('click', logout);
      }
      const lo = document.getElementById('nav-logout');
      if (lo) lo.addEventListener('click', logout);
    } else {
      area.innerHTML = `
        <button class="btn btn--secondary" id="nav-login" style="height:40px">登录</button>
      `;
      if (drawerArea) {
        drawerArea.innerHTML = `
          <button class="btn btn--primary" id="nav-drawer-login" style="width:100%">登录 / 注册</button>
        `;
        const dli = document.getElementById('nav-drawer-login');
        if (dli) dli.addEventListener('click', () => openLoginModal());
      }
      const li = document.getElementById('nav-login');
      if (li) li.addEventListener('click', () => openLoginModal());
    }
  }

  /* ---------- 首页导航栏滚动效果 ---------- */
  // 在首页调用：initHomeNavScroll()
  function initHomeNavScroll() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    const heroHeight = 320; // Hero 区大致高度，超过后切换为纯白
    function update() {
      if (window.scrollY > heroHeight) {
        nav.classList.add('nav--solid');
      } else {
        nav.classList.remove('nav--solid');
      }
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- 收藏按钮通用渲染 ---------- */
  // elem: DOM 元素，teaId: number
  // 渲染后按钮会自动绑定 toggle 点击
  function renderFavBtn(elem, teaId) {
    const active = isFavorited(teaId);
    elem.className = `btn btn--icon btn--fav ${active ? 'btn--fav--active' : ''}`;
    elem.innerHTML = active ? getIcon('heartFilled', 18) : getIcon('heart', 18);
    elem.title = active ? '取消收藏' : '收藏';
    elem.onclick = (e) => {
      e.preventDefault();
      const isNew = toggleFavorite(teaId);
      renderFavBtn(elem, teaId);
      showToast(isNew ? '已加入我的清单 ❤️' : '已取消收藏', isNew ? 'success' : 'info');
    };
  }

  /* ---------- 面包屑生成 ---------- */
  function renderBreadcrumb(items) {
    // items: [{label, href?}, ...]
    const parts = items.map((it, i) => {
      if (i === items.length - 1) {
        return `<span class="breadcrumb__current">${it.label}</span>`;
      }
      const link = it.href ? `<a href="${it.href}">${it.label}</a>` : `<span>${it.label}</span>`;
      return `${link}<span class="breadcrumb__sep">›</span>`;
    });
    return `<nav class="breadcrumb">${parts.join('')}</nav>`;
  }

  /* ---------- 挂载导出 ---------- */
  window.TEA_COMMON = {
    ICONS, getIcon,
    getFavorites, isFavorited, toggleFavorite,
    getCurrentUser, setCurrentUser, logout,
    showToast,
    openLoginModal, closeLoginModal,
    renderNav, updateNavAuthState, initHomeNavScroll,
    renderFavBtn, renderBreadcrumb,
  };

})();
