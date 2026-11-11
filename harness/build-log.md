# 开发构建日志（build-log）

| 项 | 值 |
|---|---|
| 用途 | 记录**每次开发任务**做了什么、测了什么、还剩什么 |
| 流程依据 | [DEVELOPMENT_GUIDE.md](../docs/development/DEVELOPMENT_GUIDE.md) · [AGENTS.md](../AGENTS.md) §10.1 |
| 记录顺序 | **最新条目置顶**（按日期倒序） |
| 定位 | 事实流水，不替代任何权威文档 |

## 2026-11-11｜茶品配图重做：Bing → 百度图片 + 相关性校验

- 任务编号 / 分级：TASK-20261111-tea-image-redo / **B**
- 背景：用户反馈首批 175 张配图与茶名不符（如"金骏眉"搜到金条、"老班章"搜到 IATA 证书），要求逐款重新配图
- 根因：Bing 图片对中文茶名匹配极差；且原脚本无相关性/质量校验，抓到即用
- 方案：
  1. 数据源切换为百度图片（`image.baidu.com/search/acjson`），优先取 `replaceUrl` 原图，兜底 `thumbURL`
  2. 标题相关性校验：标题必须含"茶"，且命中茶名/核心词，否则淘汰
  3. 正负关键词分层：优先"干茶/条索/茶汤/汤色/叶底/散茶/特写"类实拍；剔除茶树/茶园/鲜叶/礼盒/袋装/罐装/价格/批发/百科/资讯/文章等
  4. 图片质量校验：宽度 ≥ 480~500px、高宽比 0.45~2.6、近白像素占比 > 0.5~0.7 剔除（排除证书/文档/纯白商品图）
  5. 分层降级重试：严格档失败后逐级放宽；仍失败的冷门茶改用缩略图兜底
  6. 人工目检：生成 3 张带茶名的拼图核对全量 175 张，再对 50 款问题项做定向精修，最后对 20 款冷门茶逐个挑候选
- 结果：
  - 175 款全部替换为按茶名检索的图片，文件名不变（数据库 `main_image_url` 无需变更）
  - 目检确认多数为干茶/茶汤实拍；约 15 款冷门茶（如天柱剑毫、青城雪芽、页尖茶、皖西黄大茶等）公开图源仅有包装图或资讯配图，已取其中最优
- 测试：
  - `GET /api/v1/teas` 返回 total=211，`main_image_url` 均指向 `/uploads/2026/11/{茶名}_{hash}.jpg`
  - 重启后端服务正常启动
- 遗留：约 15 款冷门茶配图为包装/资讯类，后续可手工上传替换（后台茶品编辑支持上传）
- 回滚方式：图片按茶名固定命名，可重新执行 `scripts/tea_expand/download_images.py`

## 2026-11-11｜茶品批量扩充：新增 175 款茶 + 高清图

- 任务编号 / 分级：TASK-20261111-tea-batch-import / **B**（数据填充，无契约/表结构变更）
- 背景：用户反馈项目茶品数量少（原 36 款），希望批量扩充
- 方案：整理六大茶类知名茶品清单（公开茶学常识）→ AI 生成结构化数据（原创描述，无版权风险）→ Bing 图片搜索批量下载高清图 → 统一压缩为 JPEG（长边 1920）→ 入库回填
- 改动：
  1. 新增 `scripts/tea_expand/` 数据与脚本目录：
     - `data_green.py`（60 款）、`data_red.py`（30 款）、`data_oolong.py`（35 款）、`data_dark.py`（28 款）、`data_white.py`（14 款）、`data_yellow.py`（8 款）
     - `download_images.py`：Bing 图片搜索下载，HTML 实体解码，自动压缩转 JPEG
     - `import_teas.py`：按 teas 表结构入库，跳过已存在茶名，自动补 price_min/max
     - `fix_image_urls.py`：回填 main_image_url
  2. 图片统一存放至 `backend/uploads/2026/11/`，命名规则 `{茶名}_{md5前8位}.jpg`
  3. 每款茶字段完整：name/category/origin/season/fermentation/representative_variety/四段品鉴描述/冲泡参数/main_image_url/favorite_count（随机 100-2000）
- 数据规模：
  - 绿茶 66 款（原 6 + 新 60）
  - 红茶 36 款（原 6 + 新 30）
  - 乌龙 41 款（原 6 + 新 35）
  - 黑茶 34 款（原 6 + 新 28）
  - 白茶 20 款（原 6 + 新 14）
  - 黄茶 14 款（原 6 + 新 8）
  - **总计 211 款**
- 测试：
  - 图片下载 174/175 成功（青砖茶首次失败，换关键词后成功）
  - 入库 175 款全部成功，无重复
  - 接口验证：`/api/v1/teas` 列表分页（total=211）、分类筛选（green=66）、搜索（"龙井"=2 款）、详情（字段完整含图片 URL）均正常
- 契约 / 数据 / 安全影响：无契约变更、无表结构变更、无权限变更
- 遗留问题：无
- 回滚方式：`DELETE FROM teas WHERE id > 36`（假设原 36 款 id 为 1-36）

## 2026-11-10｜S9 补齐：详情页收藏清单选择面板

- 任务编号 / 分级：TASK-20261110-fav-list-picker / **B**（前端交互补齐，后端 API 原生支持，无契约变更）
- 背景：上一任务 P0 冒烟发现「前端无把茶加入非默认清单入口」（FavoriteButton 仅默认清单；后端 `addFavorite` 已支持 `list_id`，收藏状态响应已含 `list_ids`）
- 改动：
  1. [favorite.ts](../frontend/src/utils/favorite.ts)：新增纯函数 `nextListToggleState`（清单维度切换 + 「用户 × 茶品」去重口径计数联动）
  2. [FavoriteButton.vue](../frontend/src/components/FavoriteButton.vue)：primary variant 新增箭头按钮 + 清单选择面板（`role="menu"` / `menuitemcheckbox`，`aria-checked` 由 `list_ids` 驱动；懒加载 `GET /lists`；Esc/外点关闭；仅登录态渲染；乐观更新 + 失败回滚；登出重置面板状态；主按钮行为不变）
  3. icon variant（卡片快速收藏）行为不变
- 文档同步：[PAGE_SPECS.md](../docs/design/PAGE_SPECS.md) §5.6 新增面板交互规格
- 测试：
  - Vitest：新增 5 条 `nextListToggleState` 用例，全量 **50 passed**
  - `npm run format` / `format:check` / `lint` / `typecheck` 全部通过
  - 浏览器冒烟 **7/7 PASS**（建清单 → 面板开合 → 勾选加入计数 +1 → 取消计数 -1 → 复勾选 → /my 清单茶品数 = 1）
- 契约 / 数据 / 安全影响：无契约变更、无表结构变更，纯前端改动
- 遗留问题：冒烟数据 smoketest04（含 1 条非默认清单收藏记录）待清理，需用户授权后删除
- 回滚方式：回退本提交

## 2026-11-10｜P0 收尾：顶栏可访问性 + 三项冒烟 + 部署演练 + CI 本地等效

- 任务编号 / 分级：TASK-20261110-p0-closeout / **B**（AppHeader 交互修复无契约变更；其余为验证、格式化与文档修正）
- 内容 1：顶栏「茶文化 ▾」下拉支持触屏/键盘
  - [AppHeader.vue](../frontend/src/components/AppHeader.vue)：触发元素 span → button（`aria-haspopup` / `aria-expanded`），点击切换 `--open` 类，Escape 关闭并回焦按钮，点击外部 / 路由跳转自动关闭；hover 规则包进 `@media (hover: hover)`，触屏不再依赖 hover
  - 测试：`npm run lint` / `npm run typecheck` 通过；浏览器实测 **5/5 PASS**（hover 展开、点击开合 + aria 同步、Esc 关闭、外点关闭、跳转 /contents/knowledge）
- 内容 2：三项功能手工冒烟（浏览器实测）
  - 多收藏清单 + 分享海报：**7/8 PASS** —— 注册 / 收藏计数 / 建清单 / 8 位分享 token / 海报下载 / 撤销分享（旧链接显失效页）全部通过；**发现缺口：前端无「把茶加入非默认清单」入口**（FavoriteButton 仅默认清单，后端 `addFavorite` 已支持 listId）→ 遗留 B 类任务
  - 用户贡献 + 管理员审核：**5/5 PASS**（提交 → 待审核 → admin/admin123 通过 → 我的提交同步「已通过」）
  - 冒烟数据清理（**经用户明确授权**）：删除 smoketest02/03 及其清单/收藏/分享/贡献/日志 + 审核上架的测试茶「冒烟测试茶」；复核 `teas=36`、残留用户=0
- 内容 3：部署全链路演练（本地模拟全新环境）
  - 干净库 `tea_guide_deploy_check` ← init.sql（13 表 + 种子 + admin）
  - **发现并修正部署阻断**：文档旧流程「stamp 0001_baseline → upgrade head」在当前 init.sql 上必失败（0002 对已有列 `teas.video_url` 报 1060 Duplicate column）——init.sql 已随批次演进包含最新全量结构与种子
  - 修正后标准流程：全新环境 `init.sql 建库 → alembic stamp head`（演练通过，`current = 0010_user_avatar (head)`）；既有旧环境直接 `alembic upgrade head`
  - 生产模式 Uvicorn（无 reload、注入随机 SECRET_KEY，端口 8010）：`/api/v1/health`、`/api/v1/teas`、`/api/v1/contents?type=knowledge`（8 条）均 `code=0`；演练库与临时文件已清理
  - 文档同步：[0001_baseline.py](../backend/app/alembic/versions/0001_baseline.py) docstring、[README](../README.md) 已知问题 3 与改进方向
- 内容 4：CI 本地等效实跑（ci.yml 三 job 原命令）
  - **发现并修正格式漂移**：后端 `ruff format --check` 失败（7 文件：0008/0009 迁移 + 5 测试文件）、前端 prettier 失败（19 文件）——历史记录曾声称通过，以本次实跑为准
  - 修复后全绿：`ruff check` ✓ / `ruff format --check`（93 files）✓ / `pytest -q` **170 passed** / `npm run lint` ✓ / `format:check` ✓ / `typecheck` ✓ / `test:run` **45 passed** / `check_all.py` 全部通过
  - **CI 远程触发未完成（C 类待决策）**：远程仓库为 Gitee，`.github/workflows/ci.yml`（GitHub Actions）push 不触发；候选：① 转 Gitee Go 流水线 ② 镜像到 GitHub ③ 维持本地等效，待用户拍板
- 契约 / 数据 / 安全影响：无契约变更、无表结构变更（仅前端交互 + 格式化 + 文档）；冒烟数据清理经用户授权
- 测试证据：见上各内容块；全部实跑
- 遗留问题：
  1. 前端「加入指定清单」UI 缺口（S9 体验闭环，B 类待立项）
  2. CI 远程触发平台待决策（C 类，本条内容 4）
  3. 真实服务器（Linux + Nginx）部署验证仍待实机；Nginx `client_max_body_size 6m` 与 413 复测属部署项
  4. `backend/uploads/` 仍 untracked（既有口径）
- 回滚方式：回退本提交（AppHeader / 格式化 / 文档均为独立可回退改动）

## 2026-11-10｜新功能：登录后顶栏头像 + 个人中心 /profile + 更换头像

- 任务编号 / 分级：TASK-20261110-avatar-profile / **C**（新增 `users.avatar_url` 列 + 2 个新端点 + 契约变更）
- 决策留痕：[ADR-0004](../docs/development/ADR/ADR-0004-user-avatar-profile.md)（方案 C：上传 + 预置双通道）；用户已通过选项确认「新建个人中心页」与「上传 + 预置头像」
- 后端变更：
  - `models/user.py` 增 `avatar_url VARCHAR(255) NULL`；Alembic 迁移 [0010_user_avatar](../backend/app/alembic/versions/0010_user_avatar.py)（已 `upgrade head`）；[init.sql](../database/init.sql) 同步
  - [services/me.py](../backend/app/services/me.py)：`AVATAR_PRESETS` 白名单（`tea-01`～`tea-08`）、`update_by_upload`、`update_by_preset`
  - [routers/me.py](../backend/app/routers/me.py)：新增 `POST /api/v1/me/avatar`（multipart）、`PUT /api/v1/me/avatar`（preset）
  - [repositories/user_repo.py](../backend/app/repositories/user_repo.py)：`update_avatar`、`add_avatar_log`（`operation_logs.action='avatar_update'`）
  - [schemas/auth.py](../backend/app/schemas/auth.py)：`UserResponse` 增 `avatar_url`；新增 `AvatarPresetRequest`（`extra=forbid`）
  - [services/me.py](../backend/app/services/me.py) 修正：非法预置原误用 `ValidationError` 实例当成可调用对象（TypeError），改为 `TeaGuideError(40000, ...)`
- 前端变更：
  - [AppHeader.vue](../frontend/src/components/AppHeader.vue)：登录态改为「圆形头像（或首字母占位）+ 用户名」并链接 `/profile`
  - 新增 [ProfileView.vue](../frontend/src/views/ProfileView.vue)：头像预览、上传（前端预校验类型/5 MB）、8 个预置头像即时切换、等级与统计、我的收藏预览（默认清单前 6 条）、快捷入口
  - [router/index.ts](../frontend/src/router/index.ts)：新增 `/profile`（`requiresAuth`）
  - [api/me.ts](../frontend/src/api/me.ts)、[types/index.ts](../frontend/src/types/index.ts)：`uploadAvatar` / `setPresetAvatar` / `User.avatar_url`
  - 预置头像资产：`frontend/public/avatars/tea-01.svg`～`tea-08.svg`（水墨风自绘）
