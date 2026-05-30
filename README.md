# BOMMaster - BOM管理系统

<div align="center">

![BOMMaster](https://img.shields.io/badge/BOMMaster-v1.0.0-blue)
![Vue](https://img.shields.io/badge/Vue-3.4-green)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange)
![Rust](https://img.shields.io/badge/Rust-1.70+-brown)
![License](https://img.shields.io/badge/License-MIT-green)

**一款专为硬件工程团队设计的轻量级桌面BOM管理系统**

[![GitHub stars](https://img.shields.io/github/stars/lcad101/BOM-?style=social)](https://github.com/lcad101/BOM-)
[![GitHub forks](https://img.shields.io/github/forks/lcad101/BOM-?style=social)](https://github.com/lcad101/BOM-)

</div>

---

## 目录

- [功能特性](#功能特性)
- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [开发环境](#开发环境)
- [使用说明](#使用说明)
- [项目结构](#项目结构)
- [常用命令](#常用命令)
- [文档链接](#文档链接)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 功能特性

### 核心功能

| 功能 | 说明 | 状态 |
|------|------|------|
| **多层级BOM管理** | 支持10级深度的树状BOM结构，可视化展示PCBA-单板-元器件关系 | ✅ |
| **BOM版本管理** | 自动版本控制，支持版本对比、历史回溯、版本派生 | ✅ |
| **替代料管理** | 元器件替代方案追踪，验证状态管理，一键提升替代料 | ✅ |
| **Excel导入导出** | 支持Excel文件导入（含字段映射）、多种格式导出 | ✅ |
| **项目管理** | 创建/归档项目，项目搜索排序，多项目支持 | ✅ |
| **高级搜索** | 跨项目元器件搜索，按型号/厂商/类别筛选 | ✅ |
| **变更历史** | 完整操作记录，支持按时间/类型/操作人筛选 | ✅ |
| **BOM对比** | 两个BOM版本并排对比，差异高亮显示 | ✅ |

### 技术亮点

- **轻量级**：基于Tauri v2，安装包<20MB
- **高性能**：Rust后端，1000节点BOM树加载<1秒
- **离线支持**：本地SQLite数据库，无需网络连接
- **类型安全**：TypeScript + Rust，编译时错误检查
- **现代化UI**：Vue 3 + Element Plus，响应式设计

---

## 系统要求

### 运行环境

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10 (1809+) / Windows 11 |
| 屏幕分辨率 | 最低1366x768，推荐1920x1080 |
| 磁盘空间 | 100MB（安装）+ 数据空间 |
| WebView2 | Windows 11内置，Windows 10需安装 |

### 开发环境

| 依赖 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 18.x LTS | 20.x LTS |
| Rust | 1.70 | 1.75+ |
| pnpm | 8.x | 最新 |

---

## 快速开始

### 下载安装

1. 访问 [Releases页面](https://github.com/lcad101/BOM-/releases)
2. 下载最新的安装包（`.msi` 或 `.exe`）
3. 运行安装程序，按照提示完成安装
4. 启动 BOMMaster

### 从源码构建

```bash
# 1. 克隆仓库
git clone https://github.com/lcad101/BOM-.git
cd BOM-/code

# 2. 安装依赖
pnpm install

# 3. 初始化数据库
npx prisma generate
npx prisma db push

# 4. 启动开发模式
pnpm tauri dev

# 5. 构建生产版本
pnpm tauri build
```

---

## 开发环境

### 环境安装

#### Windows 环境

```powershell
# 安装 Node.js（推荐使用 nvm-windows）
# 下载: https://github.com/coreybutler/nvm-windows/releases
nvm install 20
nvm use 20

# 安装 Rust
# 下载: https://rustup.rs/
winget install Rustlang.Rustup

# 安装 pnpm
npm install -g pnpm
```

#### 验证安装

```bash
node --version    # 应显示 v20.x.x
rustc --version   # 应显示 1.7x.0
pnpm --version    # 应显示 8.x.x
```

### 项目初始化

```bash
# 克隆项目
git clone https://github.com/lcad101/BOM-.git
cd BOM-/code

# 安装前端依赖
pnpm install

# 生成 Prisma 客户端
npx prisma generate

# 推送 Schema 到数据库
npx prisma db push

# 启动开发服务器
pnpm tauri dev
```

### IDE 配置

#### VS Code 推荐插件

| 插件 | 用途 |
|------|------|
| [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) | Vue 语言支持 |
| [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) | Rust 语言支持 |
| [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) | Prisma Schema 语法高亮 |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | 代码检查 |
| [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | 代码格式化 |

#### VS Code 配置

在项目根目录创建 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "rust-analyzer.linkedProjects": [
    "./src-tauri/Cargo.toml"
  ]
}
```

---

## 使用说明

### 基本操作

#### 1. 创建项目

1. 点击左上角 **"新建项目"** 按钮
2. 填写项目信息：
   - 项目名称（必填）
   - 项目编号（必填，格式：PRJ-YYYY-NNN）
   - 项目描述（选填）
   - 负责人（必填）
3. 点击 **"确认"** 创建项目

#### 2. 创建 BOM 版本

1. 在项目列表中点击进入项目
2. 点击 **"新建BOM"** 按钮
3. 填写 BOM 名称和描述
4. 选择版本号（默认 v1.0）
5. 点击 **"确认"** 创建版本

#### 3. 编辑 BOM

1. 在 BOM 版本列表中点击进入编辑
2. **添加子节点**：右键点击父节点 → 选择 "添加子节点"
3. **添加元器件**：右键点击父节点 → 选择 "添加元器件"
4. **编辑节点**：双击节点或右键选择 "编辑"
5. **删除节点**：右键点击节点 → 选择 "删除"
6. **拖拽排序**：按住节点拖动到目标位置

#### 4. 管理替代料

1. 点击 BOM 中的元器件节点
2. 在右侧面板点击 **"添加替代料"**
3. 选择替代元器件
4. 设置优先级和验证状态
5. 点击 **"确认"** 保存

#### 5. 导入 Excel

1. 点击工具栏 **"导入"** 按钮
2. 选择 Excel 文件（.xlsx 或 .xls）
3. 进行字段映射（将 Excel 列映射到系统字段）
4. 预览数据，确认无误
5. 点击 **"确认导入"**

#### 6. 导出 Excel

1. 选择要导出的 BOM 版本
2. 点击工具栏 **"导出"** 按钮
3. 选择导出范围和字段
4. 选择保存位置
5. 点击 **"保存"**

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + S` | 保存当前操作 |
| `Ctrl + Z` | 撤销 |
| `Ctrl + Shift + Z` | 重做 |
| `Ctrl + F` | 搜索 |
| `Delete` | 删除选中节点 |
| `F2` | 重命名节点 |
| `Enter` | 确认编辑 |
| `Escape` | 取消编辑 |

---

## 项目结构

```
BOM-/
├── README.md                    # 项目说明（本文件）
├── DESIGN.md                    # 软件设计文档
├── CHANGELOG.md                 # 版本更新日志
├── LICENSE                      # MIT 许可证
│
├── code/                        # 源代码目录
│   ├── src/                     # 前端源码（Vue 3）
│   │   ├── components/          # Vue 组件
│   │   │   ├── bom/             # BOM 相关组件
│   │   │   ├── common/          # 通用组件
│   │   │   └── import/          # 导入相关组件
│   │   ├── composables/         # 组合式函数
│   │   ├── stores/              # Pinia 状态管理
│   │   ├── types/               # TypeScript 类型定义
│   │   ├── utils/               # 工具函数
│   │   ├── views/               # 页面组件
│   │   ├── router/              # 路由配置
│   │   ├── assets/              # 静态资源
│   │   ├── App.vue              # 根组件
│   │   └── main.ts              # 入口文件
│   │
│   ├── src-tauri/               # Tauri 后端（Rust）
│   │   ├── src/                 # Rust 源码
│   │   │   ├── commands/        # IPC 命令处理器
│   │   │   ├── db/              # 数据库操作
│   │   │   ├── models/          # 数据模型
│   │   │   ├── services/        # 业务逻辑层
│   │   │   └── main.rs          # 入口文件
│   │   ├── prisma/              # Prisma Schema
│   │   │   ├── schema.prisma    # 数据库模型定义
│   │   │   └── migrations/      # 数据库迁移
│   │   ├── Cargo.toml           # Rust 依赖配置
│   │   └── tauri.conf.json      # Tauri 配置
│   │
│   ├── tests/                   # 测试文件
│   │   ├── unit/                # 单元测试
│   │   └── e2e/                 # E2E 测试
│   │
│   ├── package.json             # Node.js 依赖
│   ├── vite.config.ts           # Vite 配置
│   └── tsconfig.json            # TypeScript 配置
│
├── Docs/                        # 设计文档
│   ├── BOMMaster_产品需求文档_PRD.md
│   ├── BOMMaster_技术栈选型文档_TechStack.md
│   ├── BOMMaster_数据库设计文档_DatabaseDesign.md
│   ├── BOMMaster_系统架构设计文档_Architecture.md
│   ├── BOMMaster_API接口规范文档_APISpec.md
│   └── BOMMaster_编码与AI_Agent提示词规范_CodingStandards.md
│
└── backups/                     # 数据备份目录
```

---

## 常用命令

### 开发命令

```bash
# 启动开发服务器
pnpm tauri dev

# 构建生产版本
pnpm tauri build

# 运行单元测试
pnpm test

# 运行 E2E 测试
pnpm test:e2e

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

### 数据库命令

```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送 Schema 到数据库
npx prisma db push

# 创建数据库迁移
npx prisma migrate dev --name <migration_name>

# 应用数据库迁移
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset

# 打开 Prisma Studio（可视化数据库）
npx prisma studio
```

### Git 命令

```bash
# 创建功能分支
git checkout -b feature/your-feature

# 创建修复分支
git checkout -b fix/your-fix

# 提交代码（遵循规范）
git commit -m "feat(bom): 添加BOM对比功能"

# 推送分支
git push origin feature/your-feature
```

---

## 文档链接

| 文档 | 说明 |
|------|------|
| [软件设计文档](DESIGN.md) | 完整的软件设计方案 |
| [产品需求文档](Docs/BOMMaster_产品需求文档_PRD.md) | 功能需求和用户故事 |
| [技术栈选型文档](Docs/BOMMaster_技术栈选型文档_TechStack.md) | 技术选型和版本 |
| [数据库设计文档](Docs/BOMMaster_数据库设计文档_DatabaseDesign.md) | 数据库表结构和关系 |
| [系统架构设计文档](Docs/BOMMaster_系统架构设计文档_Architecture.md) | 系统架构和模块划分 |
| [API接口规范文档](Docs/BOMMaster_API接口规范文档_APISpec.md) | IPC命令定义 |
| [编码规范文档](Docs/BOMMaster_编码与AI_Agent提示词规范_CodingStandards.md) | 编码标准和最佳实践 |

---

## 贡献指南

我们欢迎所有形式的贡献！请阅读以下指南：

### 如何贡献

1. **Fork 仓库**
   - 访问 https://github.com/lcad101/BOM-
   - 点击右上角 "Fork" 按钮

2. **克隆 Fork**
   ```bash
   git clone https://github.com/your-username/BOM-.git
   cd BOM-
   ```

3. **创建分支**
   ```bash
   git checkout -b feature/your-feature
   ```

4. **提交更改**
   ```bash
   git commit -m "feat(module): 描述你的更改"
   ```

5. **推送分支**
   ```bash
   git push origin feature/your-feature
   ```

6. **创建 Pull Request**
   - 访问你的 Fork 仓库
   - 点击 "New Pull Request"
   - 填写描述信息
   - 提交 PR

### 提交规范

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

类型 (Type):
- feat:     新功能
- fix:      修复 Bug
- docs:     文档变更
- style:    代码格式（不影响功能）
- refactor: 重构（不新增功能也不修复 Bug）
- perf:     性能优化
- test:     测试相关
- chore:    构建/工具变更

作用域 (Scope):
- project:  项目管理模块
- bom:      BOM 版本管理模块
- node:     BOM 节点管理模块
- component: 元器件管理模块
- alternative: 替代料管理模块
- import:   导入功能
- export:   导出功能
- history:  变更历史模块
- settings: 系统设置
- ui:       UI 组件
- db:       数据库相关
```

**示例**：
```
feat(bom): 支持拖拽调整BOM节点层级

- 实现节点拖拽排序功能
- 添加层级深度校验（最大10级）
- 拖拽时显示放置位置指示器

Closes #123
```

### 代码规范

- 遵循项目 [编码规范文档](Docs/BOMMaster_编码与AI_Agent提示词规范_CodingStandards.md)
- 所有代码必须通过 ESLint 检查
- 新功能必须包含单元测试
- 提交前确保所有测试通过

### 报告问题

- 使用 [GitHub Issues](https://github.com/lcad101/BOM-/issues) 报告 Bug
- 请使用 Issue 模板
- 提供详细的复现步骤
- 附上截图（如适用）

---

## 许可证

本项目采用 [MIT 许可证](LICENSE) 开源许可证。

```
MIT License

Copyright (c) 2026 BOMMaster Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 致谢

感谢所有为 BOMMaster 项目做出贡献的开发者！

---

<div align="center">

**如果这个项目对您有帮助，请给个 Star 支持一下！**

[![Star History Chart](https://api.star-history.com/svg?repos=lcad101/BOM-&Date)](https://star-history.com/#lcad101/BOM-&Date)

</div>