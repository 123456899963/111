# AGENTS.md —— AI 编程助手全局工作指南

> 本文件是 AI 助手进入本项目时必须遵守的工作准则。具体规范以 `docs/` 下的已确认文档为准，本文件只做摘要与索引。
> 项目阶段：**MVP 开发期**。第二阶段（PRD S1–S17）与暂不实现项（X1–X13）一律不开发。

---

## 1. 项目背景与核心目标

**茶·图鉴** —— 面向茶爱好者的六大茶类结构化知识库平台。

- 核心闭环：**发现茶 → 查看详情 → 收藏/写笔记/分享**
- 三角色：游客（只读）/ 注册用户（收藏、笔记、分享）/ 管理员（茶品与小贴士维护）
- MVP 边界：单一默认收藏清单"我的收藏"；3 维筛选（茶类/产地/季节，AND 逻辑）；链接分享；不做用户贡献与审核
- 权威需求文档：[PRD.md](docs/product/PRD.md) v1.1（功能分级以此为准）

## 2. 技术栈（已定稿，不更换）

| 层 | 技术 |
|---|---|
| 前端 | Vue 3（`<script setup>`）+ TypeScript（初期 `strict: false`）+ Vite + Vue Router 4 + Pinia + Axios |
| UI | **Element Plus 仅用于管理员后台**；前台自研组件（迁移原型 CSS，`:root` 变量 + BEM） |
| 后端 | Python 3.11+ / FastAPI / SQLAlchemy 2.0（**同步模式**）/ Alembic / PyMySQL / bcrypt / itsdangerous |
| 数据库 | MySQL **5.7.19** · InnoDB · `utf8mb4` / `utf8mb4_unicode_ci` |
| 测试 | 后端 pytest + httpx；前端 Vitest（纯函数）；可选 Playwright 冒烟 |
| 部署 | 开发期 Vite proxy `/api` → 8000 同源；生产 Nginx 反代 + Uvicorn |

详见 [TECH_STACK.md](docs/architecture/TECH_STACK.md) v1.0（9 项决策全部已确认）。

## 3. 项目目录结构

```
d:\项目二\
├── docs/                 # 全部已确认文档（见 §9）
├── frontend/             # Vue 3 SPA（含 /admin 路由段，后台组件动态 import）
│   └── src/{api, assets, components, router, stores, styles, types, views}
├── backend/              # FastAPI
│   └── app/
│       ├── routers/  services/  repositories/  models/  schemas/   # 五层（见 §5）
│       ├── core/     # config / database / security / response / auth_deps
│       └── alembic/  # 数据库迁移
├── database/init.sql     # 建库 + 建表 + 索引 + 种子数据
├── 原型/                 # 静态原型（前台视觉还原基准，勿改）
└── uploads/              # 图片本地存储（backend/uploads/）
```

注意：`backend/app/repositories/` 目录按计划需创建（[ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) §3），目前脚手架尚未补齐。

## 4. 前端开发规范

- 目录职责：`api/`（Axios 实例与请求封装，`baseURL=/api/v1`，`withCredentials: true`）、`types/`（与后端 Pydantic Schema 一一对应）、`stores/`（user/tea/toast）、`views/`（页面）、`components/`（通用组件）
- 前台禁用 Element Plus，视觉以 `原型/` 为还原基准；后台组件放 `views/admin/`，动态 `import()` 按需加载
- 全局样式用 `:root` CSS 自定义属性 + BEM 类名，色值禁止硬编码（见 §8）
- 前端路由守卫、按钮禁用只做体验，**不构成安全边界**
- 代码规范：ESLint + Prettier，提交前格式化

详见 [TECH_STACK.md](docs/architecture/TECH_STACK.md) §4.2/§4.3/§4.4、[ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) §1。

## 5. 后端开发规范（五层架构，红线禁止跨层）