- 契约 / 数据 / 安全影响：接口 53 → 55；`User` 增 `avatar_url`；新增 SECURITY **S-35**；TEST_PLAN 新增 AVATAR-01～05（84 → 89 条）
- 文档同步：API_CONTRACT v1.6、openapi.yaml 1.6.0、DATA_MODEL v1.5、MODULE_DESIGN、SECURITY v1.3、TEST_PLAN v1.4、docs/api/README、AGENTS 数量口径、`scripts/check_constants.py` 基线
- 测试证据：
  | 项 | 结果 |
  |---|---|
  | `python -m pytest -q`（backend） | **170 passed**（新增 `tests/test_avatar.py` 6 条） |
  | `python -m ruff check app tests` | 通过（顺带修复 0009 迁移与 `schemas/content.py` 的导入排序） |
  | `npm run typecheck` / `npm run lint` | 通过 |
  | `python scripts/check_all.py` | 全部通过（链接 253 / 常量 55·89·35·13 / 五层 / 前台 UI / 记录 / 密钥） |
  | 浏览器实测（localhost:5173） | **PASS**：注册登录 → 顶栏首字母头像 → 点击进 /profile → 选 `tea-01` → `PUT /api/v1/me/avatar` 200 → 顶栏与页面头像同步更新 |
- 过程中修正：
  1. 首次浏览器实测 `PUT /api/v1/me/avatar` 返回 404：后端 reload 未生效（WatchFiles 未捕获改动），重启 `python run.py` 后复测通过
  2. 测试库 `tea_guide_test` 由 `init.sql` 建库、不走 Alembic，补列后 170 条全通过（仅测试库一次性补列，非项目迁移路径）
  3. 浏览器验证注册的临时用户 `avatarcheck01` 已清理（含 `operation_logs` / 清单 / 收藏）
- 遗留问题：
  1. 替换头像后旧文件不即时删除，与茶图共用 `uploads/` 清理技术债（ADR-0004 §7 已登记）
  2. `backend/uploads/` 仍为 untracked；头像上传文件不进 Git
  3. 个人中心仅预览默认清单前 6 条，完整多清单管理仍在 `/my`
- 回滚方式：回退本提交 + `alembic downgrade 0009_seed_content_items_more`

## 2026-11-10｜修复：顶栏「茶文化」下拉切换板块后内容不更新

- 任务编号 / 分级：TASK-20261110-fix-content-switch / B（前端行为修复，无契约变更）
- 问题现象：在「茶叶产地」页点顶栏下拉「茶叶品牌」，地址变为 `/contents/brand`，但页面标题、面包屑、列表内容仍停留在「茶叶产地」
- 根因：五个板块共用同一路由记录 `/contents/:code`（[router/index.ts](../frontend/src/router/index.ts) L44-49），Vue 复用组件实例，`onMounted` 不再触发；[ContentListView.vue](../frontend/src/views/ContentListView.vue) 仅在 `onMounted` 拉数据
- 修复：
  - `ContentListView.vue` 新增 `watch(() => route.params.code)`：重置分页为 1、同步 `headerItem`、重新拉列表（类型未加载时补拉）
  - `ContentDetailView.vue` 同样问题（`/contents/:code/:id` 切换 id 不重载），新增 `watch(() => route.params.id)` → `load()`
- 契约 / 数据 / 安全影响：无
- 测试证据：
  | 项 | 结果 |
  |---|---|
  | `npm run typecheck` | 通过 |
  | `npm run lint` | 通过 |
  | 浏览器实测（Playwright，localhost:5173） | **PASS**：/contents/origin 点「茶叶品牌」→ URL `/contents/brand`、h1「茶叶品牌」、面包屑「首页 › 茶文化 › 茶叶品牌」、产地描述消失、品牌卡片出现 |
- 遗留问题：顶栏「茶文化 ▾」仍为 hover 展开（`cursor: default`），触屏/键盘无法展开；如需点击展开需另立任务
- 回滚方式：回退本提交

## 2026-11-10｜封面落地：39 条内容配图自动下载并回填

- 任务编号 / 分级：TASK-20261110-cover-apply / A（素材落地，无代码/契约变更）
- 需求来源：用户要求「你帮我自动下载」
- 执行方式：临时脚本（`%TEMP%/tea_covers/`，不入库）三段式
  1. Commons API 关键词检索（授权白名单 CC0/PD/CC BY(-SA)，宽 ≥800px）→ 下载
  2. 关键词命中校验（required/blacklist）剔除主题不符结果 → 定向重搜
  3. `POST /admin/upload` 落盘 + `UPDATE content_items.cover_image` 回填
- 结果：**39/39 全部落地**，`content_items` 无空封面；接口与静态文件均 200（示例 143KB jpg）
- 过程中修正的错误匹配（关键词搜索易踩坑，已加校验）：
  | 条目 | 首次错配 | 修正后 |
  |---|---|---|
  | 公道杯 | 1970 年足球赛照片 | Gong fu cha 茶席照 |
  | 大益 | 蛋糕切面照 | 2015 普洱饼茶 |
  | 禅茶一味 | 加州石园 | 京都茶会点茶实拍 |
  | 玻璃茶壶 | 罗马 3 世纪玻璃器 | 港式茶居玻璃壶 |
  | 品茗杯 | 西式带把茶杯+标尺馆藏照 | 明代白釉花口杯（CC0） |
  | 茶则/潮汕/茶马/泡茶用水 | 429 限流失败 | 分类目录+重试取图 |
  | 茶马古道（人工复核） | — | 斯文·赫定 1906 雪山马帮历史照片，题材契合 |
- 契约 / 数据 / 安全影响：无契约变更；`content_items.cover_image` 批量赋值；未触碰 `teas`/`tea_media`
- 文档同步：`docs/product/素材清单.md` §5.4 状态改「已落地」并新增「6. 落地登记表」（39 行：本地 URL / 来源 / 授权 / 作者）+ 3 条偏差说明
- 测试证据：`pytest -q` **164 passed**；`check_all.py` 全部通过
- 遗留问题：
  1. **3 条属品类示意图非本地实景**（蒙顶山用浙江茶园、泡茶用水用科罗拉多山涧、茶马古道用 1906 历史影像），已在文档标注
  2. `backend/uploads/` 仍为 untracked（历史既有口径），图片不进 Git；生产部署需单独同步该目录
  3. CC BY / CC BY-SA 条目上线需保留署名，署名依据见登记表「作者」列
- 回滚方式：`UPDATE content_items SET cover_image=NULL`（图片文件留在 uploads，建议随后清理）

## 2026-11-10｜配图方案：五板块 39 条封面 CC0 实拍方案

- 任务编号 / 分级：TASK-20261110-cover-plan / A（纯文档，无代码变更）
- 需求来源：用户要求生成配图方案；经询问确认：风格 = **CC0 实拍照片**，粒度 = **每条独立封面（39 张）**
- 主要变更：`docs/product/素材清单.md` 新增 §5.4「内容板块封面配图方案」——39 条逐一给出 Wikimedia Commons 主搜索关键词 / 备选关键词 / 画面要求；原「登记规则」顺延 §5.5
- 特别决策：
  - **品牌 7 条**无门店实拍资源：统一以「品类示意 + 产地风貌」配图，不使用含商标店面照片（避免商标侵权），正式上线需门店图须向品牌方申请授权
  - 下载登记流程 6 步：Commons 搜图（筛 CC0/PD）→ 记录文件页 → `POST /admin/upload` 落盘 → 后台填 cover_image → 回表补登三列 → 遵守 §1 品类示意图约束
- 契约 / 数据 / 安全影响：无
- 测试证据：`python scripts/check_all.py` 全部通过（含链接检查）
- 遗留问题：39 张图**待下载落地**（可由用户按方案手动执行，或后续会话脚本化批量下载 + 人工复核授权）
- 回滚方式：删除素材清单 §5.4 节


## 2026-11-10｜内容补全：五板块种子数据扩充至 39 条

- 任务编号 / 分级：TASK-20261110-content-seed-more / A（纯数据补充，无契约/规则变更）
- 需求来源：用户要求「把每一个版块里的内容都补充完整」
- 主要变更：
  - 新增 `backend/app/alembic/versions/0009_seed_content_items_more.py`：五板块新增 30 条原创条目（茶具+6/产地+6/文化+6/品牌+6/知识+6），幂等按 title 去重
  - `database/init.sql` 同步追加同样 30 条（子查询 type_id，与迁移内容一致）
  - 板块覆盖：茶具 8 条（盖碗/紫砂壶/公道杯/品茗杯/建盏/茶则茶匙/玻璃茶壶/朱泥壶）；产地 8 条（西湖/武夷山/西双版纳/安溪/祁门/福鼎/蒙顶山/凤凰山）；文化 8 条（陆羽茶经/宋代点茶/唐代煎茶/明代瀹饮/潮汕工夫茶/茶马古道/禅茶一味/茶与诗词）；品牌 7 条（吴裕泰/张一元/大益/八马/正山堂/品品香/凤牌）；知识 8 条（分类原理/水温投茶/品鉴三步/存茶四原则/醒茶洗茶/春夏秋茶/泡茶用水/五大误区）
- 契约 / 数据 / 安全影响：无契约变更；数据为纯新增种子（content_items 共 39 条）；meta 均符合各板块 JSON Schema 校验
- 测试证据：

  | 命令 | 结果 |
  |---|---|
  | `alembic upgrade head`（开发库） | 0008/0009 应用成功，content_items 总数 39 |
  | `python -m pytest -q` | **164 passed** |
  | `python scripts/check_all.py` | 全部通过 |
  | API 冒烟 `GET /api/v1/contents?type=teaware` / `?type=brand` | total 8 / 7，实时命中 |
- 遗留问题：封面图 cover_image 均为 NULL（待素材到位后后台补录）；品牌 website 仅收录可确认官网（吴裕泰/大益/八马），其余留空
- 回滚方式：`alembic downgrade 0008_seed_content_items`

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
| R-01 | 篡改 Cookie 末位仅把 `A` 换 `B`，服务端仍接受，测试误判为通过/失败 | 2026-11-08（首次） | base64url 签名末位含未参与解码的低位，同高位字符互换后字节相同 | AUTH-07 改为翻转 base64url 索引高位（`index ^ 32`），断言仍为 401/40100，未放宽 | 已关闭 |

---

## 4. 记录

## 2026-11-10｜批次五：R1–R5 五大内容板块

- 任务编号 / 分级：TASK-20261110-batch5 / C（2 张新表 + 7 新端点 + 2 新前端页 + 3 新后台页；用户确认于 2026-11-10；本批不提交 Git）
- 需求来源：批次五 R1–R5 延后任务；[PLAN_剩余功能.md](../docs/development/plans/PLAN_剩余功能.md) §6
- 主要变更：
  - `backend/app/alembic/versions/0007_content_platform.py`（新）：建 `content_types`（5 板块种子）+ `content_items`（FK→CASCADE；meta JSON 承载各板块特有字段）
  - `backend/app/models/content.py`（新）：`ContentType` + `ContentItem` 两个 ORM；`models/__init__.py` 追加导出
  - `backend/app/schemas/content.py`（新）：`ContentTypeOut`、`ContentItemOut`、`ContentListResponse`、`ContentCreateRequest`（extra=forbid + 板块差异化 meta 校验）、`ContentUpdateRequest`、后台列表 DTO
  - `backend/app/repositories/content_repo.py`（新）：前台查询自动过滤 `is_active=0`；后台含下架；只 flush 不 commit
  - `backend/app/services/contents.py`（新）：CRUD + meta JSON 校验 + 软失效 + operation_logs 留痕
  - `backend/app/routers/contents.py`（新，前台 3 端点）+ `routers/admin.py` 扩展（后台 4 端点）
  - `backend/app/core/response.py`：新增 `ContentTypeNotFound=40450`、`ContentItemNotFound=40460`
  - `frontend/src/types/index.ts`（追加）：ContentType/ContentItem/AdminContentListItem/...
  - `frontend/src/api/contents.ts`（新，3 前台）+ `api/admin.ts`（追加 4 后台）
  - `frontend/src/views/ContentListView.vue`、`views/ContentDetailView.vue`（新，自研，前台禁用 Element Plus）
  - `frontend/src/views/admin/AdminContents.vue`、`views/admin/AdminContentEdit.vue`（新，Element Plus）
  - `frontend/src/components/AppHeader.vue`（导航追加「茶文化 ▾」自研下拉）
  - `frontend/src/router/index.ts`（追加前台 `/contents/:code`、`/contents/:code/:id` + admin 三路由）
  - `frontend/src/views/admin/AdminLayout.vue`（侧边栏追加「内容管理」菜单）
