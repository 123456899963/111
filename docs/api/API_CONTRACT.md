# 茶·图鉴 —— 前后端 API 接口契约（API CONTRACT）

| 项 | 值 |
|---|---|
| 文档版本 | **v1.0** |
| 创建日期 | 2026-11-06 |
| 契约基线 | [PRD.md](../product/PRD.md) v1.1 · [DATA_MODEL.md](../architecture/DATA_MODEL.md) v1.0 · [database/init.sql](../../database/init.sql) · [MODULE_DESIGN.md](../architecture/MODULE_DESIGN.md) |
| 本契约地位 | 前后端联调与字段命名的唯一依据。脚手架中与本契约不一致的字段，以本契约（数据库列名）为准 |
| 覆盖范围 | MVP 全部业务接口（注册登录、茶品、收藏、清单与笔记、分享、管理员维护） |
| 不覆盖 | 第二阶段能力；后端实现代码不在本次交付内 |
| 配套机器可读文件 | [openapi.yaml](openapi.yaml) |

---

## 1. 全局约定

### 1.1 访问前缀与路由

- 所有业务接口统一位于 **`/api/v1`**：`/api` 是统一访问前缀，`v1` 是为后续版本预留的版本段。
- 前端 Axios `baseURL` 固定为 `/api/v1`；开发期由 Vite 代理到 `http://127.0.0.1:8000`，生产期由 Nginx 同域反向代理，前后端同源。
- 业务路由分组：

| 前缀 | 业务模块 |
|---|---|
| `/api/v1/auth` | 注册、登录、退出、当前用户 |
| `/api/v1/teas` | 茶品列表、筛选、排序、分页、详情、首页数据 |
| `/api/v1/favorites` | 收藏与取消收藏 |
| `/api/v1/lists` | 我的清单、标题、品鉴笔记 |
| `/api/v1/shares` | 分享链接生成、撤销、游客查看、一键收藏 |
| `/api/v1/admin` | 管理员茶品维护、上下架、小贴士、统计、图片上传 |

- 路径中的静态段必须先于动态段匹配（例如 `/teas/categories` 必须先于 `/teas/{tea_id}` 注册）。
- `/api/v1/health` 是部署探针，不返回统一业务响应体，**不属于本契约**。

### 1.2 请求与响应编码

| 项 | 约定 |
|---|---|
| 字符集 | UTF-8（无 BOM） |
| 普通请求/响应 | `Content-Type: application/json; charset=utf-8` |
| 文件上传 | `Content-Type: multipart/form-data` |
| JSON 字段命名 | `snake_case`，与数据库列名保持一致；派生字段在文档中注明 |
| 空值 | JSON `null`；不使用空字符串代替“未填写”（文本接口中空白字符串按 `null` 归一化） |
| 时间 | 见 §1.7 |
| HTTP 方法语义 | GET 查询、POST 创建/动作、PUT 全量更新、PATCH 局部状态切换、DELETE 取消/移除 |
| 成功状态码 | MVP 统一使用 **HTTP 200**；不使用 201/204，避免前端拦截器分裂 |
| 错误状态码 | 由业务码推导，见 §1.3、§1.4 |

### 1.3 统一响应结构

所有业务接口（含错误）均返回以下 JSON 结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | integer | 业务状态码；`0` 表示成功，非 `0` 表示失败 |
| `message` | string | 可直接展示给用户的中文提示；错误时不包含堆栈、SQL、内部类名 |
| `data` | object / array / null | 成功时为业务数据；失败时固定为 `null` |

规则：

1. **成功判定只以 `code === 0` 为准**；HTTP 200 不代表业务成功。
2. 业务失败同时返回对应的 HTTP 状态码（`HTTP status = code // 100`），响应体仍为统一结构：

```json
{
  "code": 40401,
  "message": "该茶品暂不可用",
  "data": null
}
```

3. FastAPI 默认的 `422 Unprocessable Entity` 必须重映射为 **HTTP 400 + `code=40000`**，不得向前端泄露 Pydantic 原始错误结构。
4. 所有接口均可能返回 `code=50000`（HTTP 500）；下文各接口的错误表只列业务特定错误，不再重复 `50000`。
5. `data` 可以是对象、数组或 `null`；数组直接作为 `data`，不再额外包一层 `list` 字段。

### 1.4 业务状态码

| code | HTTP | 含义 | 典型触发 |
|---|---|---|---|
| `0` | 200 | 成功 | — |
| `40000` | 400 | 参数校验失败 | 枚举非法、必填缺失、长度/范围越界、JSON 结构错误 |
| `40100` | 401 | 未登录或登录已过期 | 无 Cookie、签名无效、超过 30 天 |
| `40110` | 401 | 用户名或密码错误 | 登录失败；不区分用户名不存在或密码错误 |
| `40300` | 403 | 无权限执行此操作 | 非管理员访问后台；非清单所有者撤销分享；所有者一键收藏自己的清单 |
| `40400` | 404 | 茶品不存在 | `tea_id` 无对应行 |
| `40401` | 404 | 该茶品暂不可用 | 茶品 `is_active=0`，公开详情/收藏被拒 |
| `40410` | 404 | 该分享已被撤销或不存在 | 分享 token 不存在 |
| `40430` | 404 | 收藏条目不存在 | 对未收藏的茶写品鉴笔记 |
| `40900` | 409 | 该分享已被撤销 | 对已撤销 token 再次撤销或一键收藏 |
| `40910` | 409 | 用户名已存在 | 注册重名（大小写不敏感） |
| `41300` | 413 | 上传文件超过大小限制 | 文件大于 5 MB |
| `41500` | 415 | 不支持的文件类型 | 非 JPEG/PNG/WebP |
| `50000` | 500 | 服务器内部错误 | 未捕获异常；详情仅记录服务端日志 |

### 1.5 认证与会话（HttpOnly Cookie）

**本系统不使用 Token，不使用 `Authorization` 请求头。**

| 项 | 约定 |
|---|---|
| 凭证载体 | HttpOnly Cookie，名称固定为 **`tea_session`** |
| Cookie 值 | itsdangerous `URLSafeTimedSerializer` 签名的载荷 `{"uid": <users.id>}`，不含密码、角色、用户名 |
| 有效期 | 30 天（`Max-Age=2592000`，对应 `SESSION_EXPIRE_DAYS=30`） |
| 属性 | `HttpOnly=true`；`SameSite=Lax`；`Path=/`；生产环境 HTTPS 下 `Secure=true`，本地 HTTP 开发可关闭 |
| 域 | 不设置 `Domain`，使用同源主机级 Cookie |
| 服务端会话表 | MVP **不建** `sessions` 表；每次请求验签后按 `uid` 查 `users` |
| 传递方式 | 浏览器/前端自动携带；Axios 必须 `withCredentials: true`（已配置） |
| 登录 | `POST /auth/login` 校验成功后 `Set-Cookie: tea_session=...` |
| 注册 | `POST /auth/register` 成功后自动登录并 `Set-Cookie`（PRD FR-4.1） |
| 退出 | `POST /auth/logout` 删除 Cookie，服务端无状态可清理 |
| 失效 | 签名无效、过期、用户不存在 → `40100`；前端提示“登录已过期”并弹登录面板 |
| 角色 | `role` 每次从 `users.role` 读取；`admin` 才可访问 `/admin/*` |
| 跨域 | 前后端同源部署；开发期 CORS 允许配置内源并 `allow_credentials=true` |
| CSRF | MVP 依赖 `SameSite=Lax` + 同源部署；不额外下发 CSRF Token。若未来改为跨站 Cookie，必须补充 CSRF 防护 |
| 请求头 | 若客户端传入 `Authorization`，服务端忽略；不得以任何 Token 方案替代 Cookie |

`Set-Cookie` 示例（生产）：

```http
Set-Cookie: tea_session=<signed-value>; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure
```

### 1.6 分页

**分页仅用于茶品列表（公开列表、管理员列表）。**

| 参数 | 类型 | 默认 | 范围 | 说明 |
|---|---|---|---|---|
| `page` | integer | `1` | ≥ 1 | 页码，从 1 开始 |
| `page_size` | integer | **12** | 1–50 | 每页条数，默认 12 与 PRD FR-1.6 一致 |

- 越界值由服务端**夹取**而非报错：`page < 1 → 1`；`page_size < 1 → 1`；`page_size > 50 → 50`；响应中的 `page`、`page_size` 返回**实际生效值**。
- 分页响应统一放在 `data` 中：

