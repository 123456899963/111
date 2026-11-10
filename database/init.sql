-- ============================================================
-- 茶·图鉴 —— 数据库初始化脚本（MySQL 5.7.19+）
-- 依据：docs/architecture/DATA_MODEL.md v1.0
-- 范围：MVP 9 张表 + S10–S13 贡献 2 张表（共 11 张） + 索引 + 最少种子数据
-- 编码：UTF-8（无 BOM） / 字符集 utf8mb4 / 排序规则 utf8mb4_unicode_ci
--
-- 使用方式（在 MySQL 客户端中执行）：
--   mysql -u root -p < database/init.sql
--
-- 注意：
--   1. 脚本不包含 DROP TABLE，重复执行会在建表阶段报错，避免误删已有数据。
--      如需重建，请手动删除数据库后再执行。
--   2. 种子数据中的 favorite_count 为演示热度值，并非由 favorite_items 推导，
--      正式运营数据以收藏操作维护（详见 DATA_MODEL.md §6）。
--   3. 管理员初始账号：admin / admin123（bcrypt cost=10），上线前必须修改密码。
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS tea_guide
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tea_guide;

-- ------------------------------------------------------------
-- 1. users —— 用户账号（PRD §4.3 / FR-4.1 / FR-4.2）
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  username      VARCHAR(32)       NOT NULL                COMMENT '用户名，3-20 字符，中文/英文/数字',
  password_hash VARCHAR(255)      NOT NULL                COMMENT 'bcrypt 哈希（60 字符）',
  role          ENUM('user','admin') NOT NULL DEFAULT 'user' COMMENT '角色：user 注册用户 / admin 管理员',
  created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '用户账号与角色（PRD §3.1 / §4.3）';

