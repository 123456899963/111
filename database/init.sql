-- ============================================================
-- 茶·图鉴 —— 数据库初始化脚本（MySQL 5.7.19+）
-- 依据：docs/architecture/DATA_MODEL.md v1.0
-- 范围：MVP 7 张表 + 索引 + 最少种子数据
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
  representative_variety VARCHAR(100)  DEFAULT NULL           COMMENT '代表品类（选填）',
  shape_desc             TEXT          NOT NULL               COMMENT '外形描述（必填）',
  soup_desc              TEXT          NOT NULL               COMMENT '汤色描述（必填）',
  aroma_desc             TEXT          NOT NULL               COMMENT '香气描述（必填）',
  taste_desc             TEXT          NOT NULL               COMMENT '滋味描述（必填）',
  water_temp             DECIMAL(4,1)  DEFAULT NULL           COMMENT '冲泡水温（摄氏度，70-100）',
  tea_amount             DECIMAL(4,1)  DEFAULT NULL           COMMENT '投茶量（克）',
  brew_time              DECIMAL(4,1)  DEFAULT NULL           COMMENT '浸泡时间（秒）',
  main_image_url         VARCHAR(500)  DEFAULT NULL           COMMENT '主图 URL（PRD 必填，应用层强制）',
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
  PRIMARY KEY (id),
  UNIQUE KEY uk_tea_tips_tea_id (tea_id),
  CONSTRAINT fk_tea_tips_tea FOREIGN KEY (tea_id) REFERENCES teas (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '官方小贴士，与茶品 1:1（FR-6.4）';

-- ------------------------------------------------------------
-- 4. collection_lists —— 用户默认清单（PRD §4.2 / FR-5.1 / FR-5.2）
-- MVP 一人一清单：UNIQUE(user_id) 固化
-- 可见性不落列，由 share_tokens.is_active 派生
-- ------------------------------------------------------------
CREATE TABLE collection_lists (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(50)  NOT NULL DEFAULT '我的收藏' COMMENT '清单标题，可编辑（FR-5.2）',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_list_user (user_id),
  CONSTRAINT fk_list_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '用户默认收藏清单，MVP 一人一个（PRD §4.2）';

-- ------------------------------------------------------------
-- 5. favorite_items —— 收藏条目 + 品鉴笔记（PRD §4.2 / FR-5.1/5.2/5.3/5.6）
-- 保留 user_id 代理清单归属（MVP 单清单），不额外挂 list_id
-- ------------------------------------------------------------
CREATE TABLE favorite_items (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  tea_id        INT UNSIGNED NOT NULL,
  tasting_note  TEXT         DEFAULT NULL COMMENT '品鉴笔记（私有，PRD FR-5.3）',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_favorite_user_tea (user_id, tea_id),
  KEY idx_favorite_user_created (user_id, created_at),
  KEY idx_favorite_tea (tea_id),
  CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favorite_tea FOREIGN KEY (tea_id) REFERENCES teas (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '收藏条目：用户-茶关联 + 私有品鉴笔记（PRD §4.2）';

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
