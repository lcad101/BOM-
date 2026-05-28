# BOM管理系统 - 技术栈选型文档 (TechStack)

> 版本: v1.0 | 日期: 2026-05-28

---

## 1. 核心架构

采用前后端分离的桌面应用架构，通过 Tauri 进行整合。前端使用 Vue 3 构建用户界面，后端使用 Rust 处理系统级操作，本地数据存储使用 SQLite + Prisma ORM。

架构模式：**前端 (Vue 3) ←→ Tauri IPC ←→ 后端 (Rust) ←→ SQLite**

---

## 2. 技术栈明细

### 2.1 核心技术栈

| 分类 | 技术/框架 | 版本 | 选型理由 |
|------|----------|------|---------|
| **桌面容器** | Tauri | v2.x | 比Electron更轻量，打包体积小（~10MB），底层Rust性能极高，适合本地文件操作。 |
| **前端框架** | Vue 3 | v3.4+ | 组合式API (Composition API) 逻辑复用性强，生态完善。 |
| **UI组件库** | Element Plus | v2.x | 提供成熟的Table、Tree、Dialog组件，适合做后台管理类界面。 |
| **开发语言** | TypeScript | v5.x | 强类型检查，减少运行时错误，提升代码可维护性。 |
| **构建工具** | Vite | v5.x | 极速的热更新 (HMR)，提升开发体验。 |
| **本地数据库** | SQLite | v3.x | 单文件、零配置、高性能的关系型数据库，完美适配桌面单机应用。 |
| **ORM工具** | Prisma | v5.x | 类型安全的数据库操作，无需手写SQL，迁移管理方便。 |

### 2.2 补充技术栈

| 分类 | 技术/框架 | 版本 | 选型理由 |
|------|----------|------|---------|
| **状态管理** | Pinia | v2.x | Vue 3官方推荐状态管理库，TypeScript友好，模块化设计，替代Vuex。 |
| **图表库** | ECharts | v5.x | 丰富的图表类型，支持树状图(Treemap)、关系图(Graph)，用于BOM数据可视化。 |
| **文件解析** | xlsx (SheetJS) | v0.18+ | 纯JS实现的Excel读写库，支持.xlsx/.xls格式，无需服务端依赖。 |
| **路由** | Vue Router | v4.x | Vue 3官方路由，支持路由守卫和懒加载。 |
| **HTTP客户端** | axios | v1.x | 用于未来可能的云端同步功能，当前版本主要用于本地。 |
| **CSS工具** | Sass | v1.x | CSS预处理器，支持变量、嵌套、混入，提升样式可维护性。 |

### 2.3 测试技术栈

| 分类 | 技术/框架 | 版本 | 选型理由 |
|------|----------|------|---------|
| **单元测试** | Vitest | v1.x | Vite原生测试框架，配置简单，与Vite共享配置，执行速度快。 |
| **E2E测试** | Playwright | v1.x | 跨浏览器E2E测试，支持Webkit/Chromium/Firefox，适合Tauri应用测试。 |
| **Mock工具** | MSW | v2.x | Mock Service Worker，拦截网络请求进行Mock，适合API层测试。 |
| **测试覆盖率** | c8 | v8.x | V8原生覆盖率工具，替代Istanbul，性能更好。 |

### 2.4 开发工具链

| 分类 | 技术/工具 | 版本 | 选型理由 |
|------|----------|------|---------|
| **代码检查** | ESLint | v8.x | JavaScript/TypeScript静态分析工具，配合Vue和TS插件使用。 |
| **代码格式化** | Prettier | v3.x | 统一代码风格，与ESLint配合使用，避免格式冲突。 |
| **Git钩子** | Husky | v9.x | Git hooks管理，在commit和push时自动执行lint和测试。 |
| **Commit规范** | commitlint | v18.x | 校验Git Commit Message是否符合Angular规范。 |
| **包管理器** | pnpm | v8.x | 磁盘空间效率高，依赖安装速度快，支持monorepo。 |

---

