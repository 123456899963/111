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
4. 重要技术决策同时产出 [ADR](../docs/development/ADR/README.md)，build-log 只留一行引用，不重复论证过程。
5. 不记录密码、Cookie 值、密钥、完整堆栈、`.env` 内容。
6. 遗留问题必须可执行（写清"谁在什么条件下补什么"），不写"后续优化"这类空话。

## 2. 条目模板（复制使用）

```markdown
## YYYY-MM-DD｜<任务名>

- 任务卡 / 分级：A / B / C（C 类注明"用户确认于 <日期/方式>"）
- 需求来源：<PRD §x / API 端点 / S-xx / 用例 ID / PAGE_SPECS>
- 主要变更：
  - `<文件>`：<要点>
  - `<文件>`：<要点>
- 契约 / 数据 / 安全影响：无 / <端点、字段、表、S 项变更 + 已同步文档与迁移文件>
- 测试证据：

  | 命令 | 范围 | 结果 | 说明 |
  |---|---|---|---|
  | `pytest backend/tests -k "AUTH-01"` | AUTH-01 | 1 passed | —— |
  | `pnpm vitest run src/utils/filter.spec.ts` | 前端筛选 | 未运行 | 本节无前端改动 |

- 验收结论：通过 / 有条件通过（写明遗留）/ 不通过
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
