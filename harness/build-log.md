# 开发构建日志（build-log）

| 项 | 值 |
|---|---|
| 用途 | 记录**每次开发任务**做了什么、测了什么、还剩什么 |
| 流程依据 | [DEVELOPMENT_GUIDE.md](../docs/development/DEVELOPMENT_GUIDE.md) · [AGENTS.md](../AGENTS.md) §10.1 |
| 记录顺序 | **最新条目置顶**（按日期倒序） |
| 定位 | 事实流水，不替代任何权威文档 |

---

## 1. 写入规则

1. **每个开发任务交付前追加一条**，无论大小（A/B/C 类都要），A 类可精简为 4 行。
2. **只写真实执行结果**：命令、通过/失败/跳过数量必须与实际一致；未运行的测试写「未运行」，**禁止写"已通过"**。
3. 接口、数据库、安全变更必须在条目中显式写出**已同步的文档与迁移文件**；没有同步不得标记验收通过。
4. 重要技术决策同时产出 [ADR](../docs/development/ADR/README.md)，build-log 只留一行引用，不重复论证过程；C 类决策的 ADR 必须在编码前完成"提议"版本。
5. 不记录密码、Cookie 值、密钥、完整堆栈、`.env` 内容。
6. 遗留问题必须可执行（写清"谁在什么条件下补什么"），不写"后续优化"这类空话。

## 2. 条目模板（复制使用）

```markdown
## YYYY-MM-DD｜<任务名>

- 任务编号 / 分级：TASK-YYYYMMDD-xx / A / B / C（C 类注明"用户确认于 <日期/方式>"）
- 需求来源：<PRD §x / API 端点 / S-xx / 用例 ID / PAGE_SPECS>
- 主要变更：
  - `<文件>`：<要点>
  - `<文件>`：<要点>
- 契约 / 数据 / 安全影响：无 / <端点、字段、表、S 项变更 + 已同步文档与迁移文件>
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; pytest -q -k "AUTH-01"` | AUTH-01 | 1 passed | —— |
  | `npm run test:run -- src/utils/filter.spec.ts` | 前端筛选 | 未运行 | 本节无前端改动 |