## 3. 版本兼容性矩阵

| 技术 | 最低版本 | 推荐版本 | 备注 |
|------|---------|---------|------|
| Node.js | 18.x LTS | 20.x LTS | 使用ESM模块系统 |
| Rust | 1.70 | 1.75+ | Tauri v2编译要求 |
| Windows SDK | 10.0.19041 | 10.0.22621 | Tauri WebView2依赖 |
| WebView2 | 95.0 | 最新 | Windows 11内置，Win10需安装 |

---

## 4. 项目目录结构

```
bom-master/
├── src-tauri/                    # Tauri后端 (Rust)
│   ├── src/
│   │   ├── main.rs              # 应用入口
│   │   ├── commands/            # IPC命令处理
│   │   │   ├── mod.rs
│   │   │   ├── project.rs       # 项目相关命令
│   │   │   ├── bom.rs           # BOM相关命令
│   │   │   ├── component.rs     # 元器件相关命令
│   │   │   └── import_export.rs # 导入导出命令
│   │   ├── db/                  # 数据库操作
│   │   │   ├── mod.rs
│   │   │   └── migrations/      # 数据库迁移
│   │   └── models/              # 数据模型
│   │       └── mod.rs
│   ├── Cargo.toml
│   └── tauri.conf.json          # Tauri配置
├── src/                          # 前端 (Vue 3)
│   ├── assets/                   # 静态资源
│   ├── components/               # 通用组件
│   │   ├── BomTree/             # BOM树组件
│   │   ├── PropertyPanel/       # 属性面板
│   │   └── ImportDialog/        # 导入对话框
│   ├── composables/              # 组合式函数
│   │   ├── useBomTree.ts        # BOM树操作逻辑
│   │   ├── useImport.ts         # 导入逻辑
│   │   └── useSearch.ts         # 搜索逻辑
│   ├── layouts/                  # 布局组件
│   ├── pages/                    # 页面组件
│   │   ├── ProjectList.vue      # 项目列表页
│   │   ├── BomEditor.vue        # BOM编辑页
│   │   └── Settings.vue         # 设置页
│   ├── stores/                   # Pinia状态管理
│   │   ├── projectStore.ts      # 项目状态
│   │   ├── bomStore.ts          # BOM状态
│   │   └── uiStore.ts           # UI状态
│   ├── types/                    # TypeScript类型定义
│   │   ├── bom.ts               # BOM相关类型
│   │   ├── project.ts           # 项目相关类型
│   │   └── api.ts               # API响应类型
│   ├── utils/                    # 工具函数
│   │   ├── excel.ts             # Excel处理工具
│   │   └── validator.ts         # 数据校验工具
│   ├── App.vue
│   └── main.ts
├── prisma/                       # Prisma Schema
│   ├── schema.prisma            # 数据库模型定义
│   └── migrations/              # 迁移文件
├── tests/                        # 测试文件
│   ├── unit/                    # 单元测试
│   └── e2e/                     # E2E测试
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .eslintrc.cjs
```

---

## 5. 开发环境搭建

### 5.1 环境准备

```bash
# 1. 安装Node.js (推荐使用nvm管理)
nvm install 20
nvm use 20

# 2. 安装Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 3. 安装pnpm
npm install -g pnpm

# 4. 克隆项目
git clone <repo-url> bom-master
cd bom-master

# 5. 安装前端依赖
pnpm install

# 6. 初始化Prisma
npx prisma generate
npx prisma db push

# 7. 启动开发服务器
pnpm tauri dev
```

### 5.2 IDE配置

- **VS Code** 推荐插件：
  - Vue - Official (Vue语言支持)
  - rust-analyzer (Rust语言支持)
  - Prisma (Prisma Schema语法高亮)
  - ESLint (代码检查)
  - Prettier (代码格式化)

### 5.3 构建与发布

```bash
# 开发模式
pnpm tauri dev

# 构建生产版本
pnpm tauri build

# 输出位置
# src-tauri/target/release/bundle/msi/
```