| 层 | 职责 | 红线 |
|---|---|---|
| `routers/` | 路由声明、参数接收、Depends 注入 | 禁止写业务逻辑、禁止直接查库、禁止返回 ORM 对象 |
| `services/` | 业务规则、权限判断、事务边界 | 禁止拼 SQL、禁止返回 ORM 对象 |
| `repositories/` | 封装 SQLAlchemy 查询 | 禁止业务判断、禁止抛业务异常 |
| `models/` | ORM 实体，与表一一对应 | 只有 Repository 能碰；禁止业务方法 |
| `schemas/` | Pydantic DTO，与前端 `types/` 对应 | 禁止 import Model |

- `core/` 为横向支撑（config / database / security / response / auth_deps）
- 统一响应体 `{ code, message, data }`，业务异常经 `core/response.py` 映射
- 代码规范：Ruff（check + format）
- 安全控制共 32 项（S-01–S-32），变更必须同步 [SECURITY.md](docs/architecture/SECURITY.md) 与测试用例

详见 [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) §3、[SECURITY.md](docs/architecture/SECURITY.md)。

## 6. 数据库规范

- 共 **7 张表**：`users` / `teas` / `tea_tips` / `collection_lists` / `favorite_items` / `share_tokens` / `operation_logs`
- **一切结构变更走 Alembic 迁移，禁止手工 ALTER TABLE**
- MySQL 5.7 无有效 CHECK：枚举用 ENUM，数值/长度范围由 Pydantic + Service 层校验
- 时间统一 `DATETIME` + UTC，API 输出 ISO8601 带 `Z`，前端按 Asia/Shanghai 渲染
- 软失效：茶下架（`is_active=0`）、分享撤销（`is_active=0` + `revoked_at`）均**不物理删除**
- `share_tokens.token` 用 `utf8mb4_bin`（大小写敏感）；`teas.favorite_count` 为冗余计数，同事务维护
- 收藏防重复靠 `UNIQUE(user_id, tea_id)`；单清单靠 `UNIQUE(collection_lists.user_id)`

详见 [DATA_MODEL.md](docs/architecture/DATA_MODEL.md) v1.0、[database/init.sql](database/init.sql)。

## 7. API 接口规范

- 统一前缀 `/api/v1`；共 **29 个业务端点**（auth 5 / teas 6 / favorites 3 / lists 3 / shares 4 / admin 8）
- 统一响应 `{ code, message, data }`；成功判定只看 `code === 0`；成功 HTTP 状态统一 **200**；业务失败 `HTTP status = code // 100`；FastAPI 422 必须重映射为 400/`40000`
- 认证：**HttpOnly Cookie `tea_session`**（itsdangerous 签名，30 天，`SameSite=Lax`），不使用 Token / Authorization 头；角色每次从 `users.role` 实时读库
- JSON 字段 `snake_case`，与数据库列名一致；空值用 `null`
- 分页仅茶品列表：默认 `page_size=12`，上限 50，越界夹取；排序稳定次级键 `id DESC`
- 上传：`POST /admin/upload`，仅 JPEG/PNG/WebP ≤ 5MB，校验魔数，UUID 文件名

**字段命名与端点行为的唯一依据**：[API_CONTRACT.md](docs/api/API_CONTRACT.md) v1.0 + [openapi.yaml](docs/api/openapi.yaml)。代码与契约冲突时以契约为准。

## 8. UI 设计规范

- 设计方向：**「清新水墨」新中式极简 × 东方留白**
- 主色茶褐 `#8B7355`；六大茶类各有专属标签色；页面背景暖米白 `#FAF8F5`
- 所有色值/字号/间距以 CSS 变量提供，组件内引用变量，**禁止硬编码 HEX**
- 茶类标签选中态规则、白茶特例等细节见规范原文
- 页面结构、布局与交互以 [PAGE_SPECS.md](docs/design/PAGE_SPECS.md) 与 `原型/` 为准

详见 [DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md)、[PAGE_SPECS.md](docs/design/PAGE_SPECS.md)。

