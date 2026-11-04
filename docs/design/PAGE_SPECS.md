# 茶·图鉴 —— 页面功能规格文档（PAGE_SPECS）

> **版本**：v1.0（第一批原型阶段）  
> **日期**：2026-11-04  
> **适用范围**：学生端（游客 + 注册用户）全部 MVP 页面  
> **与 PRD 对应**：v1.1 定稿 M1-M7 模块  
> **与设计规范对应**：docs/design/DESIGN_SYSTEM.md（方案一：清新水墨）

---

## 一、页面清单总览

| # | 页面 | 路由 | 登录要求 | 第二批 |
|---|---|---|---|---|
| P1 | 首页 | `原型/index.html` | ❌ | — |
| P2 | 茶品列表页 | `原型/teas/index.html` | ❌ | — |
| P3 | 茶品详情页 | 第二批做 | ❌ | ✅ |
| P4 | 收藏清单页 | 第二批做 | ✅ | ✅ |
| P5 | 分享清单公开页 | 第二批做 | ❌ | ✅ |
| P6 | 登录/注册模态框 | （弹窗形式，无独立路由） | N/A | — |
| A1-A5 | 管理员后台 | 第二批做 | ✅ 管理员 | ✅ |

---

## 二、P1 首页

**文件**：`原型/index.html` + `原型/js/home.js` + `原型/js/common.js`（导航栏/Toast/登录）

### 2.1 主要用途

品牌首页 + 六大茶类快速入口 + 热门推荐 + 随机发现 + Hero 搜索。游客登录后导航栏右侧切换为用户信息。

### 2.2 主要区块

| 区块 | 内容 | 数据来源 | 交互 |
|---|---|---|---|
| **导航栏** | Logo（茶叶 SVG + "茶·图鉴"）、首页/六大茶类链接、搜索按钮、登录/用户信息 | common.js 自动渲染 | 首页透明态 → 滚动 320px 后切换纯白态；点"六大茶类"跳列表页；点登录弹模态框 |
| **Hero** | Badge（🍵 六大茶类·结构化知识库）、主标题（一杯茶的千种风味）、副标题、搜索框 | 静态文案 + 占位输入框 | 搜索框回车跳列表页带 `q=` 参数；输入 150ms debounce 显示下拉建议（最多 6 条，点建议项跳列表页） |
| **六大茶类入口** | 6 张 category-card：emoji 图标 + 茶类名 + 已收录数量 | `TEA_MOCK.getCategoriesWithCount()` | 点卡片跳列表页带 `?category={key}`；hover 顶部出现对应茶类色 3px 彩条 |
| **热门推荐** | 横向滚动卡片轨道：8 张 card-hot（图片 16:11 + 名称 + 产地 + 茶类 tag + 收藏数） | `TEA_MOCK.getHotTeas(8)` 按 favoriteCount 降序 | 左右箭头按钮；鼠标拖拽；点卡片跳列表页带该茶所在 category |
| **随机发现** | card-random（大图 16:9 + 名称 + 茶类 tag + 收藏数 + 冲泡参数 🌡℃/🫖g/⏱s）+ 右侧"换一批"按钮 | `TEA_MOCK.getRandomTea(currentId)` 排除上一条 | 点"换一批"→ 400ms 旋转动画 + 即时换一款 |
| **页脚** | 品牌名 + 描述 + 版权 | 静态 | — |

### 2.3 状态

| 状态 | 触发条件 | 表现 |
|---|---|---|
| 未登录 | localStorage 无 user | 导航栏显示"登录"按钮 |
| 已登录 | localStorage 有 user | 导航栏显示"我的清单 Ghost 按钮 + 用户名·退出" |
| 导航栏透明态 | 滚动 Y < 320px | 背景 transparent |
| 导航栏纯白态 | 滚动 Y ≥ 320px | 背景 #FFFFFF + 底部 1px border |
| 搜索建议无结果 | 关键词无匹配 | 下拉显示"没有找到相关茶品"提示 |

### 2.4 URL 参数

无。首页本身不解析参数。

---

## 三、P2 茶品列表页