- 验收结论：通过 / 有条件通过（写明遗留）/ 不通过
- 基线例外：<本次触及的 AGENTS §3.1 遗留 / 无>
- 遗留问题：
- 回滚方式：
- 关联 ADR：<ADR-XXXX / 无>
```

## 3. 问题复发台账

同一类错误**出现第二次**时，必须登记到下表，并落实至少一项防护：
补自动化测试（标注 TEST_PLAN 用例 ID）、补校验规则、补规范条款或补检查脚本。
连续出现三次仍无防护，视为流程缺陷，需按 C 类提出流程修订。

| 编号 | 现象 | 首次 / 再次出现 | 根因 | 已落实的防护 | 状态 |
|---|---|---|---|---|---|
| —— | 暂无登记 | —— | —— | —— | —— |

---

## 4. 记录

## 2026-11-08｜阶段 4：管理员后台（T4-01 ~ T4-06）

- 任务卡 / 分级：T4-01 ~ T4-06 / **B**（实现 API_CONTRACT §4.6 已定稿的 8 个 admin 端点与后台 5 页；未改契约路径/字段/错误码，未改表结构、认证机制与安全控制）
- 需求来源：PRD FR-6.1~6.5、模块 6；API_CONTRACT §4.6.1~§4.6.8；MODULE_DESIGN M6；DATA_MODEL `teas`/`tea_tips`/`operation_logs`；PAGE_SPECS 后台 A1~A5；SECURITY S-08/S-11/S-14/S-19/S-20/S-23/S-24/S-28；TEST_PLAN PERM-01~04、TEA-01~07、UPLOAD-01~05
- 主要变更：
  - **后端（T4-01 权限）**
    - `app/routers/admin.py`：router 级 `Depends(get_admin_user)` 先于参数校验执行；8 端点全部由后端鉴权
    - `backend/tests/test_admin.py`（新建）：游客 401/40100、普通用户 403/40300、角色实时读库、非法参数仍先返回 401/403
  - **后端（T4-02 ~ T4-06）**
    - `app/schemas/admin.py`（新建）：后台列表/统计/上下架/小贴士/上传响应 DTO；`extra='forbid'`
    - `app/schemas/tea.py`：`TeaBaseRequest` / `TeaCreateRequest` / `TeaUpdateRequest` 全量校验（枚举、必填非空、水温 70–100、最多 1 位小数、主图协议白名单）；`is_active`/`favorite_count`/`id` 不在请求体
    - `app/repositories/admin_repo.py`（新建）：含下架列表/状态筛选/分页、统计、写入与 operation_logs；只 add/flush，不 commit
    - `app/services/admin.py`（新建）：新增/编辑/上下架/小贴士/统计/上传业务；写操作与日志同事务；编辑 PUT 全量替换；小贴士省略保持、null/空白清空
    - `app/services/upload.py`（新建）：分块读取，>5 MB 立即 413/41300；JPEG/PNG/WebP 魔数判定，非法 415/41500；UUID 文件名；落盘路径强制在 `uploads/` 内
    - `app/main.py`：静态挂载目录与 `settings.UPLOAD_DIR` 对齐
    - `app/core/response.py`：新增 `FileTooLarge(41300)` / `UnsupportedMedia(41500)` / `InternalError(50000)`
  - **前端（T4-06）**
    - `src/types/index.ts`、`src/api/admin.ts`（新建）：admin 契约类型与 8 个请求封装
    - `src/views/admin/AdminLogin.vue`：管理员登录，非 admin 立即注销会话
    - `src/views/admin/AdminLayout.vue`：侧边栏/顶栏/退出；菜单改用真实路径，修复 `el-menu router` 按路由名跳转 404
    - `src/views/admin/AdminDashboard.vue`：3 张统计卡、六大茶类分布、最近 5 款
    - `src/views/admin/AdminTeas.vue`：茶类/状态/关键词筛选、分页、含下架列表、上下架二次确认
    - `src/views/admin/AdminTeaEdit.vue`：新增/编辑共用表单、主图上传、小贴士、上下架；不出现审核状态
    - `src/api/request.ts`：admin 端点 401 跳转 `/admin/login`
- 契约 / 数据 / 安全影响：**无契约与表结构变更**，无 Alembic 迁移；8 端点按 §4.6 实现。权限门禁、请求体白名单、日志同事务、上传魔数/大小/路径穿越均按 SECURITY 实现；前台可见性沿用既有 `is_active=1` 过滤，收藏与分享条目保留。
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m pytest tests/test_admin.py -q` | PERM/TEA/TIPS/STATS/UPLOAD | **19 passed** | 含 8 端点越权、上下架前台联动、收藏保留灰显、413/415、路径穿越 |
  | `cd backend; python -m pytest -q` | 后端全量 | **80 passed** | 364 warnings（既有 Pydantic/SQL echo），无失败 |
  | `cd backend; python -m ruff check app tests` | 后端 lint | All checks passed | —— |
  | `cd backend; python -m ruff format --check app tests` | 后端格式 | 通过 | —— |
  | `cd frontend; npm run test:run` | Vitest | **25 passed**（3 文件） | 本次未新增纯函数 |
  | `cd frontend; npm run lint` | ESLint | 通过 | —— |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run build` | 生产构建 | 通过 | 仅 chunk >500kB 既有警告 |
  | `python scripts/check_all.py` | 链接/常量/分层/UI/记录/密钥 | **全部通过** | 205 链接；29/60/32/7 一致；五层 0 新增违规 |
  | 浏览器手工冒烟（3 次子代理） | 登录→概览→列表→新增→编辑 | **PASS** | `/admin` 统计卡与分布正常；`/admin/teas` 6 行+筛选；`/admin/teas/new` 表单完整；`/admin/teas/6/edit` 预填正确 |

- 验收结论：通过。首次冒烟发现侧边栏 `el-menu router` 使用路由名导致 404，已改为真实路径并复测；写操作（新增/编辑/上下架/上传提交）由 19 条 pytest 覆盖，浏览器仅做页面渲染与预填冒烟。
- 基线例外：无新增（后台组件使用 Element Plus 属既定规范；前台未新增 EP 引用）
- 遗留问题：
  - 浏览器冒烟未实际提交新增/编辑/上传表单，避免污染种子数据；对应写路径由 backend pytest 覆盖
  - `operation_logs` 仅写入、不提供查询接口（按需求约束）
- 回滚方式：revert 本次提交（移除 admin schema/repo/service、upload service、admin router 实现、`test_admin.py`、前端 admin api 与 5 页实现，恢复占位页与 request 拦截器）
- 关联 ADR：无（均为契约内实现；魔数自研校验未引入新依赖，故不触发技术选型决策）

## 2026-11-08｜阶段 3：收藏清单 + 品鉴笔记 + 分享（T3-01 ~ T3-06）

- 任务卡 / 分级：T3-01 ~ T3-06 / **B**（实现 API_CONTRACT §4.3–§4.5 已定稿的 10 个端点与对应前台页面；未改契约路径/字段/错误码，未改表结构、认证机制与安全控制）
- 需求来源：PRD FR-5.1~5.6；API_CONTRACT §2.4/§2.5/§2.6、§4.3.1~§4.5.4；DATA_MODEL §collection_lists/favorite_items/share_tokens；PAGE_SPECS §六/§七；TEST_PLAN FAV-01~07、NOTE-01~05、SHARE-01~10、PERM-03
- 主要变更：
  - **后端（T3-01 收藏）**
    - `app/schemas/favorite.py`、`app/repositories/favorite_repo.py`：收藏行查询/写入、`favorite_count` 原子 ±1（CASE 保证不低于 0）
    - `app/services/favorites.py`：收藏/取消幂等；下架茶新增收藏 40401、取消/状态允许；行写入与计数同事务；唯一冲突按已收藏处理
    - `app/routers/favorites.py`：POST/DELETE `/{tea_id}`、GET `/{tea_id}/status`
  - **后端（T3-02 清单与笔记）**
    - `app/schemas/list.py`、`app/repositories/list_repo.py`：默认清单 get-or-create、条目联查、标题/笔记更新
    - `app/services/lists.py`：标题 trim 后 2–20 字；笔记 ≤20,000 字、纯空白归一化为 null、清空不删除条目；未收藏写笔记 40430
    - `app/routers/lists.py`：GET `/lists`、PUT `/lists/title`、PUT `/lists/notes/{tea_id}`
    - `app/core/response.py`：新增 `FavoriteNotFound(40430)`
    - `app/core/auth_deps.py`：新增 `get_optional_user`（公开分享页计算 is_owner）
  - **后端（T3-03 分享）**
    - `app/schemas/share.py`、`app/repositories/share_repo.py`：8 位 URL-safe token、生效令牌查询、软撤销
    - `app/services/shares.py`：生成/复用、清单行锁 + 当前读保证并发生成仅一条生效令牌；撤销 403/409、不可复活；公开视图过滤笔记与所有者信息；copy 跳过已收藏/下架并返回 added/skipped/total，保存点兜底并发唯一冲突
    - `app/routers/shares.py`：POST `/generate`、POST `/revoke/{token}`、GET `/{token}`、POST `/{token}/copy`
  - **前端（T3-04 收藏交互）**
    - `src/types/index.ts`、`src/api/favorites.ts`、`src/api/lists.ts`、`src/api/shares.ts`：契约类型与请求封装
    - `src/components/FavoriteButton.vue`：图标/主按钮两态、乐观更新与失败回滚、pending 防重复、未登录跳转并在登录后自动重放收藏
    - `src/components/TeaCard.vue`、`src/views/TeaDetailView.vue`：接入收藏按钮与计数联动
    - 顺带修复：`LoginView.vue` / `RegisterView.vue` 密码输入内联事件经 Prettier 换行后触发 Vue 模板解析错误，提取为 `onPasswordInput` 方法
    - `AppHeader.vue` / `HomeView.vue` / `TeaListView.vue` 仅经 Prettier 全量格式化，无逻辑变更
  - **前端（T3-05 我的清单）**
    - `src/views/MyListView.vue`：标题内联编辑、条目列表、下架灰显、移除、空/错误/加载态、查询参数直达笔记/分享
    - `src/components/NoteEditor.vue`、`src/components/SharePanel.vue`：私密笔记编辑（20,000 字计数）、生成/复制/二次确认撤销
  - **前端（T3-06 分享公开页）**
    - `src/views/ShareView.vue`：只读展示、无笔记/所有者信息、下架灰显、撤销态与推荐、404 态；登录用户一键收藏并展示 added/skipped/total
  - **测试**
    - `backend/tests/test_favorites.py`（8 条，含 20 线程同用户收藏、12 用户并发收藏、10 线程取消）
    - `backend/tests/test_lists.py`（8 条，含 20 线程 get-or-create）
    - `backend/tests/test_shares.py`（10 条，含 20 线程生成令牌/20 线程 copy）
    - `frontend/src/utils/favorite.spec.ts`、`frontend/src/utils/list.spec.ts`（11 条纯函数用例）
- 契约 / 数据 / 安全影响：**无**（端点、字段、错误码均按 API_CONTRACT 实现；未改表结构，无 Alembic 迁移；未放宽 S 项。公开分享响应经测试断言不含 `tasting_note`/`username`/`user_id`）
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m pytest -q -k "FAV or fav_" tests/test_favorites.py` | TC-FAV-01~08 | 8 passed | 含 20 线程同用户收藏、12 用户并发收藏、10 线程并发取消 |
  | `cd backend; python -m pytest -q -k "note or perm or list" tests/test_lists.py` | TC-NOTE-01~05、PERM-03 | 8 passed | 含 20 线程清单 get-or-create |
  | `cd backend; python -m pytest -q -k "share" tests/test_shares.py` | TC-SHARE-01~10、PERM-03 | 10 passed | 含 20 线程生成、20 线程 copy |
  | `cd backend; python -m pytest -q` | 全量后端 | **61 passed** | 254 warnings（Pydantic/SQL echo），无失败 |
  | `cd backend; python -m ruff check app tests` | 后端 lint | All checks passed | —— |
  | `cd frontend; npm run test:run` | Vitest | **25 passed**（3 文件） | 新增 favorite 7 条、list 4 条 |
  | `cd frontend; npm run lint` | ESLint | 通过 | —— |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run build` | 生产构建 | 通过 | 仅 chunk >500kB 既有警告 |
  | 浏览器手工冒烟（Playwright 子代理） | 登录→收藏→我的清单 | PASS | 心形按下、计数 2,180→2,181、`/my` 显示“共 1 款茶” |
  | 浏览器手工冒烟（Playwright 子代理） | 笔记→标题→生成→撤销→旧链接 | PASS | 笔记可见、标题“我的精选茶单”、token `IBLUuslR`、撤销后旧链接显示“这份分享已被撤销” |
  | `python scripts/check_all.py` | 链接/常量/分层/UI/记录/密钥 | **全部通过** | 205 条链接；29/60/32/7 一致；五层 0 违规；前台仅 3 项既有 EP 基线 |

- 验收结论：通过。手工冒烟未覆盖游客态公开页与游客一键收藏，这两项由 `test_share_05/09` pytest 覆盖。
- 基线例外：无新增（未在 `views/components` 直接 import Element Plus；分页、权限与响应字段均按契约）
- 遗留问题：
  - 前端人工冒烟未覆盖游客公开页与“一键收藏全部”的浏览器路径；已由 SHARE-05/09/10 后端用例覆盖，后续 T5-02 可补 Playwright 冒烟
  - `share_tokens.token` 大小写敏感依赖 MySQL 列 collation `utf8mb4_bin`；若未来切换数据库需补等价约束
- 回滚方式：revert 本次提交（移除 T3 新增 schema/repo/service/router、前端组件与页面、三份测试与两份 spec，恢复三个前端占位页与后端路由占位）
- 关联 ADR：无（均为契约内实现，无架构/技术选型变更）

## 2026-11-08｜阶段 2：茶品数据与浏览闭环（T2-01 ~ T2-05）

- 任务卡 / 分级：T2-01 ~ T2-05 / **B**（实现 API_CONTRACT 已定稿的 6 个只读端点与对应前台页面；未改契约路径/字段/响应体，未改表结构、认证机制与安全控制）
- 需求来源：PRD FR-1.1~1.6（列表/筛选/排序/搜索/分页）、FR-2.1~2.3（首页聚合/热门/随机）、FR-3.1（详情）、FR-6.3（下架不物理删除）；API_CONTRACT §4.2.1~§4.2.6、§2.2、§2.3、§2.3.1、§1.6；PAGE_SPECS §3/§4/§5；DESIGN_SYSTEM
- 主要变更：
  - **后端（T2-01）**
    - `app/repositories/tea_repo.py`（新建）：`list_teas` / `list_hot` / `get_random` / `count_by_category` / `count_by_province` / `get_by_id`；省级产地用 `substring_index(origin,' ',1)` 派生；仅查询，无业务判断
    - `app/services/teas.py`：参数解析、枚举校验（非法 → 40000）、keyword ≤50、page/page_size 夹取（上限 50）、sort 稳定次级键、`is_active=1` 过滤；详情不存在 40400 / 下架 40401；查询全部下沉到 repository（清除 §3.1 遗留）
    - `app/routers/teas.py`：6 个只读端点，静态段 `/categories` `/origins` `/hot` `/random` 先于 `/{tea_id}` 注册
    - `app/schemas/tea.py`、`app/schemas/__init__.py`：TeaListItem / TeaListResponse / TeaDetail（tips_* 扁平化、时间输出 `Z`）/ CategoryCount / OriginCount / TeaCreateRequest
    - `tests/test_teas.py`（新建）：20 条用例覆盖 6 端点、筛选组合、排序、分页夹取、搜索、40400/40401、下架隐藏
  - **前端（T2-02 ~ T2-05）**
    - `types/index.ts`：Tea / TeaListItem / TeaListData / CategoryCount / OriginCount / TeaSort / TeaListParams
    - `api/teas.ts`（新建）：6 个只读请求封装，路径与参数严格对齐契约
    - `utils/teaQuery.ts`（新建）+ `utils/teaQuery.spec.ts`（新建）：URL query（`category/origin/season/q/sort/page`）↔ 筛选状态 ↔ API 参数（keyword）双向转换、已选条件标签；14 条纯函数单测
    - `stores/tea.ts`：列表状态（list/total/page/pageSize/loading/error）+ 请求序号防竞态 + 茶类/产地计数缓存
    - `components/AppHeader.vue`、`AppFooter.vue`、`CategoryTag.vue`、`TeaCard.vue`（新建）：全站导航/页脚、茶类标签、图像失败占位茶卡；均无 Element Plus
    - `views/TeaListView.vue`：筛选面板（同维多选 / 跨维 AND，真实请求后端）、已选 pill 单项移除/清空、排序、搜索关键词 pill、URL 回填与前进后退同步、骨架屏、加载失败重试、空结果 + 热门推荐、分页（12 条/页）
    - `views/HomeView.vue`：Hero 搜索 150ms 防抖建议（最多 6 条，真实请求）、六大茶类计数入口、热门轨道（8 条）、随机发现 + 换一批
    - `views/TeaDetailView.vue`：骨架屏、主图失败占位、可点击茶类标签回跳筛选、冲泡参考、四大感官、tips 空值整块隐藏、同类推荐（同 category 排除自身，最多 4）、40400/40401 友好引导 + 3 款热门；收藏/笔记/分享仅入口（未登录跳登录，已登录提示下一阶段）
- 契约 / 数据 / 安全影响：无契约变更（6 端点均按 API_CONTRACT §4.2 实现）；无表结构/迁移变更；无安全控制项变更（只读接口对游客开放，权限不变）。文档无需同步修改。
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m pytest -q` | 后端全量 | **34 passed**（1 health + 13 auth + 20 teas），12 warnings（既有依赖弃用告警） | 覆盖 6 端点与筛选/排序/分页/404 |
  | `cd backend; python -m ruff check app tests` | 后端 lint | All checks passed | —— |
  | `cd backend; python -m ruff format --check app tests` | 后端格式 | 33 files already formatted | 本次格式化 `tests/test_teas.py` |
  | `cd frontend; npm run lint` | ESLint | 通过（无输出即 0 error） | 新组件未引入 Element Plus |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run test:run` | Vitest | **14 passed**（1 file） | `src/utils/teaQuery.spec.ts` |
  | `cd frontend; npm run build` | 生产构建 | 通过（1719 modules，5.11s） | 仅有既有 chunk >500kB 体积告警 |
  | `python scripts/check_all.py` | 链接/常量/分层/UI/记录/密钥 | 全部 OK | 五层遗留 **0 项**；前台 Element Plus 仅剩 3 项既有基线 |
  | 浏览器实测（真实 HTTP） | 列表页 | PASS | 6 张真实卡片；点「绿茶」后 `?category=green` 且仅剩西湖龙井；切「收藏最多」后 `?sort=favorite` |
  | 浏览器实测（真实 HTTP） | 首页 | PASS | 6 类计数各 1（合计 6）；热门 6 张（数据仅 6 条）；随机发现显示西湖龙井；输入「龙井」出现建议 |
  | 浏览器实测（真实 HTTP） | 详情页 `/teas/1` | PASS | 西湖龙井、85℃/3g/90s、四大感官、4 块小贴士；茶类标签跳 `?category=green` |
  | 浏览器实测（真实 HTTP） | 下架 `/teas/3` | PASS | 临时将 id=3 `is_active=0`：显示「这款茶已下架」+ 列表/首页入口 + 3 款热门；**已验证恢复 `is_active=1` 与 `updated_at`** |

- 已确认口径（本阶段）：
  - 40401 响应 `data=null`，无法得知茶类，下架详情引导改用「热门推荐 3 款」而非 PRD 的「同类 3 款」（PAGE_SPECS 对无效 id 同样用热门引导）
  - 详情页收藏/笔记/分享按钮只做入口，写操作属阶段 3
- 验收结论：通过
- 基线例外：未新增。触达 `services/teas.py` 时已把 `db.query` 下沉到 repository，`check_layers` 历史遗留由 2 项降为 0 项；Element Plus 3 项基线未触碰
- 遗留问题：
  - 收藏清单内「下架灰显占位」依赖阶段 3 收藏清单页面，本阶段尚无清单模块；后端详情已按 40401 处理，未物理删除
  - 同类推荐逻辑已实现，但种子数据每类仅 1 款，当前详情页不展示同类卡；补种子数据后自动生效
  - 种子主图为外链 URL（前端原样消费、不构造路径；加载失败已占位）；上传接口与 `/uploads` 落地属 T4-04
  - 前端 `api/request.ts`、`stores/toast.ts`、`main.ts` 仍引用 Element Plus（既有基线，未新增引用）
- 回滚方式：回退本批前端/后端改动并删除 `app/repositories/tea_repo.py`、`api/teas.ts`、`utils/teaQuery*`、4 个组件即可；数据库无结构变更，无需迁移回滚
- 关联 ADR：无

## 2026-11-08｜用户认证模块（注册/登录/当前用户/退出）

- 任务卡 / 分级：B（实现已有契约定义的 5 个认证端点，跨 Router/Service/Repository/Schema 多层 + 前后端联动；不改契约、不改表结构、不改认证机制）
- 需求来源：用户要求实现用户认证模块，含注册、登录、获取当前用户、退出登录；前后端联动；表单校验与路由守卫
- 认证机制确认：用户确认沿用项目已确认的 **HttpOnly Cookie 方案**（`tea_session` + itsdangerous 签名），不使用 JWT/Authorization 头（C 类冲突已对话确认，2026-11-08）
- 主要变更：
  - **后端**：
    - `core/security.py`：bcrypt `rounds=10` 对齐 SECURITY S-01；新增 `DUMMY_HASH` 常量用于登录等时比对（S-04）
    - `schemas/auth.py`：用户名正则 `^[A-Za-z0-9\u4e00-\u9fa5]{3,20}$`、密码 6-64、`extra='forbid'`；`UserResponse` 补 `created_at`/`role` Literal；新增 `UsernameAvailabilityResponse`
    - `repositories/__init__.py` + `repositories/user_repo.py`（新建）：`get_by_username`/`get_by_id`/`create_user`，纯查询无业务判断
    - `services/auth.py`：下沉到 repository；注册捕获 `IntegrityError`→40910；登录对不存在用户做哑哈希等时比对（S-04）
    - `core/auth_deps.py`（新建）：`get_current_user`（验签→查库→40100）、`get_admin_user`（role 校验→40300）
    - `routers/auth.py`：新增 `GET /username-availability`；`/register`、`/login` 返回契约 `User`；Cookie 补 `secure`/`path`；`/me` 用 `Depends(get_current_user)`；`/logout` 清 Cookie 带相同属性；移除对 Model 的直接 import
    - `core/response.py`：新增 `RequestValidationError` 处理器，FastAPI 422 重映射为 400/40000（API_CONTRACT §1.6）
    - `tests/test_auth.py`（新建）：13 条用例覆盖注册/重复注册/格式校验/登录成功/错误密码/不存在用户/未登录 /me/已登录 /me/登出/可用性/密码哈希
  - **前端**：
    - `types/index.ts`：`User` 补 `created_at`
    - `api/auth.ts`（新建）：`login`/`register`/`logout`/`getMe`/`checkUsernameAvailability`
    - `stores/user.ts`：接 `api/auth`；`hydrate()` 调 `/auth/me` 校验 Cookie；移除 localStorage 依赖
    - `api/request.ts`：401 非公开接口跳转 `/login?redirect=...`；公开接口不跳转避免死循环
    - `views/LoginView.vue`（新建）：自研表单，必填校验、错误提示、登录成功跳来源页
    - `views/RegisterView.vue`（新建）：用户名 3-20 中英数、密码 6-64、确认密码、防抖可用性校验
    - `router/index.ts`：加 `/login`、`/register`；守卫用 `useUserStore`；受保护页未登录跳登录
    - `main.ts`：启动时 `userStore.hydrate()` 恢复登录态后再挂载
  - **环境**：`backend/.env` 的 `MYSQL_PASSWORD` 更新为实际密码；执行 `database/init.sql` 建库 + 种子数据
- 契约 / 数据 / 安全影响：无（严格按 API_CONTRACT §4.1 实现；未改表结构；未改 SECURITY 控制项；bcrypt cost=10 与文档一致）
- 清理的基线遗留：
  - `services/auth.py` 的 `db.query` 直查 → 下沉到 `repositories/`（§3.1 遗留 -1）
  - `core/auth_deps.py` 不存在 → 已创建（G-01）
  - `routers/auth.py` 响应缺 role/created_at → 已按契约补齐（G-02）
  - `main.py` 异常处理器未注册 → 此前任务已注册；本次补 `RequestValidationError` 映射
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m pytest -q` | 后端全量 | 14 passed（1 health + 13 auth） | AUTH-01~AUTH-09 全覆盖 |
  | `cd backend; python -m ruff check app tests` | 后端 lint | All checks passed | —— |
  | `cd backend; python -m ruff format --check app tests` | 后端格式 | 31 files already formatted | —— |
  | `python scripts/check_layers.py` | 五层分层 | 通过 | 仅遗留 `services/teas.py` 基线项，未新增违规 |
  | `python scripts/check_frontend.py` | 前台 UI | 通过 | 仅遗留 Element Plus 3 项基线 |
  | `cd frontend; npm run lint` | ESLint | 通过（0 errors, 0 warnings） | —— |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run build` | 生产构建 | 通过 | 仅有 chunk >500kB 警告（预存） |
  | 端到端冒烟（真实 HTTP） | 注册/登录/me/登出 | 全部通过 | 见下方明细 |

  端到端冒烟明细：
  - 注册 → 200 + User(id/username/role/created_at) + `Set-Cookie: tea_session=...; HttpOnly; Max-Age=2592000; Path=/; SameSite=lax`
  - 重复注册 → 409 + `{"code":40910,"message":"用户名已存在","data":null}`
  - 错误密码登录 → 401 + `code=40110`
  - 正确密码登录 → 200 + User
  - `/me` 带 Cookie → 200 + User
  - `/me` 无 Cookie → 401 + `code=40100`
  - `/me` 无效 Cookie → 401 + `code=40100`
  - 登出 → 200，后续 `/me` → 401
  - 用户名可用性 → 200 + `available:false`（已存在用户）
  - 种子 admin/admin123 登录 → 200 + `role=admin`
  - 数据库验证：`users.password_hash` 以 `$2b$10$` 开头，响应体与日志不含密码

- 验收结论：通过（14 测试全绿；ruff/分层/前端检查全过；端到端 9 场景全部符合契约）
- 遗留问题：
  - 前端 `api/request.ts`、`stores/toast.ts`、`main.ts` 仍引用 Element Plus（基线遗留，本次未触碰 toast 替换）
  - `services/teas.py` 仍 `db.query` 直查（基线遗留，非本次范围）
  - TEST_PLAN 其余 47 条用例待落地（本次落地 AUTH 组 13 条 + 已有 health 1 条）
- 回滚方式：revert 本提交；数据库可 `DROP DATABASE tea_guide` 后重跑 init.sql
- 关联 ADR：无（沿用已确认的认证机制设计，未产生新架构决策）

## 2026-11-08｜前后端基础工程核对与补齐

- 任务编号 / 分级：TASK-20261108-01 / A
- 需求来源：开发计划第一个任务（搭建前后端基础工程）；AGENTS.md §5/§7（统一响应体）、§13 已知待办（`register_exception_handlers` 未注册，安全 P0）
- 现状核对（7 项）：接口前缀 `/api/v1`、`request.ts` 的 `withCredentials: true`、npm lockfile 均已合规，跳过；`repositories/` 层本次不建——健康检查不查库，按 §3.1 基线待 teas/auth 端点触达查询时再下沉
- 主要变更：
  - `backend/app/main.py`：注册 `register_exception_handlers(app)`；`/api/v1/health` 改为统一响应体 `ok({"status": "ok"})`
  - `backend/tests/test_health.py`：断言同步为 `{code: 0, message: "ok", data: {status: "ok"}}`
  - `backend/.env.example`：新增（数据库 / SECRET_KEY / 管理员账号等参数示例）
  - `backend/.env`：由示例复制生成（开发默认值，.gitignore 已覆盖，不进 Git）
- 契约 / 数据 / 安全影响：健康检查不在 API_CONTRACT 29 个业务端点内，契约文档无需变更；安全影响为正面修复（业务异常不再退化为 500）
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `python -m ruff check app tests` | 后端静态检查 | All checks passed | —— |
  | `python -m pytest -q` | 健康检查用例 | 1 passed（2 条 deprecation 警告，为依赖既有行为） | —— |
  | `npm run build` | 前端 typecheck + 构建 | 成功（vue-tsc + vite build 通过；chunk >500kB 警告为既有体积提示） | —— |
  | `Invoke-WebRequest http://127.0.0.1:8000/api/v1/health` | 后端直连 | 200，`{"code":0,"message":"ok","data":{"status":"ok"}}` | —— |
  | `Invoke-WebRequest http://localhost:5173/api/v1/health` | 经 Vite 代理前后端通信 | 200，同上统一响应体 | 5173 监听在 `[::1]`，需用 localhost 访问 |
  | `Invoke-WebRequest http://localhost:5173/` | 前端首页 | 200 | —— |
  | `npm run test:run` / `npm run lint` | 前端测试 / lint | 未运行 | 本次无前端代码改动 |