- 契约 / 数据影响：
  - 新增 7 端点：前台 `GET /content-types`、`GET /contents?type=&page=&page_size=`、`GET /contents/{id}` + 后台 `GET/POST/PUT/DELETE /admin/contents(*)`（业务端点 46 → 53）
  - 新表 `content_types` + `content_items`（11 → 13 张表）
  - meta JSON 各板块字段约定：teaware→material/volume/category、origin→province/region、culture→era/tags、brand→founded/brand_origin/website、knowledge→subtype/difficulty
  - 新错误码：40450（板块不存在）、40460（条目不存在）
  - 已同步 `database/init.sql`（两张表 DDL + 种子）、`docs/api/openapi.yaml`（7 端点 + 9 个 schema）、`docs/api/README.md`（端点数）、`AGENTS.md`（表数+端点数）、`scripts/check_constants.py`（EXPECTED + claims）
  - 迁移 `0007_content_platform` 已在 `tea_guide` 与 `tea_guide_test` 双库执行
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m ruff check app` | Ruff | All checks passed | 批次五新增/修改文件 |
  | `cd backend; python -m ruff format --check app` | Ruff format | 通过 | 批次五新增/修改文件 + 2 批次遗留一起修复 |
  | `cd backend; python -m pytest -q` | 后端全量 | 153 passed | 回归零破坏 |
  | `cd backend; python -m pytest tests/test_content_smoke.py -q` | 批次五冒烟 | 5 passed | CONT-01~05：list_types/list_contents/invalid_type/not_found/admin_auth |
  | `cd frontend; npm run lint` | ESLint | 0 errors, 0 warnings | —— |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run test:run` | Vitest | 45 passed | 纯函数用例，未新增 |
  | `cd frontend; npm run build` | Vite 生产构建 | 通过 | ContentDetailView + AdminContentEdit 正确拆分 |
  | `python scripts/check_all.py` | 链接/常量/分层/前端/记录/密钥 | 全部 OK | 常量 53/84/34/13 |

- 验收结论：通过 —— 代码、静态检查、后端 158 条（153 回归 + 5 冒烟）、前端 lint/typecheck/test/build 全部通过；批次五 R1–R5 功能完整落地
- 基线例外：无新违规
- 遗留问题：
  - `AdminContentEdit` 编辑模式暂未实现详情回填（后端未加 `GET /admin/contents/{id}` 端点）；新增功能完整可用，编辑需手动在 PUT 请求体传完整字段
  - 批次五种子数据仅有 5 板块分类，无示例内容条目（用户可通过后台 AdminContents 录入）
  - batch5 测试仅 5 条冒烟，需后续补全 CONT-06（meta JSON 校验非法结构 → 400）与 CRUD 全链路（Service 层覆盖）
  - 批次五改动未提交 Git（留在工作区等用户指令）
- 回滚方式：`alembic downgrade 0006_contributions` + 回退上述文件

## 2026-11-10｜批次五完善：回填端点 + 测试补齐 + 种子数据 + utcnow 技术债

- 任务编号 / 分级：TASK-20261110-batch5-fix / B（后端 1 新端点 + Schema 调整，前端 1 API + 回填逻辑，测试 +6 条，种子数据迁移 + init.sql，技术债 8 处）
- 需求来源：批次五 build-log 遗留 5 项 + utcnow DeprecationWarning
- 主要变更：
  - **后端** `routers/admin.py` 新增 `GET /admin/contents/{item_id}` —— 后台详情（含下架条目，is_active 返回给编辑回填）
  - **后端** `services/contents.py` 新增 `admin_get_content()` + `_to_admin_out()`（含 is_active）；`ContentCreateRequest.validate_meta_for_type` 从 Service 手动调用改为 `@model_validator(mode="after")` 自动执行，ValueError → ValidationError → 422 → 400
  - **后端** `schemas/content.py`：`ContentItemOut.type_code` 设默认空串（非 ORM 列）；`ContentItemOut.is_active` 改为 Optional；所有 meta 校验异常经 Pydantic 自动重映射
  - **后端** 8 处 `datetime.utcnow()` → `datetime.now(timezone.utc)` —— `services/{contributions,upload,auth}.py` + `repositories/{list_repo,share_repo,tea_repo}.py`
  - **前端** `api/admin.ts` 新增 `getAdminContent(id)`
  - **前端** `views/admin/AdminContentEdit.vue`：编辑模式回填实现 —— 加载详情 → 表单填值 → meta JSON → 各板块 ref 对象还原
  - **前端** `types/index.ts`：`ContentItem.is_active` 新增 Optional
  - **数据库** `alembic/versions/0008_seed_content_items.py`（新）：5 板块各 1–2 条示例条目，upsert（按 title 去重）
  - **数据库** `database/init.sql`：追加 content_items 9 条种子数据（子查询 type_id）
  - **测试** `tests/test_content_smoke.py` 5 → 11 条 —— CONT-06 meta 结构校验（extra字段/tags非list/枚举超范围/URL格式/非法type_code → 400）、CONT-07 CRUD 全链路（创建→详情→更新软删→前台不可见）、CONT-08 软删恢复、CONT-09 后台详情 not found、CONT-10 板块筛选、CONT-11 operation_log 写入
  - **修复** `ContentCreateRequest` 的 meta 校验从 Service 层手动调用改为 Pydantic model_validator，异常自动走 FastAPI 重映射
- 契约 / 数据 / 安全影响：
  - 契约新增 `GET /admin/contents/{id}`（后台专用，游客 401）；`ContentItemOut` 新增可选 `is_active`（前台详情不含，不破坏既有）
  - 种子数据迁移 0008 幂等（按 title 去重）；init.sql 追加同样的 9 条示例
  - 安全：`model_validator` 改造后 meta 校验异常自动返回 400（之前可能漏校验被 Service 层手动调但异常不被捕获）
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `python -m pytest -q` | 后端全量 | **164 passed**（158 → +6） | DeprecationWarning 从 868 降至 779（少 89 条 utcnow 警告） |
  | `python -m pytest tests/test_content_smoke.py -v` | 批次五扩展 | **11 passed**（5 → +6） | CONT-06~11 |
  | `npm run typecheck` | 前端 | 通过 | ContentItem.is_active 新增 Optional |
  | `python scripts/check_all.py` | 全量静态 | **全部通过** | 242 links / 常量一致 / 五层检查 / 前台 UI / records / secrets |
- 遗留问题：
  - `ContentUpdateRequest` 的 meta 校验仍是 Service 层手动调 `_validate_meta`（PUT 时 title/type_code 不可改，meta 字段可能与板块不匹配 → 暂接受 PUT 时用户必须知板块）
  - SQLAlchemy 底层 `_ColumnDefault` 还有 2 条 utcnow DeprecationWarning（orm `default=func.utc_timestamp()`，来自 Alembic 框架内部），暂无法修复
  - 种子数据仅 9 条，前台展示可能偏少（可在后台继续录入）
- 回滚方式：`alembic downgrade 0007_content_platform` + 回退上述文件

## 2026-11-09｜批次四：S10–S13 用户贡献 + 管理员审核

- 任务编号 / 分级：TASK-20261109-batch4 / C（2 张新表 + 迁移 + 契约变更；用户确认于 2026-11-09 的 PLAN_剩余功能，本批不提交 Git）
- 需求来源：PRD S10–S13；[PLAN_剩余功能.md](../docs/development/plans/PLAN_剩余功能.md) §5
- 主要变更：
  - `backend/app/models/contribution.py`（新）：`Contribution`（type/payload JSON/三态/审核人/拒绝理由）+ `TeaNameCategoryMap`
  - `backend/app/alembic/versions/0006_contributions.py`（新）：建 `tea_name_category_map`（种子 22 条名品映射）+ `contributions`（FK×3、2 个复合索引）
  - `backend/app/schemas/contribution.py`（新）：`ContributionTeaPayload`（extra=forbid）、按 type 二选一校验、article 3–500 字、拒绝理由 1–200 字
  - `backend/app/repositories/contribution_repo.py`（新）：创建/我的列表/管理队列/已通过科普聚合/映射与名称查询；只 flush 不 commit
  - `backend/app/services/contributions.py`（新）：双层校验（映射表茶类一致性 + 名称相似度 >90% 拦截）、提交/删除规则、审核通过创建上架茶品+可选 tips、拒绝留理由、写 operation_logs
  - `backend/app/routers/contributions.py`（新，3 端点）+ `routers/admin.py` 扩展（审核队列/通过/拒绝 3 端点）+ `core/response.py`（`ContributionNotFound=40440`）
  - `backend/app/services/teas.py` + `schemas/tea.py`：`TeaDetail` 新增 `contributed_articles`（仅 approved 科普，倒序）
  - `frontend/src/types/index.ts` + `api/contributions.ts`（新）+ `api/admin.ts` 扩展
  - `frontend/src/views/ContributeView.vue`（投稿页：补充新茶 / 投稿科普双 Tab）、`views/MyContributionsView.vue`（我的提交：状态/理由/删除）、`views/admin/AdminContributions.vue`（Element Plus 审核后台：队列/详情/通过/预设理由拒绝）
  - `frontend/src/router/index.ts`（`/contribute`、`/my/contributions`、`/admin/contributions`）、`views/MyListView.vue`（投稿入口）、`views/TeaDetailView.vue`（茶友科普区 + 投稿入口）、`views/admin/AdminLayout.vue`（审核菜单）
- 契约 / 数据 / 安全影响：
  - 新增 6 个端点：`POST/GET(mine)/DELETE /contributions*` + `GET /admin/contributions`、`POST .../approve`、`POST .../reject`（业务端点 40 → 46）
  - 新表 `contributions`、`tea_name_category_map`（9 → 11 张表）；`TeaDetail` 增 `contributed_articles`；新错误码 `40440`
  - SECURITY 新增 S-34（贡献与审核门禁）；仅 pending 可删除/审核；审核仅管理员；payload 服务端组装防伪造
  - 已同步 `docs/api/API_CONTRACT.md` v1.5、`docs/api/openapi.yaml` 1.5.0、`docs/architecture/DATA_MODEL.md` v1.4、`database/init.sql`、`docs/testing/TEST_PLAN.md` v1.3（CONTRIB-01–08）、`docs/architecture/SECURITY.md` v1.2、`AGENTS.md`、`docs/api/README.md`、`scripts/check_constants.py`
  - 迁移 `0006_contributions` 已在 `tea_guide` 与 `tea_guide_test` 双库执行
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m ruff check app tests` | Ruff | All checks passed | —— |
  | `cd backend; python -m pytest -q` | 后端全量 | 153 passed | 含 `tests/test_contributions.py` 新增 8 条（映射校验/查重/越权/审核流转/详情聚合/权限） |
  | `cd frontend; npm run lint` | ESLint | 通过 | —— |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run test:run` | Vitest | 45 passed | 纯函数用例，未新增 |
  | `cd frontend; npm run build` | Vite 生产构建 | 通过 | —— |
  | `python scripts/check_all.py` | 链接/常量/分层/前端/记录/密钥 | 全部 OK | 常量 46/84/34/11 |
  | 浏览器投稿/审核冒烟 | 投稿→审核→详情展示 | 未运行 | 无浏览器自动化；需人工确认 |

- 验收结论：有条件通过 —— 代码、静态检查、后端 153 条与前端 45 条测试全部通过；投稿/审核链路未手工浏览器验证
- 基线例外：无
- 遗留问题：S10–S13 需人工在浏览器执行「投稿新茶 → 管理员通过 → 前台可见」与「投稿科普 → 通过 → 详情页展示」确认（责任人：用户；条件：前后端 dev server + 管理员账号）
- 回滚方式：`alembic downgrade 0005_multi_lists` + 回退上述文件
- 关联 ADR：无（贡献审核决策见 PLAN_剩余功能 §5 与 SECURITY S-34）

## 2026-11-09｜批次三：S9 多收藏清单

- 任务编号 / 分级：TASK-20261109-batch3 / C（表结构 + 迁移 + 契约变更；用户确认于 2026-11-09：删除清单时条目迁移到默认清单、不丢数据；本批不提交 Git）
- 需求来源：PRD S9；[PLAN_剩余功能.md](../docs/development/plans/PLAN_剩余功能.md) §4
- 主要变更：
  - `backend/app/models/collection_list.py`：新增 `is_default`，`UNIQUE(user_id, is_default)`（默认行 1、普通行 NULL）+ `idx_list_user`
  - `backend/app/models/favorite.py`：`favorite_items` 新增 `list_id`；唯一键改 `UNIQUE(list_id, tea_id)`；索引 `idx_favorite_list_created`
  - `backend/app/alembic/versions/0005_multi_lists.py`（新）：历史数据回填（全置默认 → 为缺失用户补建默认清单 → 回填 `list_id` → 切换唯一键）
  - `backend/app/repositories/list_repo.py`（重写）、`favorite_repo.py`：多清单查询、跨清单去重统计、清单归属锁
  - `backend/app/services/lists.py`（重写）：默认清单惰性创建（并发重试）、10 个上限、删除迁移合并、笔记读写
  - `backend/app/services/favorites.py`、`services/shares.py`：`list_id` 归属、锁序「清单 → 茶品」、跨清单 `favorite_count` 去重、分享按清单独立
  - `backend/app/routers/lists.py`（6 端点）、`routers/favorites.py`、`routers/shares.py`、`core/response.py`（`ListNotFound=40420`）、`schemas/list.py`/`favorite.py`/`share.py`
  - `backend/tests/test_lists.py`（重写 16 条）、`test_favorites.py`/`test_shares.py`/`test_g5_system.py`/`test_admin.py`/`test_batch1_features.py`/`test_batch2_features.py`：路径与断言迁移
  - `frontend/src/types/index.ts`、`api/lists.ts`/`favorites.ts`/`shares.ts`、`views/MyListView.vue`（清单侧栏 + 条目区）、`components/NoteEditor.vue`/`SharePanel.vue`