-- ------------------------------------------------------------
-- 2. teas —— 茶品图鉴卡片（PRD §4.1 / FR-1.x / FR-2.x / FR-6.x）
-- 索引说明：不建 name 单列索引（关键词为 LIKE '%词%' 前置通配，无法命中 B-tree）
-- ------------------------------------------------------------
CREATE TABLE teas (
  id                     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name                   VARCHAR(100)  NOT NULL               COMMENT '茶品名称',
  category               ENUM('green','white','yellow','red','oolong','dark') NOT NULL
                                                               COMMENT '六大茶类',
  origin                 VARCHAR(200)  NOT NULL               COMMENT '产地：省级 + 产区，如 浙江 杭州 西湖狮峰',
  season                 ENUM('明前','雨前','春茶','夏茶','秋茶','冬茶') DEFAULT NULL
                                                               COMMENT '采摘季节（选填）',
  fermentation           ENUM('不发酵','微发酵','半发酵','全发酵','后发酵') DEFAULT NULL
                                                               COMMENT '发酵程度（选填）',
  price_range            VARCHAR(32)   DEFAULT NULL           COMMENT '价格区间（选填，文案未定稿，应用层校验）',
  price_min              INT UNSIGNED  DEFAULT NULL           COMMENT '价格下限（元/斤，S2 五档筛选）',
  price_max              INT UNSIGNED  DEFAULT NULL           COMMENT '价格上限（元/斤，S2 五档筛选）',
  representative_variety VARCHAR(100)  DEFAULT NULL           COMMENT '代表品类（选填）',
  shape_desc             TEXT          NOT NULL               COMMENT '外形描述（必填）',
  soup_desc              TEXT          NOT NULL               COMMENT '汤色描述（必填）',
  aroma_desc             TEXT          NOT NULL               COMMENT '香气描述（必填）',
  taste_desc             TEXT          NOT NULL               COMMENT '滋味描述（必填）',
  water_temp             DECIMAL(4,1)  DEFAULT NULL           COMMENT '冲泡水温（摄氏度，70-100）',
  tea_amount             DECIMAL(4,1)  DEFAULT NULL           COMMENT '投茶量（克）',
  brew_time              DECIMAL(4,1)  DEFAULT NULL           COMMENT '浸泡时间（秒）',
  main_image_url         VARCHAR(500)  DEFAULT NULL           COMMENT '主图 URL（PRD 必填，应用层强制）',
  video_url              VARCHAR(500)  DEFAULT NULL           COMMENT '视频介绍 mp4 同源 URL（S5，ADR-0003；≤3 分钟 ≤50MB，应用层校验）',
  video_duration         INT UNSIGNED  DEFAULT NULL           COMMENT '视频时长（秒，≤180，应用层校验）',
  is_active              TINYINT(1)    NOT NULL DEFAULT 1     COMMENT '1 上架 / 0 下架（FR-6.3）',
  favorite_count         INT UNSIGNED  NOT NULL DEFAULT 0     COMMENT '冗余收藏计数（排序与卡片展示）',
  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_teas_active_category (is_active, category),
  KEY idx_teas_active_created  (is_active, created_at),
  KEY idx_teas_active_favorite (is_active, favorite_count)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '茶品图鉴卡片（PRD §4.1）';

-- ------------------------------------------------------------
-- 3. tea_tips —— 官方小贴士（PRD §4.1 小贴士区 / FR-6.4）
-- ------------------------------------------------------------
CREATE TABLE tea_tips (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tea_id         INT UNSIGNED NOT NULL,
  history        TEXT         DEFAULT NULL COMMENT '历史典故（空则前端隐藏）',
  suitable       TEXT         DEFAULT NULL COMMENT '适合人群（空则前端隐藏）',
  misconception  TEXT         DEFAULT NULL COMMENT '冲泡误区（空则前端隐藏）',
  official_note  TEXT         DEFAULT NULL COMMENT '品鉴笔记（官方，空则前端隐藏）',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tea_tips_tea_id (tea_id),
  CONSTRAINT fk_tea_tips_tea FOREIGN KEY (tea_id) REFERENCES teas (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '官方小贴士，与茶品 1:1（FR-6.4）';

-- ------------------------------------------------------------
-- 3.1 tea_media —— 茶品图片集（PRD S4 / ADR-0003）
-- 1:N 关联；物理删除（不做软失效），随茶品级联；上限 9 张由应用层校验
-- ------------------------------------------------------------
CREATE TABLE tea_media (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tea_id      INT UNSIGNED NOT NULL,
  image_url   VARCHAR(500) NOT NULL                COMMENT '图片 URL（同源 /uploads/...）',
  sort_order  INT          NOT NULL DEFAULT 0      COMMENT '展示顺序，ASC',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tea_media_tea (tea_id, sort_order),
  CONSTRAINT fk_tea_media_tea FOREIGN KEY (tea_id) REFERENCES teas (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '茶品图片集（PRD S4，ADR-0003；物理删除，上限 9 张由应用层校验）';

-- ------------------------------------------------------------
-- 4. collection_lists —— 用户收藏清单（PRD §4.2 / FR-5.1 / FR-5.2，S9 多清单）
-- 每用户仅一个默认清单：默认行 is_default=1，普通行 is_default=NULL
-- UNIQUE(user_id, is_default) 依赖 MySQL 唯一索引允许多个 NULL
-- 可见性不落列，由 share_tokens.is_active 派生
-- ------------------------------------------------------------
CREATE TABLE collection_lists (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(50)  NOT NULL DEFAULT '我的收藏' COMMENT '清单标题，可编辑（FR-5.2）',
  is_default  TINYINT(1)   DEFAULT NULL COMMENT '1=默认清单；NULL=普通清单（S9）',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_list_user_default (user_id, is_default),
  KEY idx_list_user (user_id),
  CONSTRAINT fk_list_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '用户收藏清单，每用户一个默认 + 最多 9 个普通（PRD §4.2 / S9）';

-- ------------------------------------------------------------
-- 5. favorite_items —— 收藏条目 + 品鉴笔记（PRD §4.2 / FR-5.1/5.2/5.3/5.6）
-- 清单归属以 list_id 为准；user_id 冗余用于跨清单去重与统计（S9）
-- 同一茶品可存在于多个清单，但 teas.favorite_count 只计 1 次
-- ------------------------------------------------------------
CREATE TABLE favorite_items (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  list_id       INT UNSIGNED NOT NULL COMMENT '所属清单（S9）',
  user_id       INT UNSIGNED NOT NULL,
  tea_id        INT UNSIGNED NOT NULL,
  tasting_note  TEXT         DEFAULT NULL COMMENT '品鉴笔记（私有，PRD FR-5.3）',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_favorite_list_tea (list_id, tea_id),
  KEY idx_favorite_list_created (list_id, created_at),
  KEY idx_favorite_user_created (user_id, created_at),
  KEY idx_favorite_tea (tea_id),
  KEY idx_favorite_created_tea (created_at, tea_id),
  CONSTRAINT fk_favorite_list FOREIGN KEY (list_id) REFERENCES collection_lists (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favorite_tea FOREIGN KEY (tea_id) REFERENCES teas (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '收藏条目：清单-茶关联 + 私有品鉴笔记（PRD §4.2）';

-- ------------------------------------------------------------
-- 6. share_tokens —— 分享令牌（PRD FR-5.4 / FR-5.5）
-- 撤销为软失效：is_active = 0 + revoked_at，行永久保留
-- token 使用 utf8mb4_bin：大小写敏感，防止 k7X9m2 / K7X9M2 被视为同一令牌
-- ------------------------------------------------------------
CREATE TABLE share_tokens (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  list_id     INT UNSIGNED NOT NULL,
  token       VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
                                                COMMENT '短码，大小写敏感',
  is_active   TINYINT(1)   NOT NULL DEFAULT 1   COMMENT '1 有效 / 0 已撤销',
  revoked_at  DATETIME     DEFAULT NULL         COMMENT '撤销时间（撤销不可逆）',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_share_token (token),
  KEY idx_share_list_active (list_id, is_active),
  CONSTRAINT fk_share_list FOREIGN KEY (list_id) REFERENCES collection_lists (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '清单分享令牌，撤销后永久保留（FR-5.4 / FR-5.5）';

-- ------------------------------------------------------------
-- 7. operation_logs —— 管理员写操作留痕（模块 6，最小字段集）
-- user_id 采用 SET NULL：审计记录不随账号删除而消失
-- 不建 target_id 外键：删茶不应抹掉历史日志
-- ------------------------------------------------------------
CREATE TABLE operation_logs (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED DEFAULT NULL COMMENT '操作人（账号删除后置空）',
  action       VARCHAR(32)  NOT NULL     COMMENT 'create_tea / update_tea / toggle_tea / upload_image',
  target_type  VARCHAR(32)  NOT NULL DEFAULT 'tea' COMMENT '目标类型，MVP 仅 tea',
  target_id    INT UNSIGNED DEFAULT NULL COMMENT '目标主键（弱引用，不建外键）',
  detail       VARCHAR(500) DEFAULT NULL COMMENT '操作摘要（可选，不存 JSON diff）',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_oplog_created (created_at),
  KEY idx_oplog_user (user_id),
  CONSTRAINT fk_oplog_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '管理员写操作审计日志（MVP 最小留痕）';

-- ------------------------------------------------------------
-- 8. login_attempts —— 登录失败记录（S14，批次二 / 迁移 0004）
-- 只记录失败事件，不记录密码明文；24 小时后由登录流程清理
-- 用户名与 IP 双维度窗口计数，任一达到阈值即锁定
-- ------------------------------------------------------------
CREATE TABLE login_attempts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username   VARCHAR(32)  NOT NULL COMMENT '失败尝试的用户名（含不存在的用户名）',
  ip         VARCHAR(45)  NOT NULL COMMENT '客户端 IP（兼容 IPv6）',
  failed_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '失败时间',
  PRIMARY KEY (id),
  KEY idx_login_attempt_username (username, failed_at),
  KEY idx_login_attempt_ip (ip, failed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '登录失败尝试（S14 锁定依据）';

-- ------------------------------------------------------------
-- 9. tea_name_category_map —— 名品-茶类映射（S10 第一层校验 / 迁移 0006）
-- 命中名称时强校验用户提交的茶类；未命中由管理员人工审核
-- ------------------------------------------------------------
CREATE TABLE tea_name_category_map (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name      VARCHAR(100) NOT NULL COMMENT '名品名称',
  category  ENUM('green','white','yellow','red','oolong','dark') NOT NULL COMMENT '应有茶类',
  PRIMARY KEY (id),
  UNIQUE KEY uk_name_category_name (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '名品-茶类映射（S10 第一层校验）';

-- ------------------------------------------------------------
-- 10. contributions —— 用户贡献提交与审核状态（S10–S13 / 迁移 0006）
-- payload 为 JSON：new_tea 存茶品字段，article 存 {title, content}
-- 状态单向流转 pending → approved / rejected；记录不物理删除
-- ------------------------------------------------------------
CREATE TABLE contributions (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  type           ENUM('new_tea','article') NOT NULL COMMENT '提交类型',
  target_tea_id  INT UNSIGNED DEFAULT NULL COMMENT '科普投稿目标茶品（new_tea 为 NULL）',
  payload        JSON         NOT NULL COMMENT '结构化提交内容',
  status         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reject_reason  VARCHAR(200) DEFAULT NULL COMMENT '拒绝理由（仅 rejected）',
  reviewer_id    INT UNSIGNED DEFAULT NULL COMMENT '审核管理员',
  reviewed_at    DATETIME     DEFAULT NULL COMMENT '审核时间',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contrib_user_status (user_id, status),
  KEY idx_contrib_status_created (status, created_at),
  CONSTRAINT fk_contrib_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_contrib_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_contrib_tea FOREIGN KEY (target_tea_id) REFERENCES teas (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '用户贡献提交与审核状态（S10–S13）';

-- ============================================================
-- 种子数据
-- ============================================================

-- 管理员初始账号（admin / admin123，bcrypt cost=10）
INSERT INTO users (id, username, password_hash, role, created_at) VALUES
  (1, 'admin', '$2b$10$h5mOeEvNxv9pWjkpSkGHheXyDQ9pHPtsjT.nsYjjnk.QKukuo9EH.', 'admin', UTC_TIMESTAMP());

-- 六款示例茶品：覆盖六大茶类各一款（数据取自原型 mock，主图使用外链 CDN）
INSERT INTO teas
  (id, name, category, origin, season, fermentation, price_range, representative_variety,
   shape_desc, soup_desc, aroma_desc, taste_desc,
   water_temp, tea_amount, brew_time, main_image_url, is_active, favorite_count)
VALUES
  (1, '西湖龙井', 'green', '浙江 杭州 西湖狮峰', '明前', '不发酵', NULL, '群体种',
   '扁平光滑，色翠略黄，形似雀舌',
   '嫩绿明亮，清澈见底',
   '豆香清雅，热香馥郁，冷香幽兰',
   '鲜爽甘醇，回甘明显，有淡淡的板栗香',
   85, 3, 90,
   'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=400&fit=crop', 1, 2480),

  (2, '白毫银针', 'white', '福建 福鼎', '明前', '微发酵', NULL, '福鼎大白茶',
   '芽头肥壮，满披白毫，色白如银',
   '浅杏黄色，清澈透亮',
   '毫香显著，有清甜味',
   '清淡回甘，毫味足，有特殊的"香韵"',
   90, 3, 120,
   'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&h=400&fit=crop', 1, 1280),

  (3, '君山银针', 'yellow', '湖南 岳阳 君山', '春茶', '微发酵', NULL, NULL,
   '芽头肥壮，紧实挺直，芽尖金黄',
   '杏黄明亮，冲泡后芽尖竖立',
   '清香高长',
   '鲜爽甘醇',
   90, 3, 120,
   'https://images.unsplash.com/photo-1627435360136-ec5c3c36e4a0?w=600&h=400&fit=crop', 1, 890),

  (4, '正山小种', 'red', '福建 武夷山 桐木关', '春茶', '全发酵', NULL, NULL,
   '条索紧结，乌黑油润',
   '红艳明亮',
   '松烟香 + 桂圆香（传统工艺）',
   '醇厚甘爽，有独特的松烟味',
   100, 5, 180,
   'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=600&h=400&fit=crop', 1, 1980),

  (5, '大红袍', 'oolong', '福建 武夷山 九龙窠', '春茶', '半发酵', NULL, NULL,
   '条索紧结，色泽绿褐鲜润',
   '橙黄明亮',
   '馥郁兰花香 + 岩骨花香',
   '醇厚回甘，有明显的"岩韵"，七泡有余香',
   100, 7, 30,
   'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&h=400&fit=crop', 1, 3120),

  (6, '普洱熟茶', 'dark', '云南 昆明', NULL, '后发酵', NULL, NULL,
   '条索紧结，色泽红褐',
   '红浓明亮，有"金圈"',
   '陈香、枣香、木香',
   '醇厚顺滑，几乎无苦涩，回甘明显',
   100, 8, 30,
   'https://images.unsplash.com/photo-1571346451091-e8c524a1b998?w=600&h=400&fit=crop', 1, 2180);

-- 官方小贴士：未写的区块留 NULL（前端按 FR-6.4 隐藏）
INSERT INTO tea_tips (tea_id, history, suitable, misconception, official_note) VALUES
  (1,
   '西湖龙井始于唐代，是中国十大名茶之首，狮峰产区为核心原产地。',
   '适合脾胃强健、喜鲜爽口感的茶友；春季饮用尤佳。',
   '水温不宜过高，85℃即可，沸水会烫熟嫩芽导致苦涩。',
   '采摘标准为一芽一叶或一芽二叶初展，炒制工艺独特，有"抖、挺、扣、抓、压、磨"十大手法。'),

  (2,
   '白毫银针是白茶中的极品，全部由芽头制成，每公斤约需 2.5 万个芽头。',
   '适合胃寒人群，白茶性温，有养胃之效。',
   NULL,
   '白茶是"一年茶，三年药，七年宝"，陈化后价值倍增。'),

  (3,
   '君山银针与白毫银针齐名，但属于黄茶类，核心区别是黄茶经过焖黄工艺。',
   NULL, NULL, NULL),

  (4,
   '正山小种是世界红茶的鼻祖，由福建武夷山桐木关茶农发明，17 世纪传入欧洲。',
   '适合冬日暖饮，也适合调饮奶茶。',
   '正山小种的松烟香是传统工艺特征，不是"烟味"或品质问题。',
   NULL),

  (5,
   '大红袍是武夷山岩茶之王，母树仅存 6 株，已有 350 多年历史。',
   '适合有一定品茶经验的茶友，岩韵需要细细品味。',
   NULL,
   '岩茶讲究"岩韵"——岩骨花香，醇厚回甘，是乌龙茶中最有"风骨"的品类。'),

  (6,
   NULL,
   '熟茶性温，适合大多数人群，尤其是胃寒或晚上想喝茶的茶友。',
   '熟茶发酵工艺 1973 年才发明，历史远短于生茶，但因其温和的口感迅速流行。',
   NULL);

-- 名品-茶类映射（S10 第一层校验）：用户提交新茶时命中名称须与茶类一致
INSERT INTO tea_name_category_map (name, category) VALUES
  ('西湖龙井', 'green'), ('碧螺春', 'green'), ('黄山毛峰', 'green'),
  ('六安瓜片', 'green'), ('信阳毛尖', 'green'),
  ('白毫银针', 'white'), ('白牡丹', 'white'), ('寿眉', 'white'),
  ('君山银针', 'yellow'), ('蒙顶黄芽', 'yellow'),
  ('正山小种', 'red'), ('金骏眉', 'red'), ('祁门红茶', 'red'), ('滇红', 'red'),
  ('大红袍', 'oolong'), ('铁观音', 'oolong'), ('武夷岩茶', 'oolong'), ('凤凰单丛', 'oolong'),
  ('普洱熟茶', 'dark'), ('普洱生茶', 'dark'), ('安化黑茶', 'dark'), ('六堡茶', 'dark');

-- ------------------------------------------------------------
-- 11. content_types —— 内容板块分类（批次五 R1–R5 / 迁移 0007）
-- ------------------------------------------------------------
CREATE TABLE content_types (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(32)  NOT NULL,
  name          VARCHAR(50)  NOT NULL,
  icon          VARCHAR(32)  NULL,
  description   VARCHAR(200) NULL,
  sort_order    INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_content_types_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容板块分类（批次五 R1–R5）';

-- 12. content_items —— 统一内容条目（批次五 R1–R5 / 迁移 0007）
--     meta JSON 承载各板块特有字段：
--       teaware:   material / volume / category
--       origin:    province / region
--       culture:   era / tags
--       brand:     founded / brand_origin / website
--       knowledge: subtype / difficulty
-- ------------------------------------------------------------
CREATE TABLE content_items (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type_id       INT UNSIGNED NOT NULL,
  title         VARCHAR(200) NOT NULL,
  summary       VARCHAR(500) NULL,
  body          TEXT         NULL,
  cover_image   VARCHAR(500) NULL,
  meta          JSON         NULL,
  sort_order    INT          NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_content_items_type FOREIGN KEY (type_id) REFERENCES content_types(id) ON DELETE CASCADE,
  KEY idx_content_items_type_active_sort (type_id, is_active, sort_order),
  KEY idx_content_items_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='统一内容条目（批次五 R1–R5；meta 为各板块特有 JSON 字段）';

-- ------------------------------------------------------------
-- 批次五种子数据
-- ------------------------------------------------------------

-- 5 个板块分类
INSERT INTO content_types (code, name, icon, description, sort_order) VALUES
  ('teaware',  '茶具茶器', '🫖', '盖碗、茶壶、品茗杯、公道杯等茶器文化与选择指南', 1),
  ('origin',   '茶叶产地', '🗺️', '中国主要产茶区地理环境、风土特色与名茶产地溯源', 2),
  ('culture',  '茶叶文化', '📜', '茶的历史演变、文人茶事、茶道精神与传统礼仪', 3),
  ('brand',    '茶叶品牌', '🏷️', '中华老字号茶企与现代茶品牌故事', 4),
  ('knowledge','茶叶知识', '📚', '茶叶标准、分类原理、冲泡技巧与品鉴知识', 5);