- 验收结论：通过（前后端均在本机运行，健康检查经代理返回统一响应体）
- 基线例外：无新增；`request.ts` 引用 ElMessage 属 §3.1 既有遗留，本任务未触达
- 遗留问题：
  - MySQL 建库与 `init.sql` 种子数据为下一任务（T0-02a），本次健康检查不依赖数据库
  - `config.py` 使用 class-based Config（Pydantic V2 弃用警告），触达配置项时再迁移为 `ConfigDict`
  - SECRET_KEY / 管理员密码为默认值，上线前必须轮换（AGENTS §13）
- 回滚方式：还原 `main.py`、`test_health.py`，删除 `.env` / `.env.example`
- 关联 ADR：无

## 2026-11-07｜生成 MVP 开发计划

- 任务编号 / 分级：TASK-20261107-PLAN / B（纯文档产出，未触碰业务规则、契约、表结构与安全项）
- 需求来源：用户要求基于已确认文档生成 `docs/development/PLANS.md`，并在答复决策项后继续完善计划（不编码）
- 主要变更：
  - `docs/development/PLANS.md`：v1.0 新增 6 阶段 / 27 个任务的开发计划，含目标、输入、输出、模块、依赖、验收标准、测试要求与非目标
  - 计划将用户建议顺序中的"失物拾物/认领"更正为"茶品发现/收藏分享"（依据 API_CONTRACT §1.12 与 PRD 核心闭环），该修正已获用户确认（D1）
  - 明确 G3 为 MVP 闭环里程碑、G0–G3 为优先交付范围，并列出 3 组允许并行的任务对与关键路径
  - v1.1 按用户答复更新：D1 认可、D2（Alembic 基线）暂缓、D3 由用户逐阶段下达指令、D4 本机 MySQL 已装但无数据库、D5 暂不编码
  - v1.1 新增：任务总索引、27 任务实施步骤、测试环境与数据约定、通用 DoD、文档同步矩阵、前置环境核对清单；T0-02 拆分为 02a（建两库 + init.sql，可先做）/ 02b（Alembic 基线，待 D2）