```json
{
  "items": [],
  "total": 42,
  "page": 1,
  "page_size": 12
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array | 当前页数据；无结果时为 `[]` |
| `total` | integer | 满足筛选条件的总条数（不受分页影响） |
| `page` | integer | 实际生效页码 |
| `page_size` | integer | 实际生效每页条数 |

- `total_pages` 不单独返回，由前端计算：`Math.ceil(total / page_size)`；`total=0` 时为 0。
- 页码超出末页时返回 `items: []`，`total` 不变，HTTP 200、`code=0`。
- 所有分页排序必须有稳定次级键：`id DESC`，避免同秒数据跨页重复/遗漏。

### 1.7 日期时间格式

| 项 | 约定 |
|---|---|
| 传输格式 | **ISO 8601 UTC，秒级，带 `Z`**：`YYYY-MM-DDTHH:mm:ssZ`，例如 `"2026-11-06T12:00:00Z"` |
| 时区 | 数据库统一存 UTC（`DATETIME` + MySQL `time_zone='+00:00'`），API 不做本地时区换算 |
| 前端展示 | 前端按 `Asia/Shanghai` 渲染，展示逻辑不改变 API 值 |
| 精度 | 秒级（`DATETIME(0)`）；同秒排序使用 `id` 次级排序 |
| 输入 | MVP 没有客户端传入日期时间的接口；所有时间由服务端生成 |
| 字段 | `created_at`、`updated_at`、`revoked_at`、`favorited_at` 均遵循本格式 |

### 1.8 枚举与字典

| 字典 | API 值（数据库值） | 展示名 |
|---|---|---|
| `category` | `green` / `white` / `yellow` / `red` / `oolong` / `dark` | 绿茶 / 白茶 / 黄茶 / 红茶 / 乌龙茶 / 黑茶 |
| `season` | `明前` / `雨前` / `春茶` / `夏茶` / `秋茶` / `冬茶` | 同值 |
| `fermentation` | `不发酵` / `微发酵` / `半发酵` / `全发酵` / `后发酵` | 同值 |
| `role` | `user` / `admin` | 注册用户 / 管理员 |
| `sort` | `newest`（默认）/ `favorite` | 最新上架 / 收藏最多 |
| `share token` | 8 位 URL-safe 字符（`A-Z a-z 0-9 - _`），**大小写敏感** | 如 `k7X9m2` |

- `price_range` 在 PRD 中仅说明“5 档”，文案与边界未定稿，因此 API 保持 **字符串（≤32 字符）**，不在契约中硬编码档位；应用层校验，不建 ENUM。
- 枚举值非法一律 `40000`，不做静默丢弃。

### 1.9 文件上传与图片访问

| 项 | 约定 |
|---|---|
| 接口 | `POST /api/v1/admin/upload`，仅管理员 |
| 请求格式 | `multipart/form-data`，字段名固定为 **`file`** |
| 大小上限 | **5 MB**（5 × 1024 × 1024 字节），由 `MAX_UPLOAD_SIZE_MB` 控制 |
| 允许类型 | `image/jpeg`、`image/png`、`image/webp`；必须校验文件魔数（`python-magic`），不能只信扩展名/客户端 MIME |
| 禁止类型 | SVG、GIF、可执行文件及其他非图片类型 |
| 存储路径 | `uploads/{YYYY}/{MM}/{uuid}.{ext}`；扩展名由服务端按校验后的 MIME 决定，不采用原文件名 |
| 返回 | `data.url` 为**同源相对路径**：`/uploads/2026/11/<uuid>.jpg` |
| 访问方式 | 浏览器直接 `GET /uploads/{YYYY}/{MM}/{uuid}.{ext}`；无需登录。开发期 Vite 代理 `/uploads`，生产期 Nginx 反代/静态托管 |
| 写入字段 | 将返回的 `url` 写入茶品的 `main_image_url`；`main_image_url` 也允许历史外链 `https://...`（种子数据即外链） |
| 删除 | MVP **不提供**图片删除接口；茶品下架不删除图片 |
| 安全 | 上传文件不得按原文件名落盘；禁止路径穿越；返回头建议 `X-Content-Type-Options: nosniff` |

### 1.10 收藏计数 `teas.favorite_count` 的一致性

`favorite_count` 是**冗余统计列**，不是实时 `COUNT(favorite_items)`。接口返回的是该列的缓存值，语义如下：

1. **读取**：列表卡片、详情、热门推荐、收藏/取消响应、状态查询中的 `favorite_count` 均直接读 `teas.favorite_count`。
2. **写入**：收藏与取消必须在**同一事务**内完成条目变更与计数变更：
   - 新增收藏：`INSERT favorite_items` 成功后 `favorite_count = favorite_count + 1`；
   - 取消收藏：`DELETE favorite_items` 成功后 `favorite_count = GREATEST(favorite_count - 1, 0)`，下限保护为 0；
   - 批量一键收藏：先求“未收藏”差集，再批量插入，最后按差集数量一次性 `+N`；
   - 事务失败整体回滚，不出现“条目已写、计数未变”。
3. **防重复**：`favorite_items` 的 `UNIQUE(user_id, tea_id)` 是硬约束；重复收藏/重复取消按幂等处理，不重复加减计数。
4. **响应时点**：接口在事务提交后读取计数并返回，保证客户端拿到的值反映本次操作结果。
5. **对账兜底**：提供离线对账脚本/运维命令，按 `favorite_items` 分组重算并回写 `teas.favorite_count`；**不进入请求链路**。
6. **已知偏差**：`database/init.sql` 的种子 `favorite_count` 是演示热度值（如 2480），与 `favorite_items` 实际行数不相等；这是有意的演示数据，正式环境可通过对账归零/校准。
7. **下架茶品**：`is_active=0` 不会重置或删除计数；下架茶品的收藏保留，计数保留。

### 1.11 权限矩阵

| 能力 | 游客 | 注册用户 `role=user` | 管理员 `role=admin` |
|---|---|---|---|
| 茶品列表/筛选/排序/分页/详情/首页数据 | 允许 | 允许 | 允许 |
| 注册/登录/用户名可用性查询 | 允许 | 允许 | 允许 |
| 查看公开分享清单 | 允许 | 允许 | 允许 |
| 收藏/取消收藏/收藏状态 | 拒绝 40100 | 允许 | 允许 |
| 我的清单/改标题/写品鉴笔记 | 拒绝 40100 | 允许 | 允许 |
| 生成/撤销自己的分享 | 拒绝 40100 | 允许 | 允许 |
| 一键收藏他人分享 | 拒绝 40100 | 允许 | 允许 |
| 一键收藏自己的分享 | — | 拒绝 40300 | 拒绝 40300 |
| 管理员茶品维护/上下架/小贴士/统计/上传 | 拒绝 40100/40300 | 拒绝 40300 | 允许 |

- 管理员账号同时也是普通用户，可执行用户侧全部能力。
- 角色判定源为 `users.role`，不在 Cookie 中缓存。

### 1.12 明确不在本系统范围

以下业务**不存在对应接口**，契约中不得出现：

- 失物、拾物、认领、审核、通知、消息、站内信；
- 用户投稿、审核队列、举报、评论；
- 多清单创建/删除、清单描述；
- 用户管理、修改他人账号、密码找回、邮箱登录、微信扫码登录；
- 茶品物理删除（`DELETE /admin/teas/{id}` 不提供，只有上下架软失效）；
- 批量导入、图片删除、分享海报；
- 管理员操作日志查询接口（日志仅服务端记录，不对外暴露，见 §6.3）。

---

## 2. 共享数据结构

以下结构在多个接口中复用。字段类型为 JSON 类型，`DB 来源`列说明其数据库对应关系。

### 2.1 `User`

| 字段 | 类型 | 说明 | DB 来源 |
|---|---|---|---|
| `id` | integer | 用户主键 | `users.id` |
| `username` | string | 用户名，3–20 字符 | `users.username` |
| `role` | string | `user` / `admin` | `users.role` |
| `created_at` | datetime | 注册时间（UTC） | `users.created_at` |

> 统一使用 `id`，不使用 `user_id`。`password_hash` 永不返回。

示例：

```json
{
  "id": 12,
  "username": "teafan",
  "role": "user",
  "created_at": "2026-11-06T12:00:00Z"
}
```

### 2.2 `TeaListItem`（公开列表卡片）

| 字段 | 类型 | 说明 | DB 来源 |
|---|---|---|---|
| `id` | integer | 茶品主键 | `teas.id` |
| `name` | string | 茶品名称 | `teas.name` |
| `category` | string | 六大茶类枚举 | `teas.category` |
| `origin` | string | 完整产地“省 市 产区” | `teas.origin` |
| `season` | string / null | 采摘季节 | `teas.season` |
| `main_image_url` | string / null | 主图 URL 或 `/uploads/...` | `teas.main_image_url` |
| `favorite_count` | integer | 冗余收藏计数（缓存值） | `teas.favorite_count` |

示例：

```json
{
  "id": 1,
  "name": "西湖龙井",
  "category": "green",
  "origin": "浙江 杭州 西湖狮峰",
  "season": "明前",
  "main_image_url": "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop",
  "favorite_count": 2480
}
```

### 2.3 `TeaDetail`

在 `TeaListItem` 基础上增加以下字段：