- 契约 / 数据 / 安全影响：
  - 新增 `POST /lists`、`GET /lists/{list_id}`、`DELETE /lists/{list_id}`；清单端点由 3 个增至 6 个（业务端点 37 → 40）
  - `POST /favorites/{tea_id}` 请求体可选 `list_id`；`DELETE` 可选 `list_id` 查询参数；`FavoriteState` 新增 `list_ids`
  - `POST /shares/generate` 请求体可选 `list_id`；新增错误码 `40420`
  - 已同步 `docs/api/API_CONTRACT.md` v1.4、`docs/api/openapi.yaml` 1.4.0、`docs/architecture/DATA_MODEL.md` v1.3、`database/init.sql`、`docs/testing/TEST_PLAN.md` v1.2（MLIST-01–06）、`AGENTS.md`、`docs/api/README.md`、`scripts/check_constants.py`
  - 迁移 `0005_multi_lists` 已在 `tea_guide` 与 `tea_guide_test` 双库执行；9 张表不变
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m ruff check app tests` | Ruff | All checks passed | —— |
  | `cd backend; python -m pytest -q` | 后端全量 | 145 passed | 含多清单 16 条与 FAV-09 |
  | `cd frontend; npm run lint` | ESLint | 通过 | —— |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run test:run` | Vitest | 45 passed | 纯函数用例，未新增 |
  | `cd frontend; npm run build` | Vite 生产构建 | 通过 | —— |
  | `python scripts/check_all.py` | 链接/常量/分层/前端/记录/密钥 | 全部 OK | 常量 40/76/33/9 |
  | 浏览器多清单冒烟 | 新建/改名/删除/迁移/笔记/分享 | 未运行 | 无浏览器自动化；需人工确认侧栏与迁移提示 |

- 验收结论：有条件通过 —— 代码、静态检查、后端 145 条与前端 45 条测试全部通过；多清单浏览器交互未手工验证
- 基线例外：无
- 遗留问题：S9 需人工在浏览器执行一次「新建清单 → 加入茶 → 删除清单」确认迁移与提示（责任人：用户；条件：前端 dev server + 已登录账号）
- 回滚方式：`alembic downgrade 0004_login_attempts` + 回退上述文件
- 关联 ADR：无（多清单决策见 DATA_MODEL §6 与 PLAN_剩余功能 §4）

## 2026-11-09｜批次二：S14 登录锁定 / S15 用户等级 / S16 个性化推荐 / S8 分享海报

- 任务编号 / 分级：TASK-20261109-batch2 / C（新表 + 登录安全规则；用户确认于 2026-11-09：锁定按「用户名 + IP」双维度、等级 4 档、允许引入前端 `qrcode` 依赖、本批不提交 Git）
- 需求来源：PRD S14/S15/S16/S8；[PLAN_剩余功能.md](../docs/development/plans/PLAN_剩余功能.md) §3
- 主要变更：
  - `backend/app/models/login_attempt.py`（新）、`models/__init__.py`：`login_attempts` ORM
  - `backend/app/alembic/versions/0004_login_attempts.py`（新）：建表 + 双维度索引
  - `backend/app/repositories/login_attempt_repo.py`（新）；`favorite_repo.py` 增收藏/笔记/茶类分布聚合；`share_repo.py` 增生效分享数
  - `backend/app/core/config.py`：`LOGIN_MAX_FAILURES` / `LOGIN_WINDOW_MINUTES` / `LOGIN_ATTEMPT_RETENTION_HOURS`
  - `backend/app/core/response.py`：`TooManyLoginAttempts(42900)`
  - `backend/app/services/auth.py`：锁定判定先于账号校验；失败记录 + 24h 清理；成功登录清空用户名记录
  - `backend/app/routers/auth.py`：登录传入 `request.client.host`
  - `backend/app/schemas/stats.py`、`services/stats.py`、`routers/me.py`（新）：`GET /me/stats` 与四档等级纯函数
  - `backend/app/services/teas.py`、`routers/teas.py`、`repositories/tea_repo.py`：`GET /teas/recommended`（偏好加权 + 排除已收藏 + 随机兜底）
  - `backend/tests/conftest.py`：每用例清空 `login_attempts`（TestClient IP 固定为 testclient，避免跨用例误锁）
  - `backend/tests/test_batch2_features.py`（新，10 条）；`backend/tests/test_g5_system.py`：AUTH-05 两段失败之间清空记录，避免与 S14 锁定交叉
  - `frontend/src/types/index.ts`、`api/me.ts`（新）、`api/teas.ts`：类型与接口
  - `frontend/src/views/HomeView.vue`：登录后随机发现改为「为你推荐」（推荐 id → 详情）
  - `frontend/src/views/MyListView.vue`：等级徽章与升级差距
  - `frontend/src/utils/poster.ts`（新）+ `poster.spec.ts`（新）；`components/SharePanel.vue`、`views/ShareView.vue`：canvas 海报 + 二维码下载
  - `frontend/package.json`：新增 `qrcode` / `@types/qrcode`（纯前端，动态 `import()`，仅海报功能加载）
- 契约 / 数据 / 安全影响：
  - 新增 `GET /teas/recommended`、`GET /me/stats`；`POST /auth/login` 新增 `42900` / HTTP 429
  - 新表 `login_attempts`；已同步 `docs/api/API_CONTRACT.md` v1.3、`docs/api/openapi.yaml` 1.3.0、`docs/architecture/DATA_MODEL.md` v1.2、`database/init.sql`、`docs/architecture/SECURITY.md` v1.1（S-33）、`docs/testing/TEST_PLAN.md` v1.1、`docs/product/PRD.md`（FR-4.4 / S14 / S15）
  - 迁移 `0004_login_attempts` 已在 `tea_guide` 与 `tea_guide_test` 双库执行
  - 安全项：新增 S-33；登录仍统一 40110，不泄露账号存在性；不记录密码明文
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m ruff check app tests` | Ruff | All checks passed | —— |
  | `cd backend; python -m pytest -q` | 后端全量 | 139 passed | 含批次二新增 10 条 |
  | `cd frontend; npm run lint` | ESLint | 通过 | —— |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run test:run` | Vitest | 45 passed（6 文件） | 含 `poster.spec.ts` 7 条 |
  | `cd frontend; npm run build` | Vite 生产构建 | 通过 | `qrcode` 为独立异步 chunk |
  | 浏览器海报冒烟 | S8 生成/下载/扫码 | 未运行 | 无浏览器自动化；需人工点击「下载分享海报」确认 PNG 与二维码可扫 |

- 验收结论：有条件通过 —— 代码、后端/前端静态检查与单测全部通过；S8 的真实浏览器下载与二维码扫描未验证
- 基线例外：无
- 遗留问题：S8 需人工在浏览器执行一次「下载分享海报」并扫码确认（责任人：用户；条件：前端 dev server 打开任一分享清单）
- 回滚方式：`alembic downgrade 0003_batch1_filters` + 移除 `qrcode`/`@types/qrcode` + 回退上述文件
- 关联 ADR：无（规则细节已在 PLAN_剩余功能 与 S-33 中记录）

## 2026-11-09｜批次一：S1/S2/S3/S6/S7/S17（筛选扩展 / 对比 / 相关推荐 / 小贴士 / 热度）

- 任务编号 / 分级：TASK-20261109-batch1 / B（新增查询参数与两个只读端点，未破坏既有契约；表结构变更经用户确认按批次一方案执行）
- 需求来源：PRD S1/S2/S3/S6/S7/S17；`docs/development/plans/PLAN_剩余功能.md`
- 主要变更：
  - `backend/app/models/tea.py`：`Tea` 增 `price_min/price_max`；`TeaTips` 增 `created_at/updated_at`
  - `backend/app/alembic/versions/0003_batch1_filters.py`：新增价格列、小贴士时间戳、`idx_favorite_created_tea` 索引，并从 `price_range` 回填价格
  - `backend/app/schemas/tea.py`：`TeaDetail` 增价格字段、`TeaBaseRequest` 价格校验、新增 `LatestTipItem`
  - `backend/app/repositories/tea_repo.py`：列表支持发酵/价格/`filter_mode`；`list_hot` 改 7 天加权；新增 `list_related`、`list_latest_tips`
  - `backend/app/services/teas.py`、`backend/app/routers/teas.py`、`backend/app/routers/tips.py`、`backend/app/main.py`：相关推荐与最新小贴士端点
  - `frontend/src/types/index.ts`、`api/teas.ts`、`utils/teaQuery.ts`、`utils/compare.ts`（新）：类型、接口、筛选纯函数、对比矩阵
  - `frontend/src/views/TeaListView.vue`（发酵/价格/组合方式 UI）、`TeaDetailView.vue`（相关推荐改新接口）、`HomeView.vue`（小贴士区块）、`CompareView.vue`（新）、`router/index.ts`（/compare）
  - `database/init.sql`：同步价格字段、小贴士时间戳、索引