- 契约 / 数据 / 安全影响：无（未改端点、字段、表结构、S 项）
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `python scripts/check_all.py` | 链接/常量/分层/前端/记录/密钥 | OK：204 条链接有效，29/60/32/7 一致，无新增基线违规 | 文档改动后复跑 |
  | `pytest` / `npm run test:run` | 业务测试 | 未运行 | 本次仅完善计划文档，无代码改动 |

- 验收结论：通过（计划 v1.1 已按用户答复定稿；按 D5 不进入编码）
- 基线例外：无
- 遗留问题：仅 D2（Alembic 基线口径）待定，不阻塞 G0 的 T0-01/02a/03/04 准备；开工需用户另行指令；计划确认后可回填 AGENTS.md 文档索引
- 回滚方式：删除 `docs/development/PLANS.md` 并回退本条记录
- 关联 ADR：无（D2 确认后若选择"init.sql 即基线"，再补提议 ADR）

## 2026-11-07｜规范化落地：自动化闸门与现状基线

- 任务编号 / 分级：TASK-20261107-NORMS / C（修改 CI 关键流程与项目规范；用户于 2026-11-07 以"全部优化一下"确认）
- 需求来源：用户对 AI 项目规范有效性审计后的整改要求
- 主要变更：
  - `AGENTS.md`：新增 §0 速览（命令/路由表/五条红线）、§3.1 现状基线；补全 C 类清单与用户豁免；新增文档冲突优先级；更新 §13 待办
  - `docs/development/DEVELOPMENT_GUIDE.md` v1.2：A/B 唯一边界、npm 命令、CI/构建类 C 项、用户豁免、C 类前置 ADR、测试与 CI 现状
  - `harness/TASK_TEMPLATE.md`：新增任务编号、边界确认、用户确认记录、基线例外；修正 `tea_type`→`category` 与 npm 命令
  - `harness/build-log.md`：模板补任务编号/基线例外；明确 ADR 时点
  - `docs/development/ADR/README.md` + `ADR-0002-enforce-norms-with-automation.md`：自动化闸门决策（基线 + CI + 渐进清理）
  - `.github/workflows/ci.yml`：替换 Next.js 模板，改为后端 lint/format/test、前端 lint/format/typecheck/test、文档与记录守卫三个作业
  - `.github/pull_request_template.md`：任务卡、C 类确认、测试证据、文档同步清单
  - `scripts/check_links.py` / `check_constants.py` / `check_layers.py` / `check_frontend.py` / `check_records.py` / `check_secrets.py` / `check_all.py`：可执行规范检查
  - `frontend/`：新增 lint/format/typecheck/test 脚本与 ESLint、Prettier、Vitest 配置；移除 `toast.ts` 未使用 import；Prettier 统一 `src/` 格式
  - `backend/`：新增 `pyproject.toml`、`tests/test_health.py`；Ruff 自动修复 21 项并格式化 14 个文件
  - `docs/architecture/TECH_STACK.md`：包管理器统一为 npm
  - `specs/*`：标注为历史草稿，非权威