| 字段 | 类型 | 说明 | DB 来源 |
|---|---|---|---|
| `fermentation` | string / null | 发酵程度 | `teas.fermentation` |
| `price_range` | string / null | 价格区间文案（≤32 字符） | `teas.price_range` |
| `representative_variety` | string / null | 代表品类 | `teas.representative_variety` |
| `shape_desc` | string | 外形描述 | `teas.shape_desc` |
| `soup_desc` | string | 汤色描述 | `teas.soup_desc` |
| `aroma_desc` | string | 香气描述 | `teas.aroma_desc` |
| `taste_desc` | string | 滋味描述 | `teas.taste_desc` |
| `water_temp` | number / null | 水温（摄氏度，70.0–100.0） | `teas.water_temp` |
| `tea_amount` | number / null | 投茶量（克） | `teas.tea_amount` |
| `brew_time` | number / null | 浸泡时间（秒） | `teas.brew_time` |
| `is_active` | boolean | 是否上架；公开详情恒为 `true` | `teas.is_active` |
| `created_at` | datetime | 创建/上架时间 | `teas.created_at` |
| `updated_at` | datetime | 最近编辑时间 | `teas.updated_at` |
| `tips_history` | string / null | 历史典故 | `tea_tips.history` |
| `tips_suitable` | string / null | 适合人群 | `tea_tips.suitable` |
| `tips_misconception` | string / null | 冲泡误区 | `tea_tips.misconception` |
| `tips_official_note` | string / null | 官方品鉴笔记 | `tea_tips.official_note` |

说明：

- 四个 `tips_*` 字段为**扁平化派生字段**；`tea_tips` 无对应行时全部为 `null`。
- 任一 `tips_*` 为 `null` 时，前端整块隐藏（PRD FR-3.2 / FR-6.4）。
- 公开详情接口遇到 `is_active=0` 直接返回 `40401`，因此公开响应中 `is_active` 恒为 `true`；管理员详情可能为 `false`。

示例：

```json
{
  "id": 1,
  "name": "西湖龙井",
  "category": "green",
  "origin": "浙江 杭州 西湖狮峰",
  "season": "明前",
  "fermentation": "不发酵",
  "price_range": null,
  "representative_variety": "群体种",
  "shape_desc": "扁平光滑，色翠略黄，形似雀舌",
  "soup_desc": "嫩绿明亮，清澈见底",
  "aroma_desc": "豆香清雅，热香馥郁，冷香幽兰",
  "taste_desc": "鲜爽甘醇，回甘明显，有淡淡的板栗香",
  "water_temp": 85.0,
  "tea_amount": 3.0,
  "brew_time": 90.0,
  "main_image_url": "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop",
  "is_active": true,
  "favorite_count": 2480,
  "created_at": "2026-11-06T12:00:00Z",
  "updated_at": "2026-11-06T12:00:00Z",
  "tips_history": "西湖龙井始于唐代，是中国十大名茶之首，狮峰产区为核心原产地。",
  "tips_suitable": "适合脾胃强健、喜鲜爽口感的茶友；春季饮用尤佳。",
  "tips_misconception": "水温不宜过高，85℃即可，沸水会烫熟嫩芽导致苦涩。",
  "tips_official_note": "采摘标准为一芽一叶或一芽二叶初展，炒制工艺独特。"
}
```

### 2.3.1 `CategoryCount` / `OriginCount`

| 结构 | 字段 | 类型 | 说明 |
|---|---|---|---|
| `CategoryCount` | `category` | string | 六大茶类值，顺序固定 `green, white, yellow, red, oolong, dark` |
| | `count` | integer | 已上架数量；无收录返回 0 |
| `OriginCount` | `origin` | string | **省级名称**（从 `teas.origin` 第一个空格前的片段派生），如“浙江” |
| | `count` | integer | 该省已上架数量 |

### 2.4 `FavoriteState`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tea_id` | integer | 茶品主键 |
| `is_favorited` | boolean | 当前用户是否已收藏 |
| `favorite_count` | integer | `teas.favorite_count` 缓存值 |

### 2.5 `ListItem` / `ListData` / `ShareBrief`

`ListItem`（仅清单所有者可见，含私有笔记）：

| 字段 | 类型 | 说明 | DB 来源 |
|---|---|---|---|
| `tea_id` | integer | 茶品主键（条目业务键） | `favorite_items.tea_id` |
| `name` | string | 茶品名称 | `teas.name` |
| `category` | string | 茶类 | `teas.category` |
| `origin` | string | 产地 | `teas.origin` |
| `season` | string / null | 采摘季节 | `teas.season` |
| `main_image_url` | string / null | 主图 | `teas.main_image_url` |
| `favorite_count` | integer | 茶品收藏计数（缓存） | `teas.favorite_count` |
| `is_available` | boolean | 茶品是否仍在架；`false` 时前端灰显占位 | 派生自 `teas.is_active` |
| `tasting_note` | string / null | 私有品鉴笔记；`null` 表示未写 | `favorite_items.tasting_note` |
| `favorited_at` | datetime | 收藏时间 | `favorite_items.created_at` |

> `favorite_items.id` 是内部主键，不作为条目业务键暴露；条目操作用 `tea_id`。

`ShareBrief`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `token` | string | 当前生效分享短码 |
| `url` | string | 前端路由 `/c/{token}`（相对路径） |
| `created_at` | datetime | 令牌生成时间 |

`ListData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | integer | `collection_lists.id` |
| `title` | string | 清单标题 | 
| `tea_count` | integer | 清单条目总数（含已下架占位） |
| `created_at` | datetime | 清单创建时间 |
| `updated_at` | datetime | 清单最近更新时间 |
| `share` | `ShareBrief` / null | 当前生效分享；无则为 `null` |
| `items` | `ListItem[]` | 全部条目，按 `favorited_at DESC, tea_id DESC` 排序 |

### 2.6 `ShareViewItem` / `ShareViewData`

`ShareViewItem`（游客可见，**绝不含 `tasting_note`**）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tea_id` | integer | 茶品主键 |
| `name` | string | 茶品名称 |
| `category` | string | 茶类 |
| `origin` | string | 产地 |
| `season` | string / null | 采摘季节 |
| `main_image_url` | string / null | 主图 |
| `favorite_count` | integer | 收藏计数（缓存） |
| `is_available` | boolean | 是否在架；下架条目灰显 |

