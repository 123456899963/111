# 茶·图鉴 —— 六大茶类结构化知识库平台

[English Version](#english)

---

## 项目简介

茶·图鉴是一个专注于中国六大茶类（绿茶、白茶、黄茶、青茶、红茶、黑茶）的结构化知识库平台，旨在为茶文化爱好者提供系统、全面、易用的茶叶信息检索与学习工具。

### 核心目标

- 构建完整的六大茶类知识体系
- 提供便捷的茶叶信息检索与筛选功能
- 支持用户收藏与品鉴笔记记录
- 打造茶文化科普与交流社区

---

## 功能模块

### MVP（第一版核心功能）

| 模块 | 功能描述 |
|------|----------|
| **首页** | 展示热门茶品、推荐内容、科普小贴士 |
| **茶品列表页** | 支持按茶类、产地、年份等多维度筛选 |
| **茶品详情页** | 展示茶叶的详细信息、图片、口感描述 |
| **注册登录** | 用户账户系统，支持收藏功能 |
| **收藏清单** | 用户收藏的茶品列表，支持品鉴笔记 |
| **分享功能** | 茶品链接分享 |
| **管理员后台** | 数据维护与管理 |

### 第二阶段功能（规划中）

- 列表页 OR 条件切换
- 筛选维度扩展
- 详情页图片集与视频
- 相关推荐算法
- 分享图片海报
- 多清单管理
- 用户贡献系统（补充新茶、投稿科普）
- 管理员审核后台
- 个性化推荐与热门推荐算法

---

## 茶叶图鉴卡片字段

### 必填字段

- 茶类（六大茶类之一）
- 茶叶名称
- 产地
- 工艺描述
- 干茶形态
- 茶汤色泽
- 口感描述
- 冲泡建议

### 选填字段

- 年份
- 等级
- 品牌
- 参考价格
- 存储建议
- 功效特点

### 小贴士区

官方发布的科普知识、品牌故事等扩展内容

---

## 技术栈（规划）

- **前端**: Vue.js / React（待定）
- **后端**: Node.js / Python（待定）
- **数据库**: MySQL / PostgreSQL（待定）
- **部署**: Docker / 云服务（待定）

---

## 项目结构

```
project_2/
├── specs/
│   └── prd.md          # 产品需求文档
├── docs/               # 文档目录（规划）
├── frontend/           # 前端代码（规划）
├── backend/            # 后端代码（规划）
└── README.md           # 项目说明文件
```

---

## 角色与权限

| 角色 | 权限描述 |
|------|----------|
| **普通用户** | 浏览茶品、收藏、添加笔记、分享 |
| **管理员** | 数据维护、审核内容、用户管理 |
| **游客** | 浏览公开内容 |

---

## 许可证

本项目为内部产品需求文档，具体许可证请参考后续相关文件。

---

## 贡献指南

欢迎提交 Issue 或 Pull Request 来改进本项目。

---

## 联系方式

如有问题，请提交 Issue 或联系项目维护者。

---

## English

### Tea Guide - Structured Knowledge Base for Six Major Tea Categories

This is a product requirements document (PRD) for a tea encyclopedia platform focusing on China's six major tea types: Green Tea, White Tea, Yellow Tea, Oolong Tea, Black Tea, and Dark Tea.

### Key Features (MVP)

- Tea product listing with filters
- Detailed tea information pages
- User registration and authentication
- Favorites collection with tasting notes
- Sharing functionality
- Admin dashboard for data management

---

*文档版本: 1.0*  
*最后更新: 2024*