**文件**：`原型/teas/index.html` + `原型/teas/index.js` + `原型/js/common.js`

### 3.1 主要用途

结构化浏览六大茶类，支持三维度筛选 + 关键词搜索 + 排序，显示卡片网格。

### 3.2 主要区块

| 区块 | 内容 | 数据来源 | 交互 |
|---|---|---|---|
| **导航栏** | 纯白态（`nav--solid`）、首页/六大茶类链接、搜索按钮、登录/用户信息 | common.js | 点 Logo 回首页；点"首页"回首页；点搜索按钮跳列表页 |
| **面包屑** | 首页 › {全部茶类 / 茶类名 / 搜索："xxx"} | JS 动态生成 | 点"首页"回首页 |
| **筛选面板** | 三大分组（六大茶类 / 产地 / 采摘季节），每组 6~15 个 chip | `CATEGORIES` / `getOriginsWithCount()` / `SEASONS` | 点 chip toggle 选中态；六大茶类 chip 各有专属色 |
| **已选条件区** | pill 列表（每个可 × 移除）+ 清除全部按钮 | state 动态渲染 | 点 × 单独移除；点"清除全部"重置全部筛选 + 排序 |
| **排序栏** | 结果数（共 N 款茶）+ 排序下拉（最新上架 / 收藏最多） | 实时计算 | 切换排序即时刷新卡片 |
| **骨架屏** | 6 个 skeleton-card（图片占位 + 标题占位 + 次文字占位） | 纯 CSS shimmer 动画 | 页面加载前 400ms 显示，之后替换为真实数据 |
| **卡片网格** | 3列（桌面）/ 2列（平板）/ 1列（移动）card-tea：图片 16:10 + 名称 + 六大茶类 tag + 产地 + ⚠️收藏 icon + 采摘季节 | `getFilteredAndSortedTeas()` | 点收藏 icon 即时 toggle（实心/空心 + localStorage）并 Toast；点卡片 body 触发详情页占位 Toast |
| **空状态** | 🫖 图标 + 标题 + 描述 + 清除按钮 + 3 款热门推荐 card-hot | `getHotTeas(3)` | 点"清除"重置；点热门推荐卡 → 跳该茶所在分类 |
| **页脚** | 同首页 | 静态 | — |

### 3.3 筛选逻辑

```
state.keyword 有值 → 优先 searchTeas(keyword)（名称或产地包含）
state.keyword 无值 → AND 三维度筛选 filterTeas({ categories[], origins[], seasons[] })
排序: newest → id 降序（新 mock 数据 id 大即新）
      favorite → favoriteCount 降序
```

### 3.4 URL 参数

| 参数 | 来源 | 解析 | 示例 |
|---|---|---|---|
| `category` | 首页六大茶类入口 / 详情页 tag 点击 | state.categories = [key] | `?category=green` |
| `origin` | （第二批详情页 tag 点击） | state.origins = [name] | `?origin=浙江` |
| `season` | （第二批详情页 tag 点击） | state.seasons = [name] | `?season=明前` |
| `q` | Hero 搜索框回车 / 搜索建议点击 | state.keyword = 关键词 | `?q=西湖龙井` |
| `sort` | 排序下拉 | state.sort = newest/favorite | `?sort=favorite` |

**重要**：当前筛选状态刷新页面后不会持久化（URL 不会实时同步），这是第二批功能。

### 3.5 收藏 icon 交互（P1 修复后）

| 操作 | 行为 | UI 反馈 |
|---|---|---|
| 点收藏 icon（空心 → 实心） | `toggleFavorite(id)` → localStorage push | icon 变实心 ❤️ + Toast "已加入我的清单" + count 数字变化 |
| 点收藏 icon（实心 → 空心） | `toggleFavorite(id)` → localStorage splice | icon 变空心 + Toast "已取消收藏" + count 数字变化 |
| 点卡片 body（避开 icon） | 详情页占位 | Toast "即将打开「xxx」详情页" |

### 3.6 六大茶类标签色在列表页的使用