`ShareViewData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `token` | string | 分享短码 |
| `title` | string | 清单标题（动态读 `collection_lists.title`） |
| `tea_count` | integer | 有效分享为条目总数（含下架占位）；已撤销时为 `0` |
| `created_at` | datetime | 分享令牌创建时间 |
| `revoked` | boolean | `true` 表示已被撤销；此时 `items=[]` |
| `is_owner` | boolean | 当前请求者是否为清单所有者；游客恒 `false` |
| `items` | `ShareViewItem[]` | 有效分享时为条目列表；撤销时为空 |

### 2.7 `AdminTeaListItem`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | integer | `teas.id` |
| `name` | string | 茶品名称 |
| `category` | string | 茶类 |
| `origin` | string | 产地 |
| `season` | string / null | 采摘季节 |
| `main_image_url` | string / null | 主图 |
| `is_active` | boolean | 上架状态（后台可见下架） |
| `favorite_count` | integer | 收藏计数缓存 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 最近编辑时间 |

### 2.8 `AdminStats`

| 字段 | 类型 | 说明 |
|---|---|---|
| `total_count` | integer | 茶品总数（含下架） |
| `active_count` | integer | 上架数 |
| `inactive_count` | integer | 下架数 |
| `category_distribution` | `CategoryCount[]` | 六大茶类分布（含下架），顺序固定，缺失补 0 |

### 2.9 `UploadResult`

| 字段 | 类型 | 说明 |
|---|---|---|
| `url` | string | 同源相对路径 `/uploads/YYYY/MM/<uuid>.<ext>` |
| `original_filename` | string | 客户端原文件名，仅用于展示，不参与落盘 |
| `size` | integer | 文件字节数 |
| `content_type` | string | 服务端校验后的 MIME，如 `image/jpeg` |

---

## 3. 接口总览

| # | 模块 | 方法 | 路径 | 权限 |
|---|---|---|---|---|
| 1 | 认证 | GET | `/auth/username-availability` | 游客 |
| 2 | 认证 | POST | `/auth/register` | 游客 |
| 3 | 认证 | POST | `/auth/login` | 游客 |
| 4 | 认证 | POST | `/auth/logout` | 任意 |
| 5 | 认证 | GET | `/auth/me` | 登录用户 |
| 6 | 茶品 | GET | `/teas` | 游客 |
| 7 | 茶品 | GET | `/teas/categories` | 游客 |
| 8 | 茶品 | GET | `/teas/origins` | 游客 |
| 9 | 茶品 | GET | `/teas/hot` | 游客 |
| 10 | 茶品 | GET | `/teas/random` | 游客 |
| 11 | 茶品 | GET | `/teas/{tea_id}` | 游客 |
| 12 | 收藏 | POST | `/favorites/{tea_id}` | 登录用户 |
| 13 | 收藏 | DELETE | `/favorites/{tea_id}` | 登录用户 |
| 14 | 收藏 | GET | `/favorites/{tea_id}/status` | 登录用户 |
| 15 | 清单 | GET | `/lists` | 登录用户 |
| 16 | 清单 | PUT | `/lists/title` | 登录用户 |
| 17 | 清单 | PUT | `/lists/notes/{tea_id}` | 登录用户 |
| 18 | 分享 | POST | `/shares/generate` | 登录用户 |
| 19 | 分享 | POST | `/shares/revoke/{token}` | 登录用户（所有者） |
| 20 | 分享 | GET | `/shares/{token}` | 游客（可选 Cookie） |
| 21 | 分享 | POST | `/shares/{token}/copy` | 登录用户（非所有者） |
| 22 | 管理员 | GET | `/admin/teas` | 管理员 |
| 23 | 管理员 | GET | `/admin/teas/{tea_id}` | 管理员 |
| 24 | 管理员 | POST | `/admin/teas` | 管理员 |
| 25 | 管理员 | PUT | `/admin/teas/{tea_id}` | 管理员 |
| 26 | 管理员 | PATCH | `/admin/teas/{tea_id}/toggle` | 管理员 |
| 27 | 管理员 | PUT | `/admin/teas/{tea_id}/tips` | 管理员 |
| 28 | 管理员 | GET | `/admin/stats` | 管理员 |
| 29 | 管理员 | POST | `/admin/upload` | 管理员 |

> 清单条目移除不单独提供 `DELETE /lists/{tea_id}`，统一复用 `DELETE /favorites/{tea_id}`，避免同一语义两个入口。

---

## 4. 接口详情

### 4.1 认证模块

#### 4.1.1 用户名可用性查询

- **方法与路径**：`GET /auth/username-availability`
- **权限**：游客
- **用途**：PRD FR-4.1 用户名实时唯一校验，供注册面板防抖调用。
- **查询参数**：

| 参数 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `username` | string | 是 | 3–20 字符，`^[A-Za-z0-9\u4e00-\u9fa5]{3,20}$`，服务端 trim |

- **请求体**：无
- **成功响应**：HTTP 200，`code=0`

```json
{
  "code": 0,
  "message": "ok",
  "data": { "username": "teafan", "available": true }
}
```

| data 字段 | 类型 | 说明 |
|---|---|---|
| `username` | string | 归一化（trim）后的用户名 |
| `available` | boolean | 是否可注册；已占用为 `false`（不是错误） |

- **错误**：`40000` 格式/长度非法。
- **规则**：用户名唯一性大小写不敏感（`utf8mb4_unicode_ci`），`TeaFan` 与 `teafan` 视为同名；本接口不创建用户、不下发 Cookie。

#### 4.1.2 注册

- **方法与路径**：`POST /auth/register`
- **权限**：游客
- **请求体**：

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `username` | string | 是 | 3–20 字符，中文/英文/数字，trim 后校验 |
| `password` | string | 是 | 6–64 字符；不 trim；bcrypt 哈希存储，永不回显 |

- **请求示例**：

```json
{ "username": "teafan", "password": "tea2026" }
```

- **成功响应**：HTTP 200，`code=0`，`data` 为 `User`，同时 `Set-Cookie: tea_session=...`（30 天）

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 12,
    "username": "teafan",
    "role": "user",
    "created_at": "2026-11-06T12:00:00Z"
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | 用户名/密码长度或字符集非法 |
| 409 | 40910 | 用户名已存在（大小写不敏感） |

- **规则**：注册成功即自动登录（PRD FR-4.1），返回 `Set-Cookie`；默认清单不在注册时创建，而是在首次 `GET /lists` 时惰性创建；密码使用 bcrypt（cost=10）。

#### 4.1.3 登录

- **方法与路径**：`POST /auth/login`
- **权限**：游客（管理员也使用同一入口）
- **请求体**：

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `username` | string | 是 | 1–32 字符，trim |
| `password` | string | 是 | 1–64 字符，不 trim |

- **成功响应**：HTTP 200，`code=0`，`data` 为 `User`，`Set-Cookie: tea_session=...`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2026-11-06T12:00:00Z"
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | 字段缺失/超长 |
| 401 | 40110 | 用户名不存在或密码错误（统一提示，不区分） |

- **规则**：登录失败不锁定账号（PRD FR-4.4）；成功覆盖旧 Cookie；`role` 由数据库读取。

#### 4.1.4 退出登录

- **方法与路径**：`POST /auth/logout`
- **权限**：任意（未登录调用也返回成功，幂等）
- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data=null`，并 `Set-Cookie: tea_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`

```json
{ "code": 0, "message": "ok", "data": null }
```

- **错误**：无业务错误；`50000` 除外。
- **规则**：服务端不维护会话表，清除 Cookie 即完成退出。

#### 4.1.5 当前用户信息

- **方法与路径**：`GET /auth/me`
- **权限**：登录用户（Cookie 自动携带）
- **查询参数/请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `User`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2026-11-06T12:00:00Z"
  }
}
```

- **错误**：`40100`（无 Cookie、签名无效、过期、用户已被删除）。
- **规则**：`role` 实时读 `users.role`；前端据此显示管理入口。

---

### 4.2 茶品模块

#### 4.2.1 茶品列表（筛选 + 排序 + 分页）

- **方法与路径**：`GET /teas`
- **权限**：游客
- **查询参数**：

| 参数 | 类型 | 必填 | 默认 | 约束与语义 |
|---|---|---|---|---|
| `category` | string | 否 | — | 逗号分隔枚举，如 `green,oolong`；同维度多选为 OR |
| `origin` | string | 否 | — | 逗号分隔**省级名称**，如 `浙江,福建`；按 `origin` 前缀匹配（`浙江%`）；同维度 OR |
| `season` | string | 否 | — | 逗号分隔枚举，如 `明前,春茶`；同维度 OR |
| `keyword` | string | 否 | — | 1–50 字符；对 `name`、`origin` 做 `LIKE %词%`，空串忽略 |
| `sort` | string | 否 | `newest` | `newest`（创建时间倒序）/ `favorite`（收藏数倒序） |
| `page` | integer | 否 | `1` | ≥1；越界夹取 |
| `page_size` | integer | 否 | **12** | 1–50；越界夹取；默认值对应 PRD FR-1.6 |

- **过滤逻辑**：不同维度之间固定 AND（茶类 AND 产地 AND 季节 AND 关键词）；同维度多选 OR（PRD FR-1.2）。
- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为分页结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "西湖龙井",
        "category": "green",
        "origin": "浙江 杭州 西湖狮峰",
        "season": "明前",
        "main_image_url": "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop",
        "favorite_count": 2480
      }
    ],
    "total": 42,
    "page": 1,
    "page_size": 12
  }
}
```

| data 字段 | 类型 | 说明 |
|---|---|---|
| `items` | `TeaListItem[]` | 当前页；无结果 `[]` |
| `total` | integer | 过滤后总数 |
| `page` | integer | 实际页码 |
| `page_size` | integer | 实际每页条数 |

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | `category`/`season`/`sort` 非法枚举，或 `keyword` 超过 50 字符 |

- **规则**：
  - 只返回 `is_active=1` 的茶品；下架茶品在列表/搜索/推荐中完全隐藏（PRD FR-6.3）。
  - 排序：`newest` → `created_at DESC, id DESC`；`favorite` → `favorite_count DESC, created_at DESC, id DESC`。
  - 无结果时返回空数组，不报错（PRD 空状态由前端渲染）。
  - 产地筛选面向省级选项（PRD FR-1.1）；`teas.origin` 存储为“省 市 产区”，服务端取第一个空格前片段作为省份并做前缀匹配。

#### 4.2.2 六大茶类计数

- **方法与路径**：`GET /teas/categories`
- **权限**：游客
- **参数/请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `CategoryCount[]`，固定六项且顺序固定：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    { "category": "green", "count": 18 },
    { "category": "white", "count": 0 },
    { "category": "yellow", "count": 2 },
    { "category": "red", "count": 5 },
    { "category": "oolong", "count": 7 },
    { "category": "dark", "count": 3 }
  ]
}
```

- **错误**：无业务错误；`50000` 除外。
- **规则**：只统计 `is_active=1`；无茶类的茶类返回 `count=0`（PRD FR-2.1“暂无收录”），不省略。

#### 4.2.3 产地选项

- **方法与路径**：`GET /teas/origins`
- **权限**：游客
- **参数/请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `OriginCount[]`，按 `count DESC, origin ASC`：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    { "origin": "福建", "count": 12 },
    { "origin": "浙江", "count": 8 },
    { "origin": "云南", "count": 3 }
  ]
}
```