## 9. 测试要求

- 测试方案：[TEST_PLAN.md](docs/testing/TEST_PLAN.md) v1.0 —— **60 条用例**（高 32 / 中 25 / 低 3），覆盖 29 端点 + 7 表约束 + 32 项安全控制
- 后端：pytest + httpx（FastAPI TestClient），断言同时检查 HTTP 状态码、业务 `code`、数据库最终状态
- 前端：Vitest，仅覆盖纯函数（筛选/格式化/URL 组装）
- 高优先级用例任一失败 = 阻断发布；错误响应不得泄露堆栈/SQL/表名
- 完成任务后必须执行与改动相关的测试，并如实报告结果

## 10. 文档维护要求

| 文档 | 地位 |
|---|---|
| [PRD.md](docs/product/PRD.md) | 功能分级与业务规则的唯一依据 |
| [TECH_STACK.md](docs/architecture/TECH_STACK.md) | 技术选型定稿 |
| [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | 架构与五层职责定稿 |
| [MODULE_DESIGN.md](docs/architecture/MODULE_DESIGN.md) | 模块与端点映射 |
| [DATA_MODEL.md](docs/architecture/DATA_MODEL.md) + [init.sql](database/init.sql) | 数据库定稿 |
| [API_CONTRACT.md](docs/api/API_CONTRACT.md) + [openapi.yaml](docs/api/openapi.yaml) | 前后端联调唯一依据 |
| [SECURITY.md](docs/architecture/SECURITY.md) | 安全控制唯一依据（S-01–S-32） |
| [DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md) / [PAGE_SPECS.md](docs/design/PAGE_SPECS.md) | 视觉与页面规范 |
| [TEST_PLAN.md](docs/testing/TEST_PLAN.md) | 测试用例唯一依据 |

- 修改代码导致行为变化时，必须同步更新对应文档；文档间出现不一致时停下来核对，以各文档"权威版本"章节为准
- 重要设计决策必须在对应文档的"变更记录/修订记录"中留痕

## 11. AI 行为要求（红线）

1. **先理解，再动手**：修改任何代码前，先阅读相关模块的代码与对应文档章节，理解五层归属后再改。
2. **不得擅自修改已确认的业务规则**：PRD 功能分级、权限矩阵、分享/收藏/上下架语义、字段约束等业务决策已冻结。发现疑似业务规则问题时，**先提出并等待用户确认**，不得直接改。
3. **重大修改先出方案**：涉及架构分层、数据库结构、安全控制（S-01–S-32）、权限判断的改动，先给出方案说明，经确认后方可实施。
4. **改完必测**：完成任务后执行与改动相关的测试（后端 pytest / 前端 Vitest），测试未通过不得声称完成。
5. **不得虚报测试结果**：未实际运行的测试不得写成"已通过"；失败、跳过、未覆盖要如实说明。
6. **决策留痕**：重要设计决策（含用户确认的取舍）记录到对应文档的变更记录中。
7. **范围自律**：第二阶段（S1–S17）与暂不实现项（X1–X13）不主动开发；只做被要求的改动，不顺手"优化"无关代码。
8. **不泄露敏感信息**：日志、响应、提交信息中不得出现密码明文、Cookie 值、密钥；`.env` 不进 Git。

## 12. 当前已知待办（进入开发前须知）

- [ ] `backend/app/repositories/` 目录待创建，Service 中直连查询的代码需下沉
- [ ] `core/auth_deps.py`（`get_current_user` / `get_admin_user`）待创建 —— 安全 P0
- [ ] `main.py` 全局异常处理器待注册 —— 安全 P0
- [ ] `SECRET_KEY` 默认值、`DEBUG=True`、种子管理员密码 `admin123` 上线前必须轮换 —— 安全 P0
- [ ] 代码层 bcrypt 实际为默认 cost=12，与文档 cost=10 不一致，实现阶段需统一（SECURITY S-01）