| 茶类 | chip 未选中 | chip 选中 | card-tea tag 背景 |
|---|---|---|---|
| 绿茶 | outline #5CB85C + 文字 #5CB85C | solid #5CB85C + 白字 | #5CB85C + 白字 |
| 白茶 | outline #D4D0C8 + 深灰字 | solid #D4D0C8 + 深灰字（特殊反转） | #D4D0C8 + 深灰字（特殊反转） |
| 黄茶 | outline #E6C25B + 深棕字 | solid #E6C25B + 白字 | #E6C25B + 白字 |
| 红茶 | outline #C0392B + 文字 #C0392B | solid #C0392B + 白字 | #C0392B + 白字 |
| 乌龙茶 | outline #D35400 + 文字 #D35400 | solid #D35400 + 白字 | #D35400 + 白字 |
| 黑茶 | outline #4A3728 + 文字 #4A3728 | solid #4A3728 + 白字 | #4A3728 + 白字 |

### 3.7 状态

| 状态 | 触发条件 | 表现 |
|---|---|---|
| 骨架屏 | 首次渲染 0~400ms | 6 张 skeleton-card + shimmer 动画 |
| 有结果 | 筛选后 list.length > 0 | 骨架屏隐藏 → 真实卡片网格显示 |
| 空结果 | 筛选后 list.length === 0 | 骨架屏隐藏 → 空状态（🫖 + 清除按钮 + 3 款热门推荐） |
| 筛选已激活 | state 任一维度有值 | 已选条件区显示 pill + "清除全部"按钮可点击 |
| 筛选为空 | state 全部为空 | 已选条件区显示"暂无筛选，显示全部"灰色提示 |

---

## 四、Mock 数据规范（js/mock/teas.js）

### 4.1 数据结构

```javascript
const TEAS = [{
  id: 1,                           // 唯一 ID
  name: '西湖龙井',                 // 茶品名称
  category: 'green',                // 六大茶类 key：green/white/yellow/red/oolong/dark
  origin: '浙江 杭州 西湖狮峰',      // 产地（省级 + 产区，分号分隔）
  season: '明前',                   // 采摘季节枚举值（SEASONS 数组）
  favoriteCount: 2480,              // 收藏数（用于排序）
  imageUrl: 'https://images.unsplash.com/...',  // Unsplash CDN
  shape: '扁平光滑...',              // 外形描述（详情页用）
  soup: '嫩绿明亮...',               // 汤色（详情页用）
  aroma: '豆香清雅...',              // 香气（详情页用）
  taste: '鲜爽甘醇...',              // 滋味（详情页用）
  waterTemp: 85,                    // 冲泡水温（℃）
  teaAmount: 3,                     // 投茶量（g）
  brewTime: 90,                     // 浸泡时间（秒）
  tips: {                           // 小贴士（可空对象）
    history: '...',                 // 历史文化
    suitable: '...',                // 适合人群
    misconception: '...',           // 常见误区
    officialNote: '...'             // 官方备注
  }
}];
```

### 4.2 枚举

| 枚举 | 数组 | 元素 |
|---|---|---|
| CATEGORIES | 6 条 | `{ key, name, color, emoji }` |
| ORIGINS | 15 条 | 省级名字符串 |
| SEASONS | 6 条 | 明前/雨前/春茶/夏茶/秋茶/冬茶 |

### 4.3 查询函数

| 函数 | 返回 | 说明 |
|---|---|---|
| `getCategoriesWithCount()` | CATEGORIES + count 聚合 | 六大茶类入口用 |
| `getOriginsWithCount()` | 产地 + count 聚合 | 筛选产地 chips 用 |
| `getHotTeas(n)` | top N by favoriteCount | 热门推荐、空状态推荐 |
| `getRandomTea(excludeId)` | 一条随机茶（排除上一条） | 随机发现用 |
| `getTeaById(id)` | 单条茶品 | 详情页、Toast 文案 |
| `searchTeas(keyword)` | 匹配 name 或 origin | Hero 搜索、列表页关键词筛选 |
| `filterTeas({ categories, origins, seasons })` | AND 三维度筛选 | 列表页筛选 |

### 4.4 当前数据集

共 **30 条**，六类分布：