- **错误**：无业务错误；`50000` 除外。
- **规则**：只统计 `is_active=1`；`origin` 值为**省级名称**（`teas.origin` 第一段），不是完整产地；前端筛选用该值传 `GET /teas?origin=浙江`。

#### 4.2.4 热门推荐

- **方法与路径**：`GET /teas/hot`
- **权限**：游客
- **查询参数**：

| 参数 | 类型 | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `limit` | integer | 否 | `8` | 1–20；越界夹取；PRD FR-2.2 固定展示前 8 |

- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `TeaListItem[]`：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "id": 5,
      "name": "大红袍",
      "category": "oolong",
      "origin": "福建 武夷山 九龙窠",
      "season": "春茶",
      "main_image_url": "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&h=400&fit=crop",
      "favorite_count": 3120
    }
  ]
}
```

- **错误**：`40000`（`limit` 非整数）。
- **规则**：只取 `is_active=1`；排序 `favorite_count DESC, created_at DESC, id DESC`；数据不足 8 条时返回实际条数，不补占位。

#### 4.2.5 随机发现

- **方法与路径**：`GET /teas/random`
- **权限**：游客
- **查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `exclude_id` | integer | 否 | 排除的茶品 ID，用于“换一批”避免重复 |

- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `TeaDetail` 或 `null`：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "id": 3, "name": "君山银针", "category": "yellow", "...": "..." }
}
```

- **错误**：`40000`（`exclude_id` 非整数）。
- **规则**：仅从 `is_active=1` 中随机取 1 条（MVP 完全随机，无个性化）；无可选茶品时 `data=null`（HTTP 200），前端显示占位。

#### 4.2.6 茶品详情

- **方法与路径**：`GET /teas/{tea_id}`
- **权限**：游客
- **路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `tea_id` | integer | 是 | 茶品主键 |

- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `TeaDetail`（字段见 §2.3；含四个扁平 `tips_*`）

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1,
    "name": "西湖龙井",
    "category": "green",
    "origin": "浙江 杭州 西湖狮峰",
    "season": "明前",
    "fermentation": "不发酵",
    "price_range": null,
    "representative_variety": "群体种",
    "shape_desc": "扁平光滑，色翠略黄，形似雀舌",
    "soup_desc": "嫩绿明亮，清澈见底",
    "aroma_desc": "豆香清雅，热香馥郁，冷香幽兰",
    "taste_desc": "鲜爽甘醇，回甘明显，有淡淡的板栗香",
    "water_temp": 85.0,
    "tea_amount": 3.0,
    "brew_time": 90.0,
    "main_image_url": "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop",
    "is_active": true,
    "favorite_count": 2480,
    "created_at": "2026-11-06T12:00:00Z",
    "updated_at": "2026-11-06T12:00:00Z",
    "tips_history": "西湖龙井始于唐代，是中国十大名茶之首，狮峰产区为核心原产地。",
    "tips_suitable": "适合脾胃强健、喜鲜爽口感的茶友；春季饮用尤佳。",
    "tips_misconception": "水温不宜过高，85℃即可，沸水会烫熟嫩芽导致苦涩。",
    "tips_official_note": "采摘标准为一芽一叶或一芽二叶初展，炒制工艺独特。"
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 404 | 40400 | `tea_id` 不存在 |
| 404 | 40401 | 茶品已下架（PRD 例外：旧链接访问） |

- **规则**：下架茶品不返回详情数据；前端展示“该茶品暂不可用”+ 同类替代引导；`tips_*` 为空的区块由前端隐藏，不返回空占位对象。

---

### 4.3 收藏模块

#### 4.3.1 收藏茶品

- **方法与路径**：`POST /favorites/{tea_id}`
- **权限**：登录用户（`user` / `admin`）
- **路径参数**：`tea_id` integer，必填
- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `FavoriteState`：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "tea_id": 1, "is_favorited": true, "favorite_count": 2481 }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 401 | 40100 | 未登录/会话过期 |
| 404 | 40400 | 茶品不存在 |
| 404 | 40401 | 茶品已下架，不可收藏 |

- **规则**：
  - **幂等**：已收藏时再次调用不新增行、不重复计数，仍返回 `is_favorited=true` 与当前计数。
  - 同事务写入 `favorite_items` 与 `teas.favorite_count +1`（见 §1.10）。
  - 依赖 `UNIQUE(user_id, tea_id)` 防并发重复；撞唯一冲突按“已收藏”处理，不返回 409。

#### 4.3.2 取消收藏

- **方法与路径**：`DELETE /favorites/{tea_id}`
- **权限**：登录用户
- **路径参数**：`tea_id` integer，必填
- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `FavoriteState`：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "tea_id": 1, "is_favorited": false, "favorite_count": 2480 }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 401 | 40100 | 未登录/会话过期 |
| 404 | 40400 | 茶品不存在 |

- **规则**：
  - **幂等**：未收藏时调用仍返回成功，计数不变。
  - **不校验 `is_active`**：已下架茶品仍需可从清单中移除，因此只校验茶品是否存在。
  - 同事务删除条目并 `favorite_count = GREATEST(favorite_count - 1, 0)`。

#### 4.3.3 查询收藏状态

- **方法与路径**：`GET /favorites/{tea_id}/status`
- **权限**：登录用户
- **路径参数**：`tea_id` integer，必填
- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `FavoriteState`：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "tea_id": 1, "is_favorited": true, "favorite_count": 2480 }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 401 | 40100 | 未登录/会话过期 |
| 404 | 40400 | 茶品不存在 |

- **规则**：允许查询已下架茶品的收藏状态（清单占位场景）；`favorite_count` 为缓存值。

---

### 4.4 清单与品鉴笔记模块

#### 4.4.1 获取我的默认清单