- 契约 / 数据 / 安全影响：
  - 新增端点 `GET /teas/{tea_id}/related`、`GET /tips/latest`；列表新增 `fermentation/price_min/price_max/filter_mode` 查询参数；`TeaDetail` 新增 `price_min/price_max`
  - 已同步 `docs/api/API_CONTRACT.md`（§2.3、§4.2.1、§4.2.4、新增 §4.2.8/§4.2.9）、`docs/api/openapi.yaml`、`docs/architecture/DATA_MODEL.md`
  - 迁移：`0003_batch1_filters`（已在 `tea_guide` 与 `tea_guide_test` 双库执行）
  - 安全项：无放宽；新增端点均为游客只读
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m pytest -q` | 后端全量 | 119 passed + 批次一新增 10 passed | 迁移后执行 |
  | `cd frontend; npm run lint` | ESLint | 通过 | —— |
  | `cd frontend; npm run typecheck` | vue-tsc | 通过 | —— |
  | `cd frontend; npm run test:run` | Vitest | 通过（含 teaQuery 19 + compare 3） | —— |
  | `cd frontend; npm run build` | Vite 生产构建 | 通过 | —— |

- 验收结论：通过
- 基线例外：无
- 遗留问题：无（S3 对比页每类各取 1 款代表茶，未做任意多茶对比，符合 MVP 范围）
- 回滚方式：`alembic downgrade 0002_content_expansion` + 回退对应前后端文件
- 关联 ADR：无

## 2026-11-09｜批量录入 30 款茶（六大茶类各 5 款）+ CC0 配图

- 任务卡 / 分级：B（新增业务数据，不改端点/契约/表结构）
- 需求来源：用户要求"多加一些茶"，从原 6 款扩展至 36 款
- 主要变更：
  - 通过 `POST /admin/teas` 录入 30 款茶（id 7–36），六大茶类各 5 款
  - 文字数据：茶名/产地/季节/发酵度/价格/代表品种/外形/汤色/香气/滋味/水温/投茶量/冲泡时间 + 4 项小贴士，参考公开茶知识改写，未直接复制第三方站点原文
  - 配图：每款 1 张主图 + 1 张图集，均来自 Wikimedia Commons CC0 / Public domain；部分茶未搜到专用图，用品类通用图或同品类已有图兜底
  - 修复：霍山黄芽主图曾误配玫瑰花，已替换为黄茶品类图
- 茶品清单（每类 5 款）：
  - 绿：碧螺春、黄山毛峰、信阳毛尖、六安瓜片、庐山云雾
  - 白：白牡丹、寿眉、贡眉、月光白、新工艺白茶
  - 黄：蒙顶黄芽、霍山黄芽、远安鹿苑、平阳黄汤、海马宫茶
  - 乌龙：铁观音、凤凰单丛、冻顶乌龙、武夷肉桂、武夷水仙
  - 红：祁门红茶、滇红、九曲红梅、宜红、川红
  - 黑：安化黑茶、六堡茶、千两茶、茯砖茶、康砖茶
- 契约 / 数据 / 安全影响：仅新增数据行，无代码/契约/表结构变更
- 测试证据：

  | 命令 | 范围 | 结果 |
  |---|---|---|
  | `GET /teas?page_size=100` | 茶品总数 | 36 款，六大茶类各 6 款 |
  | 36 款茶详情接口 | 主图+图集 | 全部 main_image_url 非空、image_set ≥ 1 |
  | `python -m pytest -q` | 后端全量 | **119 passed**（零回归） |

- 验收结论：通过
- 遗留问题：
  - 图片均为 CC0 品类示意图，非具体茶品实拍；正式上线前建议替换自有实拍
  - 部分茶复用了同品类图片，可能出现重复；仅作演示
  - 未做浏览器端对全部 36 款的逐一点验（已验首页与详情页基本功能）
- 回滚方式：`DELETE /admin/teas/{id}` 逐款删除，或直接清库重置种子数据
- 关联文档：[素材清单.md §5.3](../docs/product/素材清单.md)

## 2026-11-09｜文档与常量同步收口（X-02~08 遗留）

- 任务卡 / 分级：A（纯文档/常量同步，不改代码行为）
- 需求来源：`check_all.py` 全量检查暴露的契约与记录不同步问题
- 主要变更：
  - `docs/api/openapi.yaml`：v1.0.0 → v1.2.0；新增 `GET /teas/{tea_id}/images`、`POST /admin/media/video`、`POST/DELETE /admin/teas/{tea_id}/images[/{image_id}]` 共 4 个端点；`TeaDetail` 增 `video_url`/`video_duration`/`image_set`；新增 `TeaMediaItem`/`TeaMediaCreateRequest`/`VideoUploadResult`/`DeletedEnvelope` 等 schema
  - `AGENTS.md`：§6 表数 7→8（增 `tea_media`）、§7 端点数 29→33（teas 7 / admin 11）、§3.1 同步
  - `docs/api/README.md`：端点数 29→33
  - `scripts/check_constants.py`：`openapi_operations` 29→33、`database_tables` 7→8，口径声明同步
  - `docs/development/ADR/ADR-0003-content-expansion.md`：修正 5 个相对链接路径（少一级 `../`）
  - `docs/development/ADR/README.md`：索引补 ADR-0003
  - `docs/development/PLANS_扩展.md`：X-07 状态更新为已落地
  - `harness/build-log.md`：X-01/02~08/07 三条目移至记录区顶部，恢复日期倒序
- 契约 / 数据 / 安全影响：仅文档与常量对齐，无运行时行为变更
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `python scripts/check_all.py` | 全量静态检查 | **全部通过** | links/constants/layers/frontend/records/secrets 均 OK |
  | `python -m pytest -q` | 后端全量 | **119 passed**（18.90s） | 数据/文档变更零回归 |
  | `npm run build` | 前端生产构建 | 通过（1.53s） | 仅既有 chunk >500kB 警告 |
  | `python -c "yaml.safe_load(openapi.yaml)"` | OpenAPI 语法 | OK | YAML 可解析 |

- 验收结论：通过
- 遗留问题：见本条目之前的 X-07 条目（浏览器手工冒烟、君山银针/大红袍图集仅 1 张、git 未提交）
- 回滚方式：revert 上述文档/常量改动即可
- 关联 ADR：[ADR-0003](../docs/development/ADR/ADR-0003-content-expansion.md)

## 2026-11-09｜X-01 内容扩展：Alembic 基线接管 + S4/S5 表结构迁移

- 任务卡 / 分级：C（表结构变更；ADR-0003 已于 2026-11-09 经用户确认「全部按推荐方案执行」后采纳）
- 需求来源：内容扩展提案（PRD_扩展提案.md），本期范围 = 方案二（S4 图片集 + S5 视频 + R7 首页背景 + R8 素材）
- 主要变更：
  - `backend/app/alembic/versions/0001_baseline.py`：空操作基线迁移（基线结构由 `database/init.sql` 建立；已建库环境 `alembic stamp 0001_baseline`）——Alembic 正式接管版本链（此前 versions/ 为空，MVP 全靠 init.sql）
  - `backend/app/alembic/versions/0002_content_expansion.py`：`teas` 增 `video_url VARCHAR(500) NULL` / `video_duration INT UNSIGNED NULL`；新建 `tea_media` 表（FK→teas ON DELETE CASCADE，idx(tea_id, sort_order)）
  - `backend/app/models/tea.py`：Tea 增两列映射 + `media_images` relationship；新增 `TeaMedia` 模型；`models/__init__.py` 导出
  - `database/init.sql`：同步新列与 tea_media 建表语句（保持从零建库可用）
  - `docs/architecture/DATA_MODEL.md` v1.0→v1.1：§2 表清单第 8 行、§3 ER 图、§4.2 新列、§4.3.1 tea_media 小节、§10 S4/S5 标记已落地
  - `backend/alembic.ini`：中文注释改英文（修复 Windows GBK locale 下 configparser 解码失败；该文件此前从未实际运行所以未暴露）
  - 提案文档确认状态同步：ADR-0003 转「已采纳」，PRD_扩展提案 Q1–Q5、PLANS_扩展 前置清单全部标记已确认
- 契约 / 数据 / 安全影响：表结构变更（本次）；API 契约暂未变（TeaDetail 增字段属 X-04a）；无安全项变更
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `alembic stamp 0001_baseline && upgrade head` | tea_guide（开发库） | 通过 | current = 0002_content_expansion (head) |
  | stamp → upgrade → downgrade → upgrade 循环 | tea_guide_test（测试库） | 通过 | 升降级可重放，最终 current = head |
  | SHOW COLUMNS / SHOW INDEX 结构断言 | 两库 | 通过 | teas 两新列 NULL 许可正确；tea_media 5 列 + PK + idx_tea_media_tea 正确 |
  | `python -m pytest -q` | 后端全量 | **106 passed**（18.69s） | schema 变更对现有功能零破坏 |
  | `ruff check app tests` / `ruff format --check app` | 后端静态 | 通过 | 初次 format 有 1 文件待整理，已修复复检通过 |

- 验收结论：通过（X-01a/X-01b 出口标准全部满足）
- 遗留问题：
  - 首次执行 0002 时因 `op.create_table` 误用裸 kwargs（engine/charset）失败，teas 两列已落库但 tea_media 未建；已手工回滚中间态两列后重放成功。教训：方言参数必须用 `mysql_` 前缀；已修正迁移文件。
  - 前端 `types/index.ts` 的 TeaDetail 类型暂未加 video 字段——属 X-04a 范围，届时同步。
- 回滚方式：`alembic downgrade 0001_baseline`（两库均已验证可回滚）；revert 模型与文档变更
- 关联 ADR：[ADR-0003](../docs/development/ADR/ADR-0003-content-expansion.md)

## 2026-11-09｜X-02~X-08 内容扩展：S4 图片集 + S5 视频 + 首页装饰背景

- 任务卡 / 分级：ADR-0003 已采纳后落地；X-03/X-04a/X-05a 为契约追加（C 类已确认，实现级 B），X-02/X-04b/X-05b/X-06/X-08 为 B 类
- 主要变更（后端）：
  - `core/config.py`：新增 `MAX_VIDEO_SIZE_MB=50`、`MAX_VIDEO_DURATION_SECONDS=180`、`MAX_VIDEO_REQUEST_BODY_MB=52`
  - `core/response.py`：新增 `VideoTooLarge(41300)`、`UnsupportedVideo(41500)`、`VideoTooLong(40000)`、`VideoUnreadable(40000)`，沿用既有错误码族，不新增业务码
  - `main.py`：请求体上限按路径分流，仅 `/admin/media/video` 放宽到 52 MB
  - `services/upload.py`：新增 ISO BMFF `ftyp` 魔数判定与 `moov/mvhd` 时长解析（无 ffprobe 依赖），落盘 `uploads/videos/{YYYY}/{MM}/`
  - `services/admin.py` + `routers/admin.py`：新增 `POST /admin/media/video`
  - `schemas/tea.py`：`TeaDetail` 增 `video_url`/`video_duration`/`image_set`；`TeaBaseRequest` 增视频字段（`video_url` 强制 `/uploads/` 前缀，`video_duration` 1–180）
  - 新增 `repositories/tea_media_repo.py`、`services/tea_media.py`；`routers/teas.py` 增 `GET /teas/{id}/images`；`routers/admin.py` 增 `POST/DELETE /admin/teas/{id}/images[/{image_id}]`
  - `repositories/tea_repo.py`：详情查询 `selectinload(Tea.media_images)`
- 主要变更（前端）：
  - `types/index.ts`：`Tea` 增视频/图片集字段；新增 `AdminVideoUploadData`、`TeaMediaItem`；`AdminTeaPayload` 增视频字段
  - `api/admin.ts` / `api/teas.ts`：新增 `uploadAdminVideo`、`addAdminTeaImage`、`deleteAdminTeaImage`、`getTeaImages`
  - `TeaDetailView.vue`：视频播放器（无视频/加载失败整块隐藏）+ 图片集缩略图切换主图
  - 新增 `components/HeroBackground.vue`：纯装饰轮播（无跳转）、可关闭并记忆（localStorage）、尊重 prefers-reduced-motion、首张 eager 其余 lazy、加载失败自动剔除
  - `HomeView.vue`：Hero 接入装饰背景层，内容层 `z-index:1`
  - `AdminTeaEdit.vue`：视频上传/清除/预览 + 图片集上传/删除（上限 9 张提示）
  - 新增 6 张水墨风格占位背景 `public/images/banners/*.svg`（明确标注"占位图 · 待实拍替换"）
- 文档同步：
  - `docs/api/API_CONTRACT.md` v1.1→v1.2：`TeaDetail` 字段、§4.2.7、§4.6.9/10/11、§4.6.3/4.6.4 请求字段、变更记录
  - `docs/development/PLANS_扩展.md`：X-01~X-08 状态回填
  - 新增 `docs/product/素材清单.md`：目录/命名/格式/体积/兜底/来源登记/待补清单
- 契约 / 数据 / 安全影响：契约追加 4 个端点与 3 个详情字段（向后兼容，老字段不变）；无新增表（X-01 已完成）；请求体上限仅对视频端点放宽，其余仍 6 MB；视频与图片均校验魔数，不信任客户端类型
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `pytest tests/test_s4_s5.py -q` | 新增 S4/S5 | 13 passed | 视频上传正常/非视频/超时长/未登录/外链拒绝；图片集增删查/上限/越权/下架隐藏 |
  | `python -m pytest -q` | 后端全量 | **119 passed**（17.68s） | 原 106 条零回归 |
  | `ruff check app tests` / `ruff format --check app tests` | 后端静态 | 通过 | 格式化后复检通过 |
  | `npm run typecheck` | 前端类型 | 通过 | |
  | `npm run lint` | 前端 ESLint | 通过 | |
  | `npm run test:run` | 前端 Vitest | **30 passed** | 原有 30 条，无新增纯函数 |
  | `npm run build` | 生产构建 | 通过（4.90s） | 仅既有的 Element Plus chunk >500 kB 警告 |
  | 结构断言 | tea_guide / tea_guide_test | 通过 | X-01 已完成，本轮无 DDL 变更 |

- 验收结论：功能与门禁通过；**未做浏览器端手工冒烟**（未启动 dev server 实际点击），如需请另开一轮
- 遗留问题：
  - 图片集删除仅解除数据库关联，磁盘文件保留（同一 URL 可能被多茶复用）；已在 API 契约与素材清单注明
  - 视频时长解析依赖 `moov/mvhd`；缺失 `moov` 的异常封装文件会返回 40000「无法解析视频时长」
  - 六大茶类与每款茶的**真实实拍图尚未提供**，当前为占位图；`素材清单.md` 已列出待补项与来源登记字段
  - 首页背景在 `prefers-reduced-motion` 与用户关闭开关时停止轮播，但仍保留首张静图
- 回滚方式：revert 本轮提交即可；无 DDL 回滚需求
- 关联 ADR：[ADR-0003](../docs/development/ADR/ADR-0003-content-expansion.md)

## 2026-11-09｜X-07 素材落地：首页 6 张背景 + 6 款茶主图/图片集

- 任务卡 / 分级：B（仅新增静态素材与内容数据，不改端点行为、契约字段、表结构、业务规则）
- 需求来源：用户要求「图片去这些网站里找，加上；首页只加图片背景，不要视频」，并在 AskUserQuestion 中选择「用 CC0 公共领域图库」「茶品主图与图片集一起配」
- 关于用户给出的 5 个中文茶站（音茶网 / 茶语网 / ipucha / 茶百科 / 普洱茶网）：均为受版权保护的商业站点，且多启用防盗链，直接抓图存在侵权与失效风险，故**未采用**；改用 Wikimedia Commons 的 CC0 / Public domain 文件，可商用且可回溯
- 主要变更：
  - `frontend/public/images/banners/banner-{green,white,yellow,oolong,red,dark}.webp`：6 张首页装饰背景，1600×900，单张 92–307 KB（≤320 KB 限制）
  - `backend/uploads/2026/11/*.webp`：本轮生成 17 张茶品图片（6 张主图 + 11 张图集），1200×900，单张 ≤300 KB
  - 通过 admin API 写库：6 款茶 `teas.main_image_url` 全部指向本站 `/uploads/`；`tea_media` 图片集共 11 条（西湖龙井 3 / 白毫银针 2 / 正山小种 2 / 普洱熟茶 2 / 君山银针 1 / 大红袍 1）
  - `docs/product/素材清单.md`：§1 约束改写为"CC0 品类示意图"口径；§3 首页背景改为已落地 WebP；§5 重写为素材来源登记表（6 张背景 + 6 款茶，含 Commons 文件页、许可、日期）
  - 生成脚本与映射表仅存放于 `%TEMP%`，不进仓库
- 契约 / 数据 / 安全影响：无契约变更；仅写内容数据（`teas.main_image_url`、`tea_media` 行）；所有 URL 均由服务端 `POST /admin/upload` 生成，符合"禁止第三方外链"约束
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `python %TEMP%/build_dark.py` | 黑茶素材生成 | 通过 | banner 291 KB + 3 张茶图 |
  | `python %TEMP%/apply_tea_assets.py` | 写库（admin API） | 通过 | 6 款茶 PUT 均 200/0；图片集追加 11 条均 200/0 |
  | `python %TEMP%/verify_assets.py` | 落库与静态可访问性 | **failures = 0** | 6 款茶主图 + 图片集 URL 全部 HTTP 200；6 张 banner 全部 200（92–300 KB） |
  | `python -m pytest -q` | 后端全量 | 未运行 | 本轮无代码改动，仅数据与静态文件；如需可复跑 |

- 验收结论：通过（素材已落地并可访问）；浏览器端手工冒烟已通过（首页 6 张 CC0 背景轮播、无视频、无暂停按钮；详情页主图与缩略图切换正常）
- 已知局限：
  - CC0 图库只能提供**品类示意**：如"西湖龙井"主图为茶园/茶叶泛图，并非该款茶实拍；已在 `素材清单.md` §1.2 与 §5 顶部明确标注
  - 君山银针、大红袍已补足至各 2 张图集（2026-11-09 第二轮补充：Tieguanyin2、Tea cloth with autumn leaves motif 等 CC0/PD 图源）；六款茶图集均 ≥ 2 张
  - `banner-{category}.svg` 保留为三级兜底，未删除
- 回滚方式：删除 `frontend/public/images/banners/*.webp` 与 `backend/uploads/2026/11/` 下本轮新增文件；数据库侧清空 `teas.main_image_url`、删除 `tea_media` 对应行（或 `alembic downgrade` 后重建）
- 关联 ADR：[ADR-0003](../docs/development/ADR/ADR-0003-content-expansion.md)

## 2026-11-09｜项目交付 README 生成

- 任务编号 / 分级：TASK-20261109-README / A（纯文档产出，未触碰业务规则、契约、表结构与安全项）
- 需求来源：用户要求结合实际代码、配置与真实测试结果生成项目 README.md，并检查部署条件
- 主要变更：
  - `README.md`（新建）：项目简介 / 建设目标 / 功能介绍 / 技术栈 / 目录结构 / 数据库初始化 / 前后端启动 / 配置说明 / 测试方法与结果 / 截图 / 已知问题 / 部署条件与步骤
- 契约 / 数据 / 安全影响：无；README 未写入任何真实密码或密钥（种子管理员口令仅指引查阅 init.sql 注释并要求轮换）
- 测试证据（本次为验证 README 声明而实跑，非代码变更回归）：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m pytest -q --tb=no` | 后端全量 | 106 passed, 488 warnings in 47.02s | 与 README §10.2 一致 |
  | `cd frontend; npm run test:run` | 前端单测 | 30 passed（4 文件） | 与 README §10.2 一致 |
  | `cd frontend; npm run build` | 生产构建 | ✓ built in 3.51s | 仅有 chunk >500kB 既有告警 |
  | `python scripts/check_all.py` | 全量静态检查 | 全部通过 | 含 README 新增链接校验 |

- 验收结论：通过（截图缺失、CI 未实跑、未实机部署均已在 README 如实标注）
- 基线例外：无
- 遗留问题：README §11 截图待补充；首次部署需编写 Nginx 配置并实机验证 §13.2 步骤
- 回滚方式：删除 `README.md` 并回退本条记录
- 关联 ADR：无

## 2026-11-09｜全项目代码审查问题修复（S-1/S-2/G-1~G-6/O-1~O-3）

- 任务编号 / 分级：REVIEW-20261109 / B（无契约变更；涉及安全默认值与前台依赖调整）
- 需求来源：用户全项目代码审查报告的 10 个检查维度
- 主要变更：
  - `backend/app/core/config.py`：`DEBUG` 默认改为 `False`；`SECRET_KEY`/`MYSQL_PASSWORD` 取消弱默认值；新增启动校验，缺失 `SECRET_KEY` 拒绝启动（S-31）
  - `backend/alembic.ini`：移除 `root:root` 明文，改为占位值（实际连接仍由 `env.py` 注入）
  - `backend/app/repositories/tea_repo.py`：`origin` 筛选补 LIKE 通配符转义；`get_by_id` 增加 `with_tips` 参数
  - `backend/app/core/security.py`：`SESSION_EXPIRE_DAYS <= 0` 时显式判定立即过期（覆盖配置值分支）
  - `backend/app/routers/auth.py`：内联 import 上移，复用 `USERNAME_PATTERN`
  - `backend/app/services/favorites.py`：收藏查询跳过 `tea_tips` 联表
  - `backend/app/services/shares.py`：令牌重试耗尽改抛 `InternalError`，保持统一响应体
  - 新增 `repositories/_common.py`、`services/_common.py`、`schemas/_common.py`，消除 `escape_like`/`split_csv`/`iso_z` 重复定义
  - `frontend/src/stores/toast.ts` + `components/AppToast.vue`：自研 Toast 替代 `ElMessage`
  - `frontend/src/api/request.ts`：错误提示改用 Toast Store
  - `frontend/src/main.ts`：Element Plus 改为仅在 `/admin` 路由动态加载
  - `frontend/src/views/NotFound.vue`：`el-button` 改自研按钮
  - `frontend/src/types/index.ts`：新增 `ApiEnvelope<T>` 并统一 5 个 api 模块；删除未使用 `ShareToken`
  - 删除 `components/HelloWorld.vue`、`assets/{hero.png,vite.svg,vue.svg}`、`favorite_repo.count_by_user`
  - `scripts/check_layers.py` / `scripts/check_frontend.py`：清空历史遗留基线
  - `backend/tests/test_teas.py`：新增 origin 通配符转义回归用例
  - `backend/tests/conftest.py`：测试环境注入 `DEBUG`/`SECRET_KEY`
  - `AGENTS.md` §3.1：Element Plus 条目更新为已修复
- 契约 / 数据 / 安全影响：无端点、字段、表结构变更；SECURITY S-30/S-31 的代码兜底加强（默认值收紧 + 启动校验），未同步修改安全控制条目
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m ruff check app tests` | 后端风格 | 通过 | —— |
  | `cd backend; python -m ruff format --check app tests` | 后端格式 | 通过 | —— |
  | `cd backend; python -m pytest -q` | 后端全量 | 106 passed | 含新增 origin 转义用例 |
  | `cd frontend; npm run lint` | 前端 ESLint | 通过 | —— |
  | `cd frontend; npm run typecheck` | 前端类型 | 通过 | —— |
  | `cd frontend; npm run test:run` | 前端单测 | 30 passed | 纯函数用例 |
  | `cd frontend; npm run format:check` | 前端格式 | 通过 | —— |
  | `cd frontend; npm run build` | 生产构建 | 通过 | Element Plus 已拆分为 admin 异步 chunk |
  | `python scripts/check_all.py` | 全量静态检查 | 全部通过 | 五层 0 遗留、前台 UI 0 遗留 |

- 验收结论：通过
- 基线例外：无（AGENTS §3.1 Element Plus 遗留已清理）
- 遗留问题：
  - O-4 `ORDER BY RAND()` 未调整：当前茶品量级（<1000）下成本可接受，改为随机偏移会引入额外 count/offset 查询与分布偏差，待数据量增长后再评估
  - O-5 初始 Alembic 迁移未生成：当前建表仍以 `database/init.sql` 为准，正式上线前需在空库生成 baseline migration 并对现有环境 `alembic stamp`
- 回滚方式：`git revert` 本次提交
- 关联 ADR：无

## 2026-11-08｜G5 测试缺陷修复（D-01 ~ D-05）

- 任务编号 / 分级：TASK-20261108-G5FIX / **B**（未改 API 契约、表结构、权限/认证机制与安全控制口径；D-04 默认密码置空为向既有 SECURITY S-31 对齐，属实现向文档对齐）
- 需求来源：`docs/testing/TEST_REPORT.md` 缺陷清单；TEST_PLAN TC-AUTH-07 / TC-LIST-05 / TC-DEF-02 / TC-DEF-04；SECURITY S-21 / S-26 / S-31
- 主要变更：
  - `backend/app/core/security.py`：`max_age_days <= 0` 显式立即过期，修复 0 回落 30 天与 itsdangerous 同秒 `age=0` 不过期两处根因。
  - `backend/app/repositories/tea_repo.py` / `admin_repo.py`：新增 `_escape_like()`，转义 `\`/`%`/`_` 并显式 `escape="\\"`，修复搜索通配符返回全表。
  - `backend/app/main.py`：新增 6MB Content-Length 中间件（先注册，CORS 后注册为最外层），超限返回 413/41300。
  - `backend/app/core/response.py`：新增 `DataError → 400/40000`，仅记录方法/路径/异常类型，不写参数与 SQL。
  - `backend/app/core/config.py`：`ADMIN_PASSWORD` 默认置空（S-31），新增 `MAX_REQUEST_BODY_MB=6`。
  - `backend/.env.example`：清空 `ADMIN_PASSWORD` 并补充轮换命令；`backend/.env` 与 `database/init.sql` 的开发/演练种子保持不变。
  - 新增 `backend/app/scripts/rotate_admin_password.py` + `__init__.py`：bcrypt cost=10，复用 `user_repo`，输出不含明文。
  - `backend/tests/test_g5_system.py`：新增 DEF-02、DEF-04 两条回归，强化 AUTH-07（0/-1 过期、末位高位翻转篡改），共 23 条。
  - `docs/testing/TEST_REPORT.md`：更新统计、逐条结果、缺陷修复记录与命令输出。
- 契约 / 数据 / 安全影响：无 API 契约/表结构/迁移变更；未修改 SECURITY 规则；S-26 错误响应仍不泄露堆栈/SQL；S-31 通过默认密码清空 + 轮换脚本补齐。
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `python -m ruff format --check app tests` | 后端格式 | 55 files already formatted | 修复后复跑 |
  | `python -m ruff check app tests` | 后端 lint | All checks passed | 修复后复跑 |
  | `pytest -q <AUTH-07/LIST-05/DEF-02/DEF-04>` | 四条初测失败/未执行 | 4 passed | 失败用例全绿 |
  | `pytest -q <§7.1 门禁 9 条>` | 安全门禁 | 9 passed, 10 warnings in 6.86s | 含 DEF-04 真实轮换与恢复 |
  | `python -m pytest -q` | 后端全量 | 105 passed, 484 warnings in 17.25s | 0 skip |
  | `npm run lint / format:check / typecheck / test:run / build` | 前端质量门禁 | 全部通过；30 tests passed；build 12.21s | 主 chunk >500 kB 告警非失败 |
  | `python scripts/check_all.py` | 静态检查 | 全部通过 | 205 链接；29/60/32/7；153 文件无敏感信息 |
  | GitHub Actions CI | CI | 未运行 | 未在远端实跑，不标记通过 |

- 验收结论：**通过**（60/60 用例、32/32 高优先级；D-01～D-05 关闭；CI 未运行已如实标注）
- 基线例外：无新增；前台 Element Plus 仍为既有 3 项基线
- 遗留问题：
  - 生产 Nginx `client_max_body_size` 需配置为 6m 并复测 413（部署项，非代码范围）。
  - CI 需在 GitHub Actions 实跑后回填结果；未运行前不宣称通过。
  - `ADMIN_PASSWORD` 默认值为空需同步部署文档，避免新环境缺省注入导致无管理员。
- 回滚方式：`git revert` 本提交；代码回滚不影响数据库已存密码；如已在环境执行轮换，用原密码重新执行脚本恢复。
- 关联 ADR：无（均为既有规则内的缺陷修复，未产生架构级决策）

## 2026-11-08｜阶段 5（G5）系统测试

- 任务编号 / 分级：TASK-20261108-G5 / 测试任务（不改生产代码）
- 需求来源：TEST_PLAN v1.0 §5 / §7.1；用户阶段 5 系统测试要求
- 主要变更：
  - `backend/tests/test_g5_system.py`：新增 21 条补充用例，函数名携带 TC 编号，补齐认证边界、会话过期/篡改、管理员校验、分页排序、通配符、权限副作用、分享字段、并发与 E2E。
  - `docs/testing/TEST_REPORT.md`：新增 60 条用例执行记录、缺陷清单、并发与端到端证据、命令输出摘录。
- 契约 / 数据 / 安全影响：无接口、表结构、安全控制变更；发现 D-01–D-04 四项缺陷，未在本任务修复。
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m pytest -q --tb=no` | 后端全量 | 101 passed / 2 failed / 0 skipped | 失败为 TC-AUTH-07、TC-LIST-05，断言未放宽 |
  | `pytest -q <8 条安全门禁节点>` | TEST_PLAN §7.1 | 8 passed | TC-DEF-04 因脚本缺失未执行 |
  | `cd frontend; npm run lint / format:check / typecheck / test:run / build` | 前端质量门禁 | 全部通过；30 tests passed | 构建有 chunk >500 kB 告警，非失败 |
  | `python scripts/check_all.py` | 静态检查 | 全部通过 | 205 链接、29 端点、60 用例、32 安全项、7 表 |

- 验收结论：**不通过**（高优先级 TC-DEF-04 未执行，构成发布阻断；另有 3 条中优先级缺陷）
- 基线例外：无新增；前台 Element Plus 仍为既有 3 项基线
- 遗留问题：
  - D-01 `verify_session_token(max_age_days=0)` 回落 30 天，需按 `is not None` 修复。
  - D-02 搜索 `%`/`_` 未转义，返回全表，需在 repository 层转义。
  - D-03 10MB `shape_desc` 返回 500，需补请求体大小限制与字段长度上限。
  - D-04 `app.scripts.rotate_admin_password` 缺失；`admin123` 仍在 `.env`/`init.sql`，需实现轮换脚本并演练。
- 回滚方式：删除 `backend/tests/test_g5_system.py` 与 `docs/testing/TEST_REPORT.md` 即可；测试临时数据已清理。
- 关联 ADR：无

## 2026-11-08｜审计问题修复：门禁 / 错误处理 / 测试库隔离 / 认证回流

- 任务卡 / 分级：AUDIT-FIX-01 / **B**（未改 API 契约、表结构、认证机制与安全控制）；其中"创建测试库 + 测试配置"为 **C** 类，用户于 2026-11-08 通过选项明确确认
- 需求来源：PLANS.md T0-03、T0-04、T1-02、T5-01、T5-02、T5-03；TEST_PLAN TC-DEF-01、TC-DEF-03；AGENTS.md §4、§9、§10.1
- 主要变更：
  - `app/core/response.py`：新增兜底 `Exception` 处理器，统一返回 500/50000；服务端用 `logger.exception` 记录堆栈，响应体不含堆栈/SQL/表名
  - `backend/tests/conftest.py`（新建）：导入 `app.*` 前强制测试库；优先读取 `DATABASE_URL_TEST`，否则默认 `tea_guide_test`；启动断言库名必须 `*_test`；同时隔离 `UPLOAD_DIR` 到系统临时目录
  - `backend/tests/test_defense.py`（新建）：DEF-01（畸形 JSON、非 JSON Content-Type、参数类型错误、role 注入不落库）与 DEF-03（未捕获异常 500/50000、响应不泄露、服务恢复）
  - `backend/.env.example`：补充 `DATABASE_URL_TEST` 示例（注释状态）
  - `frontend/src/views/admin/AdminLogin.vue`、`AdminTeaEdit.vue`、`AdminTeas.vue`：Prettier 格式化
  - `frontend/src/utils/pendingAction.ts`（新建）+ `pendingAction.spec.ts`（新建）：登录前动作暂存/解析/30 分钟过期
  - `frontend/src/views/TeaDetailView.vue`：未登录点击笔记/分享时保存 pending_action，登录回跳后自动继续原动作并清理
- 契约 / 数据 / 安全影响：无端点、字段、表结构变更；500 响应符合 API_CONTRACT §1.6；未改动 SECURITY S-01–S-32
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `cd backend; python -m pytest -q` | 全部后端用例（82 条） | 82 passed | 已切换至 `tea_guide_test` |
  | `python -m ruff check app tests`、`ruff format --check` | 后端静态 | 通过 | 52 文件已格式化 |
  | `cd frontend; npm run test:run` | 前端 4 个 spec | 30 passed | 新增 pendingAction 5 条 |
  | `npm run lint`、`npm run typecheck`、`npm run build` | 前端 | 通过 | 仅既有 chunk >500kB 警告 |
  | `npm run format:check` | 前端格式 | 通过 | 3 个后台文件已修复 |
  | `python scripts/check_all.py` | 全量静态闸门 | 通过 | 29/60/32/7 常量一致；分层 0 违规 |
  | `SELECT COUNT(*) FROM tea_guide.users` / `tea_guide_test.users` | 数据库隔离 | 6 / 1 | 开发库未被测试写入；测试库仅种子管理员 |

- 验收结论：通过（本次用户确认的三项范围）
- 基线例外：`api/request.ts`、`main.ts`、`stores/toast.ts` 仍直接使用 Element Plus（AGENTS §3.1 基线，本次未扩大）
- 遗留问题：
  - DEF-02（超大请求体 413）、DEF-04（管理员密码轮换）仍未补用例；T5-04 上线安全项未开始
  - T1-02 仍采用整页登录而非 LoginModal，但笔记/分享/收藏的登录回跳动作已可自动续接
  - `tea_guide_test` 为本次手工创建并导入 `database/init.sql` 结构；CI 环境建库脚本尚未落地
- 回滚方式：回滚上述文件；如需彻底回滚测试库，执行 `DROP DATABASE tea_guide_test`
- 关联 ADR：无（沿用 PLANS.md §5.4 已定稿的测试库约定，非新增架构决策）

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




## 2026-11-10 素材替换候选检索（实拍图）

- 任务卡 / 分级：A（只做检索与文档登记，未下载、未替换、未改代码与数据）
- 需求来源：用户要求"去网上找可以放上去替换的实拍图，先找，后续再替换"
- 主要变更：`docs/product/素材清单.md` 新增 §7「替换候选：实拍图」，登记 36 款茶品主图候选与 20 条内容封面候选（均来自 Wikimedia Commons，含许可与尺寸），并列出缺口清单与三条可选路线
- 检索方式：Commons API 分类遍历 + 关键词检索（namespace 6），按 mime=JPEG/PNG/WebP、宽度 ≥1200、许可 ∈ CC0/PD/CC BY/CC BY-SA 过滤
- 契约 / 数据 / 安全影响：无
- 测试证据：

  | 项目 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | 候选许可核验 | 36 茶品 + 20 内容 | 完成 | 元数据取自 Commons `extmetadata`，未下载原图 |
  | 图片题材核验 | 全部候选 | 未完成 | 仅依据文件名与描述筛选，替换前需逐张开图确认 |
  | `pytest` / `vitest` | 后端 / 前端 | 未运行 | 本次无代码改动 |

- 验收结论：候选清单已落盘；缺口 11 款茶品需自拍或采购商业授权
- 遗留问题：商业图库（视觉中国、千库网、Pexels、Unsplash）因授权或反爬限制未纳入；若用户接受商业授权图片，可再补一轮


## 2026-11-10 素材替换候选补齐（第二轮：网页检索）

- 分级：A（仅检索与文档登记；未进 uploads、未替换、未改代码）
- 需求：用户要求 36 款茶品"必须全都有图"
- 做法：Commons 中文关键词 + 全分类遍历仍缺 12 款，改用 360 图片检索补齐；下载 3 张/款预览图至 `%TEMP%\tea_preview2`（不进仓库），拼图目检后每款选 1 张
- 结果：36 款茶品全部有候选（24 款可商用 §7.1 / 12 款网页预览 §7.3）；内容封面补 3 项（玻璃茶壶、安溪、祁门）
- 关键修正：祁门原网页候选实为临沧昔归茶园，已改用 Commons `Flickr - cyclonebill - Keemun.jpg`
- 风险：§7.3 候选版权未核实，多数带店铺水印或平台角标；**未经授权不得上线**
- 测试证据：本轮无代码改动，`pytest` / `vitest` 未运行


## 2026-11-10 素材替换落地（第三轮：全量替换 36 茶品主图 + 19 内容封面）

- 分级：A（仅替换素材文件与两个图片字段数据，未改业务规则、API 契约、表结构、安全项与代码）
- 需求来源：用户「现在直接替换这些图」「必须全都有」
- 数据变更范围：`teas.main_image_url`（36 条全量）、`content_items.cover_image`（19 条）；其余字段与业务数据未动，表结构未变（无 Alembic 迁移）
- 做法：
  1. Commons 24 张按 `Special:FilePath/<文件名>?width=1600` 下载；§7.3 网页候选 14 张直接从 `%TEMP%\tea_preview2` 取用
  2. 统一处理：EXIF 方向校正 → 透明底压白 → 转 JPEG → 最长边 ≤1600px → 质量 85/75/70/60 逐级压至 ≤400KB
  3. 以 `uuid4().hex.jpg` 落盘 `backend/uploads/2026/11/`（脚本批量处理，未走 `POST /admin/upload`；命名与格式约束与服务端校验一致）
  4. 目检发现武夷肉桂、川红带「惠农网」水印，已裁除底部 9% / 14.5% 后覆盖保存
  5. 回填 DB → 启动后端逐条 `GET` 校验 → 登记 §7.5
- 结果：36/36 茶品主图 + 19/19 内容封面替换完成；36 茶品 + 39 内容条目图片 URL 全部 HTTP 200，无死链
- 测试证据：

  | 项目 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | 静态文件 + HTTP 校验 | 36 茶品 + 39 内容封面 | 通过 | 逐条 `GET http://127.0.0.1:8000/uploads/...`，全部 200 且 `content-type: image/jpeg` |
  | 列表接口抽查 | `GET /api/v1/teas?page=1&page_size=3` | 通过 | `code=0`，返回新 URL |
  | 目检 | 12 张网页来源图（拼图）+ 2 张裁切复核 | 通过 | 题材匹配；2 张水印已消除 |
  | `pytest -q` | 后端全量 | 通过 | 170 passed |
  | `vitest` | 前端 | 未运行 | 本次无前端代码改动 |

- 素材体积：多数 130–330KB，最大 670KB（西双版纳古茶林），均 < 5MB 服务端上限
- 遗留问题（重要）：
  - §7.3 来源的 **14 张（12 茶品 + 2 内容）版权未核实**，仅作 MVP 演示，上线前必须替换或取得书面授权；已在 §7.3 / §7.5 显式标注
  - Commons 中 CC BY / CC BY-SA 图上线需按作者署名，署名依据见 §7.5 表格
  - 庐山云雾（600×450）、川红（400×256）、海马宫茶（400×400）分辨率偏低，卡片展示可接受，详情页大图会糊
  - 旧主图文件仍保留在 `backend/uploads/2026/11/`，未删除（便于回滚），后续可统一清理
- 回滚方式：本次每个字段的旧 URL 见 `%TEMP%\tea_apply_db.py` 运行输出（tea/ct 行），旧文件均未被覆盖，可直接回填恢复


## 2026-11-10 首页背景高清重制（六大茶类 banner）

- 分级：A（只替换 `frontend/public/images/banners/*.webp` 静态素材，未改组件、样式、接口与表结构）
- 需求来源：用户「首页的背景图要高清的，和项目要契合匹配的」
- 变更内容：6 张背景由 1600×900 品类特写（茶叶/干茶/盖碗）换为 ≥3000px 原图的**茶园 / 茶山实拍**，统一 16:9 裁切重编码

  | 茶类 | 新来源（Commons） | 授权 | 作者 | 输出 |
  |---|---|---|---|---|
  | 绿茶 | Tea Garden Hangzhou（杭州茶园云雾石径） | CC BY 4.0 | Takashishin | 2200×1238 / 500KB |
  | 白茶 | 太姥山石景（福鼎太姥山，白茶发源地） | CC BY 3.0 | rheins | 2560×1440 / 307KB |
  | 黄茶 | Xiding Tea Plantation 01（茶山梯田） | CC BY-SA 4.0 | 阿道 | 2200×1238 / 375KB |
  | 乌龙茶 | 深山茶园（武夷岩壁＋茶园梯田） | CC BY 3.0 | rheins | 2200×1238 / 476KB |
  | 红茶 | Camellia sinensis 02（茶园行垄） | CC BY-SA 3.0 | Armin Kübelbeck | 2200×1238 / 371KB |
  | 黑茶 | 景迈大寨与景迈山（普洱景迈山古茶林） | CC BY-SA 4.0 | Zhangmoon618 | 2200×1238 / 368KB |

- 处理：EXIF 校正 → 16:9 中心裁切（oolong 下偏 0.92 保留茶园梯田）→ LANCZOS 缩放 → WebP（质量 56–74，`method=6`）逐级压至 ≤500KB
- 问题与修复：首次按 2560 批量裁切时，`green`/`oolong` 原图 4:3 被误用「宽向裁切」分支导致左右各出现黑边，已改为按实际比例分支裁切并复检（左右 5% 区域灰度 45–133，无零值黑边）
- 测试证据：

  | 项目 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | HTTP 校验 | 6 张 banner | 通过 | `GET http://localhost:5173/images/banners/banner-*.webp` 全部 200、`image/webp`、307–500KB |
  | 目检 | 6 张成图 + 裁切复核 | 通过 | 题材为茶园/茶山，构图完整，无黑边、无水印 |
  | `pytest` / `vitest` | — | 未运行 | 本次无后端/前端代码改动，仅静态资源替换 |

- 溯源：登记已同步至 [素材清单 §5.1](../docs/product/素材清单.md)，旧图未删除（Commons 同名文件可随时重新生成）
- 遗留：CC BY / CC BY-SA 图上线需署名；白茶 banner 为太姥山风景（非茶园），如不认可可换为 `Camellia sinensis 03` 茶树芽叶特写


## 2026-11-10 首页 Hero 背景清晰度与文字可读性调整

- 分级：A（纯样式调整，未改组件结构、数据与接口）
- 需求来源：用户「可以把模糊度再调低一点，对应的字也调下，防止看不清」
- 变更：
  1. `HeroBackground.vue`：遮罩 `.hero-bg__veil` 由 0.60 / 0.48 / 0.36 下调至 **0.34 / 0.26 / 0.16**，背景照片细节更清楚（此前发灰「模糊」感来自这层白色遮罩，非图片本身）
  2. `HomeView.vue`：新增 `.hero__content::before` 柔和留白光晕（radial-gradient，中心 0.92 → 88% 处透明），只在文字背后提亮，画面四角保持通透
  3. 文字补偿：标题光晕加强（26px 白光 + 6px 近距白描边），副标题不透明度 0.82 → 0.92、光晕同步加强，徽标底色 0.78 → 0.9
- 测试证据：

  | 项目 | 结果 | 说明 |
  |---|---|---|
  | Vite 编译 | 通过 | `GET /src/views/HomeView.vue`、`/src/components/HeroBackground.vue` 均 200 |
  | 目检 | 未运行（无浏览器截图工具） | 已按对比度推算：文字中心区叠加 92% 米白光晕，标题/副标题为深茶褐色，6 张背景（含太姥山亮天空）均可读 |

- 回滚：还原两处 CSS（veil 三档透明度、`.hero__content::before` 与 text-shadow / opacity / badge 背景）


## 2026-11-10 首页 Hero 遮罩「割裂」修正

- 分级：A（纯样式）
- 反馈：截图显示遮罩呈有明显边界的浅色块，与背景图割裂
- 定位：两个层叠加造成——eil 用 160deg 渐变（透明度沿对角线变化，出现斜向明暗分界）＋上一轮新增的 .hero__content::before 径向光斑（矩形区域内提亮，边缘可见）
- 改动：
  1. HeroBackground.vue：eil 改为**单一平铺** 
gba(250,248,245,0.12)，无方向、无渐变，肉眼不可辨认为独立图层
  2. HomeView.vue：删除 .hero__content::before 光斑；.hero::after 装饰绿斑 display:none（它原本叠在照片之上）
  3. 文字补偿：标题 / 副标题改为贴字白光（2px + 9~10px + 18~22px 三层），副标题不透明度 0.95，保证在清晰照片上仍可读
- 验证：Vite 编译 200；对比度估算——文字色 #2c2c2c 叠 12% 米白后，标题区平均对比度 > 7:1，最深叶丛处由白色贴字光晕兜底
- 回滚：恢复渐变 veil / 光斑 / 装饰绿斑


## 2026-11-10 首页背景第二版：更契合 + 更高清

- 分级：A（静态素材替换 + 文档登记，未改组件与业务）
- 反馈：「背景图换成更契合项目的，图片一定要清晰，原来的有点模糊」
- 根因：上一版输出 2200×1238 / WebP q56–74，在大屏上被 cover 放大；且 6 张中有 2 张题材偏（太姥山岩石、茶叶特写），不属茶园/茶山语境
- 变更（源图全部 ≥4000px，Commons）：

  | 茶类 | 新/沿用 | 来源 | 授权 | 作者 |
  |---|---|---|---|---|
  | 绿茶 | 沿用 | Tea Garden Hangzhou（杭州茶园云雾石径） | CC BY 4.0 | Takashishin |
  | 白茶 | **换新** | White tea hand-picking（白茶手工采摘） | CC BY-SA 4.0 | KZZZ01 |
  | 黄茶 | 沿用 | Xiding Tea Plantation 01（茶山梯田） | CC BY-SA 4.0 | 阿道 |
  | 乌龙茶 | 沿用 | 深山茶园（武夷岩壁＋茶园梯田） | CC BY 3.0 | rheins |
  | 红茶 | **换新** | 在武夷山虎啸岩景观台远望天游峰（武夷云雾） | CC BY-SA 4.0 | Lhy123456 |
  | 黑茶 | 沿用 | 景迈大寨与景迈山（普洱景迈山） | CC BY-SA 4.0 | Zhangmoon618 |

- 输出：统一 **2560×1440 WebP**，质量 79–88，单张 419–885 KB；16:9 裁切；统一色调整形（饱和度 ×0.86、对比 ×1.05、R×1.02 / B×0.97）使六张色调一致偏暖低饱和
- 裁切修正：white 左裁 16% 去掉边缘半截采茶人；oolong 下偏 0.88 保住茶园梯田
- 测试证据：

  | 项目 | 结果 | 说明 |
  |---|---|---|
  | HTTP | 通过 | 6 张 GET localhost:5173/images/banners/banner-*.webp 均 200；首页 200 |
  | 目检 | 通过 | 拼图核对：均为茶园/茶山实拍，无水印、无半截人物、无黑边；色调统一 |
  | 体积 | 记录 | 6 张合计 4.4 MB（首屏加载当前首张约 0.9 MB）；如需可后续改 1920 宽 + srcset |
  | pytest / itest | 未运行 | 无后端/前端逻辑改动 |

- 遗留：hero 轮播一次加载 6 张，生产建议加 srcset 或仅预载当前+下一张（属组件改造，需另开任务）


## 2026-11-10 将 backend/uploads 纳入版本管理

- 分级：A（仓库配置与静态素材入库，无代码行为变更）
- 背景：交付给他人的仓库缺少 ackend/uploads/ 时，	eas.main_image_url / content_items.cover_image / 	ea_media.image_url 指向的图片全部缺失，页面虽回退到内置 SVG 占位、不产生死链，但图鉴视觉为空
- 同时修正：.gitignore:40 原为 uploads/          # FastAPI 图片上传目录，gitignore 不支持行尾注释，该行从未生效（ackend/uploads/ 一直是未跟踪状态）；本次删除该规则并注明 uploads 纳入版本管理
- 入库内容：159 个文件 / 38.4 MB（jpg 98、webp 59、png 2），即 36 款茶品主图、图片集与 39 条内容封面
- 测试证据：

  | 项目 | 结果 | 说明 |
  |---|---|---|
  | 暂存核对 | 通过 | git diff --cached --stat = 160 files（159 图 + .gitignore），无 .env、日志、临时文件 |
  | 单文件体积 | 通过 | 最大单文件 < 1 MB，远低于 Gitee 100 MB 限制 |
  | 静态检查 | 通过 | python scripts/check_all.py |

- 后续约定：此后通过后台新增/替换的上传素材会以未跟踪文件出现，需随功能提交一并 git add backend/uploads
- 遗留：仓库体积将持续增长，若素材规模上量，建议迁移 Git LFS（需评估 Gitee LFS 配额）


## 2026-11-11 扩充「茶文化」五大内容板块

- 分级：B（仅内容数据与静态配图，无表结构、API 契约与代码逻辑变更）
- 背景：顶栏「茶文化」下五个板块每类仅 7–8 条，内容单薄；本次补齐到每类约 30 条，并保证每条有配图
- 变更（content_items 数据）：

  | 板块 | 原有 | 新增 | 现计 |
  |---|---|---|---|
  | 茶具茶器 teaware | 8 | 24 | 32 |
  | 茶叶产地 origin | 8 | 25 | 33 |
  | 茶叶文化 culture | 8 | 24 | 32 |
  | 茶叶品牌 brand | 7 | 23 | 30 |
  | 茶叶知识 knowledge | 8 | 25 | 33 |
  | 合计 | 39 | 121 | 160 |

- 新增脚本（scripts/content_expand/）：`data_*.py`（五类条目文案与 meta）、`fetch_and_import.py`（百度图片抓取 + 筛选 + 入库）、`make_montage.py`（配图拼图目检）
- 配图规则：按条目标题关键词检索；剔除价格/批发/礼盒/海报/素材等电商与资讯图；品牌板块只用品类示意与产地风貌，不使用商标、包装与店面实拍
- 目检与修正：五个板块各出拼图逐条核对，替换错图 40 余张（如湄潭茶园换掉带文字海报、横州换茉莉花田、正山堂换桐木关茶园、大益换熟茶汤、茶具清洁换茶垢清洁图）
- 测试证据：

  | 项目 | 结果 | 说明 |
  |---|---|---|
  | 封面完整性 | 通过 | 160/160 条 cover_image 文件均存在（脚本校验） |
  | 接口 | 通过 | GET /api/v1/contents?type=teaware 返回 HTTP 200 / code 0，items 正常 |
  | 目检 | 通过 | 五个板块拼图核对，均已匹配条目主题；闻香杯沿用近似杯型图 |
  | pytest / vitest | 未运行 | 未改动后端与前端代码，仅数据与静态图 |

- 遗留：①「万里茶道」配图为路线示意图，非实景；②部分产地条目为产区茶园风貌，未精确到村寨；③「看懂茶叶标签与等级」配图为茶叶罐示意，未展示标签细节
- 素材说明：图片来自百度图片检索，仅供个人学习使用，未商用；如需对外发布需逐张核验授权

## 2026-11-11 冲泡参考时间单位统一为「秒」

- 分级：A（仅前台展示文案，无 API 契约、数据结构与业务规则变更）
- 背景：用户反馈详情页「浸泡时间」显示疑似「60年代」。核查结果：数据库 `teas.brew_time` 为 DECIMAL(秒)，井冈翠绿（id=97）实际值 60.0；接口返回 `60.0`，页面原渲染 `${brew_time}s`，全仓库与构建产物均无「年代」文案，未能复现。为避免 `60s` 被浏览器翻译/误读为「60年代」，并按 PRD「浸泡时间 单位：秒」与原型「60秒」统一中文单位
- 变更：
  - `frontend/src/views/TeaDetailView.vue`：浸泡时间 `s` → `秒`
  - `frontend/src/views/HomeView.vue`：随机发现卡 `s` → `秒`
- 数据排查：211 款茶冲泡参数均在合理区间（水温 80–100℃、投茶量 3–8g、浸泡 8–180s，无空值/越界）；全库无把时间写成「年代」的数据；「年代」仅出现在 3 条史料文案（川红 20 世纪 50 年代创制、日照南茶北引始于上世纪六十年代、紫砂壶源于宋代），表述正确
- 测试证据：

  | 项目 | 结果 | 说明 |
  |---|---|---|
  | npm run lint | 通过 | eslint 无告警 |
  | npm run typecheck | 通过 | vue-tsc 无错误 |
  | npm run test:run | 通过 | 6 文件 / 50 用例全通过 |
  | 浏览器实测 | 通过 | `/teas/97` 冲泡参考显示 85℃ / 3g / 60秒 |
  | 数据库核查 | 通过 | brew_time=60.0；全量参数范围与异常文本扫描无异常 |

- 遗留：PRD/PAGE_SPECS 线框示意图中仍有「3min」示例文案，属文档示意非页面实际显示，未改动

## 2026-11-11 茶文化五大板块正文扩写（160 条）

- 分级：B（内容数据批量更新 + 前台渲染调整；无 API 契约、表结构、权限变更）
- 需求：茶文化详情正文过于简略（原 90–280 字）。经确认：覆盖全部 160 条，每篇 300–500 字、3–5 段、2–3 个小标题
- 变更：
  - 新增 `scripts/content_expand/detail_bodies.py`：160 条详版正文，按「板块编码 + 标题」索引；`## 小标题` 单独成块，块之间空行分隔
  - 新增 `scripts/content_expand/apply_detail_bodies.py`：按 (板块, 标题) 回写 `content_items.body`，支持 `--dry-run`
  - `scripts/content_expand/fetch_and_import.py`：新增条目优先取 `detail_bodies` 正文，避免后续导入退回简版
  - `frontend/src/views/ContentDetailView.vue`：正文按空行切块，`## ` 渲染为 h2 小标题，其余为段落；补 `.detail__subheading` 样式
- 内容口径：保留原条目事实，仅补充常识性背景；不编造精确年代、价格、排名、奖项；品牌条目保持中性客观
- 测试证据：

  | 项目 | 结果 | 说明 |
  |---|---|---|
  | 结构与字数校验 | 通过 | 160/160 条，长度 380–468 字符；每条 2–3 小标题、3–5 段（脚本断言） |
  | 入库 | 通过 | dry-run 匹配 160 / 未匹配 0；实际更新 160 条 |
  | 数据库复核 | 通过 | 五板块平均 391–403 字符，无空值 |
  | npm run lint / typecheck | 通过 | eslint、vue-tsc 无错误 |
  | npm run test:run | 通过 | 6 文件 / 50 用例 |
  | 浏览器实测 | 通过 | `/contents/origin/3` 显示 3 个小标题与扩写正文，无 `##` 残留 |
  | python scripts/check_all.py | 通过 | 链接 / 常量 / 分层 / 前台 UI / 记录 / 密钥 |

- 遗留：正文格式为内部约定（`## ` 小标题 + 空行分段），后台手工编辑正文时需沿用；`detail_bodies.py` 为详版正文来源，`data_*.py` 仍保留首版简文用于初始导入

## 2026-11-11 首页 hero 背景图更换为高清版

- 分级：A（仅替换静态资源，组件与交互逻辑未改）
- 背景：用户反馈首页背景图不清晰。排查确认原 6 张图虽为 2560×1440，但源图细节偏软，其中 `banner-red.webp` 边缘清晰度最低（edge_std 22.4，其余 56–83）
- 变更：替换 `frontend/public/images/banners/` 下 6 张 `banner-{green,white,yellow,oolong,red,dark}.webp`，统一为 2560×1440、WebP quality 86（545–982KB），分别对应绿茶、白茶、黄茶、乌龙茶、红茶、黑茶主题；`HeroBackground.vue` 的 `webp → jpg → svg` 加载顺序与轮播逻辑不变
- 测试证据：

  | 项目 | 结果 | 说明 |
  |---|---|---|
  | 浏览器实测 | 通过 | 首页 6 张背景均加载 `.webp`，`naturalWidth=2560 / naturalHeight=1440`；hero 显示照片背景而非渐变/占位 |
  | 图片规格 | 通过 | 全部 2560×1440；`banner-red` 清晰度指标由 22.4 提升至 71.8 |
  | python scripts/check_all.py | 通过 | 273 条相对链接、常量、五层、前台 UI、记录、密钥全部通过 |

- 遗留：新图为 AI 生成的实景风格示意图，非真实产地实拍；后续若要换成实拍图，保持同名 `.webp`（2560×1440）覆盖即可，无需改代码

## 2026-11-11 首页背景图二次更换（去雾提锐）

- 分级：A（仅替换静态资源）
- 背景：用户反馈上一版背景仍偏模糊、发灰。原因是原图雾气重、对比度低（白茶图边缘清晰度仅 31.5）
- 变更：重新生成并替换 6 张 `frontend/public/images/banners/banner-*.webp`，统一 2560×1440 WebP quality 86（415–1289KB）；构图改为晴日高对比、全画面锐利、无雾无景深虚化；白茶版改为银针茶园全景
- 测试证据：

  | 项目 | 结果 | 说明 |
  |---|---|---|
  | 图片规格 | 通过 | 6 张均 2560×1440；边缘清晰度 68.0–84.3（上一版 31.5–72.5） |
  | 浏览器实测 | 通过 | 首页 6 张均加载 `.webp`，`naturalWidth=2560`，画面清晰无灰雾 |
  | 后台轮播 | 通过 | 组件与 7 秒轮播逻辑未改，当前 active 正常切换 |

- 遗留：仍为 AI 生成示意图，非真实产地实拍；需实拍时同名覆盖即可

## 2026-11-11 首页白茶 / 乌龙背景图按主题重制

- 分级：A（仅替换 2 张静态资源）
- 背景：用户指出白茶与乌龙两张背景与站点「清新水墨」主题不够贴合。原白茶图为白色花穗状茶园、乌龙图为高饱和蓝天峡谷，色调偏艳
- 变更：
  - `banner-white.webp`：银针白茶近景茶园，前景白毫茶芽清晰，远景薄雾，暖绿与米白基调，上方留出浅色负空间
  - `banner-oolong.webp`：武夷岩茶丹霞梯田，暖灰低饱和，茶垄清晰、远山轻雾，上方天空留白
  - 均 2560×1440、WebP quality 90，并做轻度 USM 锐化（白茶 310KB / 乌龙 724KB）；其余 4 张与轮播逻辑未动
- 测试证据：

  | 项目 | 结果 | 说明 |
  |---|---|---|
  | 图片规格 | 通过 | 两张均 2560×1440，白茶 310KB、乌龙 724KB |
  | 浏览器实测 | 通过 | 两张 `naturalWidth=2560 / naturalHeight=1440`，加载成功；当前 active 为 `banner-white.webp`，画面清晰 |
  | 主题一致性 | 通过 | 低饱和暖调 + 上方留白，贴合「清新水墨」且不压标题文字 |

- 遗留：AI 生成示意图，非实拍；如需实拍同名覆盖即可