| 茶类 | 数量 | 示例 |
|---|---|---|
| 绿茶 | 6 | 西湖龙井、碧螺春、黄山毛峰、安吉白茶、太平猴魁、信阳毛尖 |
| 白茶 | 5 | 白毫银针、白牡丹、老白茶、新贡眉、云南大白茶 |
| 黄茶 | 4 | 君山银针、蒙顶黄芽、霍山黄芽、雅安黄茶 |
| 红茶 | 5 | 正山小种、祁门红茶、金骏眉、滇红功夫、英德红茶 |
| 乌龙茶 | 5 | 大红袍、铁观音、凤凰单丛、冻顶乌龙、东方美人 |
| 黑茶 | 5 | 普洱生茶、普洱熟茶、安化黑茶、六堡茶、雅安藏茶 |

---

## 五、跨页面导航关系

```
            ┌─────────────┐
            │  首页 P1     │
            │  index.html  │
            └──────┬──────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
   六大茶类入口   Hero 搜索   热门卡 / 随机发现
   ?category=x   ?q=关键词    (同 ?category=x)
      │            │            │
      └────────────┼────────────┘
                   ▼
            ┌─────────────┐
            │ 列表页 P2   │
            │ teas/       │
            │ index.html  │
            └──────┬──────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
   筛选 chip     排序        卡片点击
   (实时刷新)    (实时刷新)  (第二批→详情页)
```

### 路径自动适配规则

| 触发文件 | 路径前缀 | 首页 href | 列表页 href |
|---|---|---|---|
| `原型/index.html` | 空（P = ''） | `index.html` ✓ | `teas/index.html` ✓ |
| `原型/teas/index.html` | `../`（P = '../'） | `../index.html` ✓ | `../teas/index.html` ✓ |

路径前缀由 `common.js` 里 `renderNav` 和 `getPagePrefix()` 自动检测 `window.location.pathname` 是否含 `/teas/` 决定。

---

## 六、第二批待实现（标注了优先级）

| # | 页面 | 核心功能 | 依赖 |
|---|---|---|---|
| P3 | 茶品详情页 | 完整图鉴卡片 + 四大感官 + 冲泡参考 + 小贴士 4 块 + tag 点击回筛选 + 收藏按钮 + 笔记按钮 + 分享按钮 | teaId URL 参数 |
| P4 | 收藏清单页 | 默认清单 + 内含茶品列表 + 每条品鉴笔记入口 + 清单标题编辑 | localStorage tea_favorites |
| P5 | 分享清单公开页 | 只读清单 + 一键收藏全部（登录用户） | shareId URL 参数 |
| — | 列表页 URL 同步 | 筛选状态变化时同步写入 URL 参数，刷新持久化 | — |
| — | 首页热门/随机卡收藏按钮 | 独立收藏交互 | toggleFavorite |
| A1 | 管理员登录 | admin 用户名密码模态框 | — |
| A2 | 管理员仪表盘 | 统计卡片 + 最近操作 | — |
| A3-A5 | 茶品管理（列表/新增/编辑） | 表格视图 + 上下架 + 表单 + 图片上传 | — |

---

## 七、已知限制（接受的技术边界）

| # | 限制 | 原因 | 后续 |
|---|---|---|---|
| 1 | 图片依赖 Unsplash CDN，离线无图 | 纯原型不打包图片 | 生产环境替换为本地资源 |
| 2 | 登录/注册直接通过，不校验用户名唯一性 | MVP 演示模式 | 接后端后替换 |
| 3 | 收藏数是静态 mock 数据，toggleFavorite 只操作 ID 不改变 count | 无真实后端 | 接后端后联动 |
| 4 | 列表页筛选状态刷新不持久化（不写 URL） | 第二批做 URL 同步 | 第二批补 |
| 5 | 没有骨架屏以外的异步错误状态（如图片加载失败） | onerror 用 CSS 背景填充了，没有显式提示 | 可后续加 Toast |
| 6 | 热门推荐拖拽滚动在移动端不生效（只有 scroll） | 移动端触摸原生滚动更流畅 | 接受 |
| 7 | 六大茶类入口当前无独立二级页面 | 全部跳转统一列表页带筛选 | 接受 |