- **方法与路径**：`GET /lists`
- **权限**：登录用户
- **参数/请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `ListData`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 7,
    "title": "我的收藏",
    "tea_count": 2,
    "created_at": "2026-11-06T12:00:00Z",
    "updated_at": "2026-11-06T12:00:00Z",
    "share": null,
    "items": [
      {
        "tea_id": 1,
        "name": "西湖龙井",
        "category": "green",
        "origin": "浙江 杭州 西湖狮峰",
        "season": "明前",
        "main_image_url": "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop",
        "favorite_count": 2480,
        "is_available": true,
        "tasting_note": "豆香明显，回甘快。",
        "favorited_at": "2026-11-06T12:00:00Z"
      }
    ]
  }
}
```

- **错误**：`40100`（未登录/会话过期）。
- **规则**：
  - 首次调用自动创建默认清单（标题“我的收藏”，`UNIQUE(user_id)` 保证只有一次成功）；已有则直接返回（幂等）。
  - `items` 返回全部条目，不分页（MVP 单清单、数据量可控），按 `favorited_at DESC, tea_id DESC`。
  - `tea_count` 为条目总数，包含已下架占位。
  - `is_available=false` 表示茶已下架，前端灰显“该茶品暂不可用”，但条目仍保留（PRD FR-5 例外）。
  - `share` 为当前生效令牌；无生效分享时为 `null`；已撤销令牌不返回。

#### 4.4.2 更新清单标题

- **方法与路径**：`PUT /lists/title`
- **权限**：登录用户（清单所有者；MVP 一人一清单，登录即所有者）
- **请求体**：

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `title` | string | 是 | trim 后 2–20 字符；不能为纯空白 |

- **请求示例**：`{ "title": "我的私房茶单" }`
- **成功响应**：HTTP 200，`code=0`

```json
{
  "code": 0,
  "message": "ok",
  "data": { "id": 7, "title": "我的私房茶单", "updated_at": "2026-11-06T12:30:00Z" }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | 标题缺失、长度不在 2–20 或纯空白 |
| 401 | 40100 | 未登录/会话过期 |

- **规则**：清单不可删除；分享访问时标题动态读本字段，不存在令牌上的标题副本（DATA_MODEL C2）。

#### 4.4.3 保存品鉴笔记

- **方法与路径**：`PUT /lists/notes/{tea_id}`
- **权限**：登录用户（清单所有者）
- **路径参数**：`tea_id` integer，必填
- **请求体**：

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `content` | string / null | 是 | 可为 `null`；`TEXT` 存储，MVP 不设硬性字数上限；纯空白归一化为 `null` |

- **请求示例**：

```json
{ "content": "第一泡豆香突出，第三泡回甘明显。" }
```

清空笔记：

```json
{ "content": null }
```

- **成功响应**：HTTP 200，`code=0`

```json
{
  "code": 0,
  "message": "ok",
  "data": { "tea_id": 1, "tasting_note": "第一泡豆香突出，第三泡回甘明显。" }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | `content` 字段缺失或类型非 string/null |
| 401 | 40100 | 未登录/会话过期 |
| 404 | 40430 | 该茶品不在当前用户收藏中（未收藏无法写笔记） |

- **规则**：
  - 笔记写入 `favorite_items.tasting_note`，仅本人可读写；分享接口**不返回**笔记（PRD FR-5.3）。
  - 笔记与茶品详情页“用户投稿”无关，MVP 不提供投稿。
  - 清空笔记不删除收藏条目。

---

### 4.5 分享模块

#### 4.5.1 生成分享链接

- **方法与路径**：`POST /shares/generate`
- **权限**：登录用户（清单所有者）
- **请求体**：无（不再接收 `title`，标题取 `collection_lists.title`）
- **成功响应**：HTTP 200，`code=0`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "k7X9m2Qa",
    "url": "/c/k7X9m2Qa",
    "created_at": "2026-11-06T12:00:00Z",
    "is_new": true
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `token` | string | 8 位 URL-safe 短码，大小写敏感（`utf8mb4_bin`），全局唯一 |
| `url` | string | 前端分享页相对路径 `/c/{token}`；前端自行拼接站点域名 |
| `created_at` | datetime | 令牌生成时间 |
| `is_new` | boolean | `true` 新建；`false` 复用已有生效令牌（派生字段，无 DB 列） |

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 401 | 40100 | 未登录/会话过期 |

- **规则**：
  - 若清单已有 `is_active=1` 的令牌则**复用**，不产生重复令牌；否则新建。
  - 令牌无过期时间，永久有效，除非显式撤销（PRD FR-5.4）。
  - 撤销后旧令牌不可复活；再次生成必须新建令牌。
  - 生成前若默认清单不存在，先惰性创建。

#### 4.5.2 撤销分享

- **方法与路径**：`POST /shares/revoke/{token}`
- **权限**：登录用户，且必须是该令牌所属清单的所有者
- **路径参数**：`token` string，8 位短码，大小写敏感
- **请求体**：无
- **成功响应**：HTTP 200，`code=0`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "k7X9m2Qa",
    "is_active": false,
    "revoked_at": "2026-11-06T12:30:00Z"
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 令牌属于其他用户 |
| 404 | 40410 | 令牌不存在 |
| 409 | 40900 | 令牌已撤销 |

- **规则**：撤销为软失效：`is_active=0` + `revoked_at`，行永久保留；撤销不可逆（PRD FR-5.5）；不物理删除令牌。

#### 4.5.3 查看公开分享清单

- **方法与路径**：`GET /shares/{token}`
- **权限**：游客（无需登录；若携带 Cookie 则用于计算 `is_owner`）
- **路径参数**：`token` string，8 位短码，大小写敏感
- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `ShareViewData`

有效分享：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "k7X9m2Qa",
    "title": "我的收藏",
    "tea_count": 2,
    "created_at": "2026-11-06T12:00:00Z",
    "revoked": false,
    "is_owner": false,
    "items": [
      {
        "tea_id": 1,
        "name": "西湖龙井",
        "category": "green",
        "origin": "浙江 杭州 西湖狮峰",
        "season": "明前",
        "main_image_url": "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop",
        "favorite_count": 2480,
        "is_available": true
      }
    ]
  }
}
```

已撤销分享（HTTP 200，通过 `revoked=true` 表达，便于前端展示明确文案）：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "k7X9m2Qa",
    "title": "我的收藏",
    "tea_count": 0,
    "created_at": "2026-11-06T12:00:00Z",
    "revoked": true,
    "is_owner": false,
    "items": []
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 404 | 40410 | 令牌不存在 |

- **规则**：
  - 公开只读；不返回品鉴笔记、不返回所有者身份信息。
  - 下架茶品保留条目并返回 `is_available=false`，前端灰显占位（PRD FR-5 例外）。
  - 撤销后的分享返回 `revoked=true`、`items=[]`、`tea_count=0`，前端展示“该分享已被撤销”+ 引导浏览公开推荐。
  - `is_owner` 供前端隐藏“一键收藏全部”按钮；游客恒 `false`。

#### 4.5.4 一键收藏全部

- **方法与路径**：`POST /shares/{token}/copy`
- **权限**：登录用户；**不能是清单所有者本人**
- **路径参数**：`token` string，8 位短码
- **请求体**：无
- **成功响应**：HTTP 200，`code=0`

```json
{
  "code": 0,
  "message": "ok",
  "data": { "added": 3, "skipped": 1, "total": 4 }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `added` | integer | 本次新增到当前用户清单的茶品数 |
| `skipped` | integer | 跳过的条目数（已收藏 + 已下架不可收藏） |
| `total` | integer | 分享中的条目总数 |

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 当前用户是清单所有者 |
| 404 | 40410 | 令牌不存在 |
| 409 | 40900 | 令牌已撤销 |

- **规则**：
  - 只收藏 `is_active=1` 的茶；下架茶计入 `skipped`，不创建收藏。
  - 先查当前用户已收藏集合，求差集后批量插入；只对差集数量递增 `favorite_count`，同事务完成（DATA_MODEL §6.3）。
  - 幂等：重复调用时 `added=0`，已存在条目全部进入 `skipped`。
  - 当前用户无默认清单时先惰性创建。

---

### 4.6 管理员模块

所有 `/admin/*` 接口要求 `users.role=admin`；未登录返回 `40100`，已登录但非管理员返回 `40300`。

#### 4.6.1 茶品列表（管理视角）

- **方法与路径**：`GET /admin/teas`
- **权限**：管理员
- **查询参数**：

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `category` | string | 否 | — | 逗号分隔茶类 |
| `keyword` | string | 否 | — | 1–50 字符，匹配名称/产地 |
| `is_active` | boolean | 否 | — | 省略=全部；`true` 只看上架；`false` 只看下架 |
| `sort` | string | 否 | `newest` | `newest` / `favorite` |
| `page` | integer | 否 | `1` | 同 §1.6 |
| `page_size` | integer | 否 | `12` | 同 §1.6，最大 50 |

- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为分页结构，`items` 为 `AdminTeaListItem[]`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "西湖龙井",
        "category": "green",
        "origin": "浙江 杭州 西湖狮峰",
        "season": "明前",
        "main_image_url": "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop",
        "is_active": true,
        "favorite_count": 2480,
        "created_at": "2026-11-06T12:00:00Z",
        "updated_at": "2026-11-06T12:00:00Z"
      }
    ],
    "total": 6,
    "page": 1,
    "page_size": 12
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | 枚举/布尔/分页非法 |
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 非管理员 |

- **规则**：后台列表**包含下架茶品**；公开过滤条件不加 `is_active=1`；排序次级键 `id DESC`。

#### 4.6.2 茶品详情（管理视角）

- **方法与路径**：`GET /admin/teas/{tea_id}`
- **权限**：管理员
- **路径参数**：`tea_id` integer，必填
- **请求体**：无
- **成功响应**：HTTP 200，`code=0`，`data` 为 `TeaDetail`，`is_active` 可能为 `false`，`tips_*` 可为 `null`
- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 非管理员 |
| 404 | 40400 | 茶品不存在 |

- **规则**：下架茶品仍可编辑，故本接口不返回 `40401`。

#### 4.6.3 新增茶品

- **方法与路径**：`POST /admin/teas`
- **权限**：管理员
- **请求体**（`application/json`）：

| 字段 | 类型 | 必填 | 约束 | DB 列 |
|---|---|---|---|---|
| `name` | string | 是 | trim 后 1–100 字符 | `teas.name` |
| `category` | string | 是 | 六类枚举 | `teas.category` |
| `origin` | string | 是 | 1–200 字符，“省 市 产区” | `teas.origin` |
| `season` | string / null | 否 | 六值枚举或 `null` | `teas.season` |
| `fermentation` | string / null | 否 | 五值枚举或 `null` | `teas.fermentation` |
| `price_range` | string / null | 否 | ≤32 字符，文案待定 | `teas.price_range` |
| `representative_variety` | string / null | 否 | ≤100 字符 | `teas.representative_variety` |
| `shape_desc` | string | 是 | 非空 | `teas.shape_desc` |
| `soup_desc` | string | 是 | 非空 | `teas.soup_desc` |
| `aroma_desc` | string | 是 | 非空 | `teas.aroma_desc` |
| `taste_desc` | string | 是 | 非空 | `teas.taste_desc` |
| `water_temp` | number | 是 | 70.0–100.0，1 位小数 | `teas.water_temp` |
| `tea_amount` | number | 是 | >0 且 ≤999.9，1 位小数 | `teas.tea_amount` |
| `brew_time` | number | 是 | >0 且 ≤999.9，1 位小数 | `teas.brew_time` |
| `main_image_url` | string | 是 | ≤500 字符；`http(s)://` 外链或 `/uploads/...` | `teas.main_image_url` |
| `tips_history` | string / null | 否 | 空/纯空白归一化为 `null` | `tea_tips.history` |
| `tips_suitable` | string / null | 否 | 同上 | `tea_tips.suitable` |
| `tips_misconception` | string / null | 否 | 同上 | `tea_tips.misconception` |
| `tips_official_note` | string / null | 否 | 同上 | `tea_tips.official_note` |

- **不接受**：`is_active`（创建后默认上架）、`favorite_count`（服务端维护）、`id`。
- **请求示例**：

```json
{
  "name": "碧螺春",
  "category": "green",
  "origin": "江苏 苏州 洞庭山",
  "season": "明前",
  "fermentation": "不发酵",
  "price_range": "100-500",
  "representative_variety": "群体种",
  "shape_desc": "条索纤细，卷曲成螺，满披白毫",
  "soup_desc": "嫩绿明亮",
  "aroma_desc": "花果香浓郁",
  "taste_desc": "鲜爽甘醇，回甘持久",
  "water_temp": 80.0,
  "tea_amount": 3.0,
  "brew_time": 60.0,
  "main_image_url": "/uploads/2026/11/8f3c2b1a.jpg",
  "tips_history": "碧螺春产于苏州太湖洞庭山，已有千年历史。",
  "tips_suitable": null,
  "tips_misconception": null,
  "tips_official_note": null
}
```

- **成功响应**：HTTP 200，`code=0`，`data` 为完整 `TeaDetail`（`is_active=true`，`favorite_count=0`）：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 7,
    "name": "碧螺春",
    "category": "green",
    "origin": "江苏 苏州 洞庭山",
    "season": "明前",
    "fermentation": "不发酵",
    "price_range": "100-500",
    "representative_variety": "群体种",
    "shape_desc": "条索纤细，卷曲成螺，满披白毫",
    "soup_desc": "嫩绿明亮",
    "aroma_desc": "花果香浓郁",
    "taste_desc": "鲜爽甘醇，回甘持久",
    "water_temp": 80.0,
    "tea_amount": 3.0,
    "brew_time": 60.0,
    "main_image_url": "/uploads/2026/11/8f3c2b1a.jpg",
    "is_active": true,
    "favorite_count": 0,
    "created_at": "2026-11-06T12:00:00Z",
    "updated_at": "2026-11-06T12:00:00Z",
    "tips_history": "碧螺春产于苏州太湖洞庭山，已有千年历史。",
    "tips_suitable": null,
    "tips_misconception": null,
    "tips_official_note": null
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | 必填缺失、枚举/数值/长度非法 |
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 非管理员 |

- **规则**：
  - 必填校验由前后端双重保障（PRD FR-6.1），后端为准。
  - 若提供任一 `tips_*`，创建对应 `tea_tips` 行；全为 `null` 时可不建行，读取时四个字段统一返回 `null`（等价）。
  - 写入 `operation_logs`：`action='create_tea'`、`target_type='tea'`、`target_id=新 id`、`detail` 为名称摘要。

#### 4.6.4 编辑茶品

- **方法与路径**：`PUT /admin/teas/{tea_id}`
- **权限**：管理员
- **路径参数**：`tea_id` integer，必填
- **请求体**：与 §4.6.3 的茶品主体字段一致（全部必填/选填规则相同），但 **不接受 `tips_*`**：

  - 必填：`name`、`category`、`origin`、`shape_desc`、`soup_desc`、`aroma_desc`、`taste_desc`、`water_temp`、`tea_amount`、`brew_time`、`main_image_url`。
  - 选填：`season`、`fermentation`、`price_range`、`representative_variety`；**省略或 `null` 均写为 `NULL`**（PUT 全量替换语义）。
  - 不可改：`id`、`is_active`（用 toggle）、`favorite_count`。
- **请求示例**：

```json
{
  "name": "西湖龙井",
  "category": "green",
  "origin": "浙江 杭州 西湖狮峰",
  "season": "明前",
  "fermentation": "不发酵",
  "price_range": "500-1000",
  "representative_variety": "群体种",
  "shape_desc": "扁平光滑，色翠略黄，形似雀舌",
  "soup_desc": "嫩绿明亮，清澈见底",
  "aroma_desc": "豆香清雅，热香馥郁，冷香幽兰",
  "taste_desc": "鲜爽甘醇，回甘明显，有淡淡的板栗香",
  "water_temp": 85.0,
  "tea_amount": 3.0,
  "brew_time": 90.0,
  "main_image_url": "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop"
}
```

- **成功响应**：HTTP 200，`code=0`，`data` 为更新后的完整 `TeaDetail`（`tips_*` 保持原值）
- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | 字段校验失败 |
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 非管理员 |
| 404 | 40400 | 茶品不存在 |

- **规则**：
  - 编辑即时生效，无审核（PRD FR-6.2）。
  - 小贴士不由本接口修改，走 §4.6.6。
  - `updated_at` 由数据库 `ON UPDATE CURRENT_TIMESTAMP` / ORM 自动更新。
  - 写入 `operation_logs`：`action='update_tea'`、`target_id=tea_id`、`detail` 为名称摘要。

#### 4.6.5 茶品上下架

- **方法与路径**：`PATCH /admin/teas/{tea_id}/toggle`
- **权限**：管理员
- **路径参数**：`tea_id` integer，必填
- **请求体**：无（每次调用翻转当前 `is_active`）
- **成功响应**：HTTP 200，`code=0`

```json
{
  "code": 0,
  "message": "ok",
  "data": { "id": 1, "is_active": false, "updated_at": "2026-11-06T12:30:00Z" }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 非管理员 |
| 404 | 40400 | 茶品不存在 |

- **规则**：
  - 上架：恢复列表/搜索/推荐/详情可见；下架：前台全部隐藏，但用户清单保留条目并灰显（PRD FR-6.3）。
  - **不物理删除**茶品、不删除收藏、不重置 `favorite_count`、不删除图片。
  - 下架后旧详情链接返回 `40401`；分享视图返回 `is_available=false`；一键收藏跳过。
  - 写入 `operation_logs`：`action='toggle_tea'`，`detail` 含切换方向摘要。

#### 4.6.6 编辑官方小贴士

- **方法与路径**：`PUT /admin/teas/{tea_id}/tips`
- **权限**：管理员
- **路径参数**：`tea_id` integer，必填
- **请求体**（四个字段均可选、可为 `null`）：

| 字段 | 类型 | 必填 | 语义 |
|---|---|---|---|
| `tips_history` | string / null | 否 | 省略=保持原值；`null`/纯空白=清空该区块 |
| `tips_suitable` | string / null | 否 | 同上 |
| `tips_misconception` | string / null | 否 | 同上 |
| `tips_official_note` | string / null | 否 | 同上 |

- **请求示例**（只清空“冲泡误区”）：

```json
{ "tips_misconception": null }
```

- **成功响应**：HTTP 200，`code=0`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "tea_id": 1,
    "tips_history": "西湖龙井始于唐代……",
    "tips_suitable": "适合脾胃强健……",
    "tips_misconception": null,
    "tips_official_note": "采摘标准为一芽一叶……"
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | 字段类型非 string/null |
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 非管理员 |
| 404 | 40400 | 茶品不存在 |

- **规则**：
  - 四个区块可独立编辑/清空（PRD FR-6.4）；`tea_tips` 无行时按本次提交 upsert。
  - 清空后公开详情对应 `tips_*` 返回 `null`，前端隐藏该块。
  - 写入 `operation_logs`：`action='update_tea'`、`target_id=tea_id`、`detail` 标注 tips 更新。

#### 4.6.7 仪表盘统计

- **方法与路径**：`GET /admin/stats`
- **权限**：管理员
- **参数/请求体**：无
- **成功响应**：HTTP 200，`code=0`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "total_count": 6,
    "active_count": 6,
    "inactive_count": 0,
    "category_distribution": [
      { "category": "green", "count": 1 },
      { "category": "white", "count": 1 },
      { "category": "yellow", "count": 1 },
      { "category": "red", "count": 1 },
      { "category": "oolong", "count": 1 },
      { "category": "dark", "count": 1 }
    ]
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 非管理员 |

- **规则**：`category_distribution` 统计全部茶品（含下架），固定六项顺序，缺失补 0；数量与 `teas` 表一致。

#### 4.6.8 图片上传

- **方法与路径**：`POST /admin/upload`
- **权限**：管理员
- **请求格式**：`multipart/form-data`
- **表单字段**：

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `file` | binary | 是 | JPEG/PNG/WebP；≤5 MB；非空 |

- **请求示例（curl）**：

```bash
curl -X POST http://127.0.0.1:8000/api/v1/admin/upload \
  -b "tea_session=<cookie>" \
  -F "file=@/path/to/tea.jpg"
```

- **成功响应**：HTTP 200，`code=0`，`data` 为 `UploadResult`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "url": "/uploads/2026/11/8f3c2b1a4d5e6f708192a3b4c5d6e7f8.jpg",
    "original_filename": "tea.jpg",
    "size": 204800,
    "content_type": "image/jpeg"
  }
}
```

- **错误**：

| HTTP | code | 触发 |
|---|---|---|
| 400 | 40000 | `file` 缺失、空文件 |
| 401 | 40100 | 未登录/会话过期 |
| 403 | 40300 | 非管理员 |
| 413 | 41300 | 文件超过 5 MB |
| 415 | 41500 | 类型不在 JPEG/PNG/WebP，或魔数校验失败 |
| 500 | 50000 | 磁盘写入失败 |

- **规则**：
  - 文件名使用 UUID，扩展名由服务端 MIME 决定；不保留原文件名落盘。
  - 图片访问见 §1.9：同源 `GET /uploads/...`，无需认证。
  - 写入 `operation_logs`：`action='upload_image'`、`target_type='tea'`、`target_id=null`、`detail` 为文件名/大小摘要。
  - MVP 不提供图片删除接口，也不提供茶品删除接口。

---

## 5. 数据库字段与 API 字段对照

### 5.1 `users`

| 数据库列 | API 字段 | 出现位置 |
|---|---|---|
| `id` | `id` / 路径中的用户身份 | `User`、`/auth/me` |
| `username` | `username` | `User`、注册/登录 |
| `role` | `role` | `User`、权限判定 |
| `created_at` | `created_at` | `User` |
| `password_hash` | 不暴露 | — |

### 5.2 `teas`

| 数据库列 | API 字段 |
|---|---|
| `id` / `name` / `category` / `origin` / `season` | 同名 |
| `fermentation` / `price_range` / `representative_variety` | 同名 |
| `shape_desc` / `soup_desc` / `aroma_desc` / `taste_desc` | 同名 |
| `water_temp` / `tea_amount` / `brew_time` | 同名（number） |
| `main_image_url` | `main_image_url` |
| `is_active` | `is_active`（仅详情/后台列表）；前台列表用 `is_available` 派生 |
| `favorite_count` | `favorite_count`（缓存值，见 §1.10） |
| `created_at` / `updated_at` | 同名 |

### 5.3 `tea_tips`

| 数据库列 | API 字段 |
|---|---|
| `history` | `tips_history` |
| `suitable` | `tips_suitable` |
| `misconception` | `tips_misconception` |
| `official_note` | `tips_official_note` |
| `tea_id` | 不单独返回，隐含在所属茶品 |
| 无对应行 | 四个 `tips_*` 均为 `null` |

### 5.4 `collection_lists`

| 数据库列 | API 字段 |
|---|---|
| `id` | `ListData.id` |
| `user_id` | 不返回（由登录身份隐含） |
| `title` | `ListData.title`、分享 `title` |
| `created_at` / `updated_at` | 同名 |
| 可见性（无列） | 由 `share_tokens.is_active` 派生为 `ListData.share` |

### 5.5 `favorite_items`

| 数据库列 | API 字段 |
|---|---|
| `id` | 内部主键，不暴露 |
| `user_id` | 不返回 |
| `tea_id` | `ListItem.tea_id`、`FavoriteState.tea_id` |
| `tasting_note` | `ListItem.tasting_note`；分享视图不返回 |
| `created_at` | `ListItem.favorited_at`（语义化重命名） |

### 5.6 `share_tokens`

| 数据库列 | API 字段 |
|---|---|
| `id` / `list_id` | 不直接暴露 |
| `token` | `token`、路径参数 |
| `is_active` | 派生为 `revoked = !is_active` / 撤销响应 `is_active` |
| `revoked_at` | `revoked_at` |
| `created_at` | `created_at` |
| 复用判断 | `is_new`（派生） |

### 5.7 `operation_logs`

不对外暴露任何接口字段，仅由管理员写操作触发：

| `action` | 触发接口 |
|---|---|
| `create_tea` | `POST /admin/teas` |
| `update_tea` | `PUT /admin/teas/{tea_id}`、`PUT /admin/teas/{tea_id}/tips` |
| `toggle_tea` | `PATCH /admin/teas/{tea_id}/toggle` |
| `upload_image` | `POST /admin/upload` |

`target_type` 固定 `tea`；`target_id` 为弱引用（上传时为 `null`）；`detail` 仅存摘要，不存 JSON diff；不记录 GET 操作。

---

## 6. 一致性与实现注意事项

### 6.1 下架（软失效）在各接口的表现

| 接口 | 下架茶品行为 |
|---|---|
| `GET /teas`、`/teas/hot`、`/teas/random`、`/teas/categories`、`/teas/origins` | 完全过滤，不出现、不计数 |
| `GET /teas/{tea_id}` | `40401` 该茶品暂不可用 |
| `POST /favorites/{tea_id}` | `40401`，不可新增收藏 |
| `DELETE /favorites/{tea_id}`、`GET /favorites/{tea_id}/status` | 正常处理（允许从清单移除/查询） |
| `GET /lists` | 条目保留，`is_available=false`，前端灰显 |
| `GET /shares/{token}` | 条目保留，`is_available=false` |
| `POST /shares/{token}/copy` | 跳过，计入 `skipped` |
| `GET /admin/teas`、`GET /admin/teas/{tea_id}` | 正常展示，可编辑/重新上架 |

### 6.2 分享令牌生命周期

1. 首次生成：无生效令牌 → 新建 8 位短码，写入 `share_tokens`。
2. 重复生成：存在 `is_active=1` → 复用同一 token，`is_new=false`。
3. 撤销：`is_active=0` + `revoked_at=now`，行保留。
4. 再次分享：已撤销令牌不复活，必须新建 token。
5. 访问：token 不存在 → `40410`；存在但已撤销 → HTTP 200 + `revoked=true`；有效 → 只读清单。
6. 安全：token 大小写敏感（`utf8mb4_bin`），不做大小写归一；短码全局唯一。

### 6.3 审计留痕

- 仅管理员写操作记录 1 行，读操作不记录。
- `user_id` 可为空（账号删除后 `SET NULL`），审计不随账号消失。
- `target_id` 不建外键，避免删茶/下架影响历史日志。
- MVP 不提供日志查询接口；如需排查，直接查询 `operation_logs` 表。

### 6.4 契约与既有脚手架的差异（落地时以此为准）

| 项 | 脚手架现状 | 本契约 |
|---|---|---|
| 用户主键字段 | 注册返回 `user_id` | 统一为 `id`（与 `users.id` 一致） |
| 产地筛选 | 对完整 `teas.origin` 做等值匹配 | 省级前缀匹配；`/teas/origins` 返回省级 |
| 管理员更新小贴士 | 无独立接口 | 新增 `PUT /admin/teas/{tea_id}/tips` |
| 管理员茶品详情 | 无独立接口 | 新增 `GET /admin/teas/{tea_id}` |
| 清单条目移除 | 规划过 `DELETE /lists/{tea_id}` | 统一使用 `DELETE /favorites/{tea_id}` |
| 422 校验错误 | FastAPI 默认结构 | 统一重映射为 `400 + 40000` |

### 6.5 PRD 功能对照

| PRD | 接口 |
|---|---|
| FR-1.1–FR-1.6 筛选/排序/分页 | `GET /teas`（默认 `page_size=12`） |
| FR-2.1 六大茶类入口 | `GET /teas/categories` |
| FR-2.2 热门推荐 | `GET /teas/hot`（前 8） |
| FR-2.3 随机发现 | `GET /teas/random` |
| FR-2.4 搜索 | `GET /teas?keyword=` |
| FR-3.1/3.2 详情与小贴士 | `GET /teas/{tea_id}` |
| FR-4.1 注册 + 实时唯一校验 | `POST /auth/register`、`GET /auth/username-availability` |
| FR-4.2 登录 | `POST /auth/login` |
| FR-4.3 30 天会话 | HttpOnly Cookie `tea_session` |
| FR-5.1 收藏/取消 | `POST/DELETE /favorites/{tea_id}` |
| FR-5.2 清单页与标题 | `GET /lists`、`PUT /lists/title` |
| FR-5.3 品鉴笔记 | `PUT /lists/notes/{tea_id}` |
| FR-5.4 生成分享 | `POST /shares/generate`、`GET /shares/{token}` |
| FR-5.5 撤销分享 | `POST /shares/revoke/{token}` |
| FR-5.6 一键收藏全部 | `POST /shares/{token}/copy` |
| FR-6.1 新增茶品 | `POST /admin/teas` |
| FR-6.2 编辑茶品 | `PUT /admin/teas/{tea_id}` |
| FR-6.3 上下架 | `PATCH /admin/teas/{tea_id}/toggle` |
| FR-6.4 官方小贴士 | `PUT /admin/teas/{tea_id}/tips` |
| 管理员数据维护支撑 | `GET /admin/teas`、`GET /admin/stats`、`POST /admin/upload` |

---

## 7. 变更记录

| 版本 | 日期 | 内容 |
|---|---|---|
| **v1.0** | 2026-11-06 | 首版 API 契约：统一 `/api/v1` 前缀、`{code,message,data}` 响应、PageSize 默认 12、HttpOnly Cookie 会话、ISO8601 UTC、图片上传与静态访问、收藏计数缓存语义；覆盖 29 个 MVP 业务接口 |