- 契约 / 数据 / 安全影响：无（未改端点、字段、表结构、S 项）
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `python scripts/check_all.py` | 链接/常量/分层/UI/记录/密钥 | 全部 OK | 链接 189 条；常量 29/60/32/7；2 项分层与 3 项 Element Plus 为基线遗留 |
  | `cd backend; python -m ruff check app tests` | 后端 lint | All checks passed | 自动修复 21 项 |
  | `cd backend; python -m ruff format --check app tests` | 后端格式 | 27 files already formatted | 首次基线格式化 14 个文件 |
  | `cd backend; python -m pytest -q` | 健康检查 | 1 passed, 2 warnings | 仅验证应用可启动；TEST_PLAN 未落地 |
  | `cd frontend; npm run lint` | ESLint | 通过 | 基线文件已豁免 |
  | `cd frontend; npm run format:check` | Prettier | 通过 | 覆盖 `src/**` |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run test:run` | Vitest | 0 tests, exit 0 | `--passWithNoTests`；尚无纯函数用例 |
  | `cd frontend; npm run build` | 生产构建 | 通过 | 仅有 chunk >500kB 警告 |
  | `npm ci --dry-run --prefix frontend` | lockfile 同步 | 通过 | —— |
  | `python -c "import yaml; ..."` | CI YAML 语法 | 通过 | —— |

- 验收结论：有条件通过（TEST_PLAN 未落地；CI 尚未在 GitHub Actions 实跑）
- 基线例外：Element Plus 3 个文件、Service 直连查询 2 个文件；本次只登记，未新增违规
- 遗留问题：
  - TEST_PLAN 60 条用例待落地；前端 Vitest 尚无用例
  - CI 配置已完成本地静态检查，但尚未在 GitHub Actions 实跑
  - `npm ci` 尚未在干净环境验证（本地使用 `npm install`）
  - 历史遗留清理：repositories 下沉、`auth_deps.py`、异常处理器注册、Element Plus 前台替换
- 回滚方式：revert 本提交；脚本与 CI 为新增文件，不影响运行时
- 关联 ADR：ADR-0002（本次为规范机制建设，ADR 与实施同批完成；后续 C 类按新规前置）

## 2026-11-07｜建立开发知识沉淀机制

- 任务卡 / 分级：B（纯文档与流程建设，未触碰业务规则、API 契约、表结构与安全项；用户已明确指定产出物）
- 需求来源：用户要求建立 ADR 与 build-log 机制，并更新 AGENTS.md
- 主要变更：
  - `docs/development/ADR/README.md`：新增 ADR 目录说明、触发条件、编号与状态规则、索引
  - `docs/development/ADR/TEMPLATE.md`：新增决策记录模板（背景 / 驱动因素 / 备选方案 / 最终选择 / 影响 / 验证）
  - `docs/development/ADR/ADR-0001-knowledge-capture-mechanism.md`：记录本机制自身的三方案对比与选型
  - `harness/build-log.md`：新增本日志、条目模板与问题复发台账
  - `docs/api/README.md`：新增接口文档目录索引与变更同步清单
  - `docs/architecture/README.md`：新增架构/数据文档索引与变更同步清单
  - `AGENTS.md`：§10 增补文档索引，新增 §10.1 知识沉淀机制，§12 增加交付留痕要求
  - `docs/development/DEVELOPMENT_GUIDE.md`：阶段 9「更新相关文档」增加任务留痕一行
- 契约 / 数据 / 安全影响：无（未修改 API_CONTRACT、openapi.yaml、DATA_MODEL、init.sql、Alembic、SECURITY）
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | PowerShell 相对链接存在性校验 | 新增/修改的 8 份 Markdown 中的相对链接 | 8 文件全部通过 | 输出 `ALL LINKS OK (8 files)` |
  | `pytest` / `vitest` | 后端 / 前端 | 未运行 | 本次无代码改动，不声称通过 |

- 验收结论：通过（纯文档变更，链接校验通过；无代码测试可跑）
- 遗留问题：无
- 回滚方式：优先 `git checkout backup-20261107-pre-knowledge-capture` 回到本次变更前（tag 指向 e37a97c）；或删除新增的 ADR/build-log/README 文件，还原 AGENTS.md 与 DEVELOPMENT_GUIDE.md 对应段落
- 关联 ADR：[ADR-0001](../docs/development/ADR/ADR-0001-knowledge-capture-mechanism.md)

