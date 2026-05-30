# BOMMaster 软件设计文档

> 版本: v1.0 | 日期: 2026-05-30  
> 仓库地址: https://github.com/lcad101/BOM-.git

---

## 目录

1. [软件概述](#1-软件概述)
2. [设计要求](#2-设计要求)
3. [技术规范](#3-技术规范)
4. [实现方案](#4-实现方案)
5. [部署指南](#5-部署指南)
6. [版本管理](#6-版本管理)
7. [软件依赖](#7-软件依赖)
8. [环境设置](#8-环境设置)
9. [开源规范](#9-开源规范)

---

## 1. 软件概述

### 1.1 项目名称

**BOMMaster** - BOM管理系统

### 1.2 项目简介

BOMMaster是一款专为硬件工程团队设计的桌面端BOM（物料清单）管理系统。该系统解决了传统Excel管理BOM时面临的版本混乱、替代料追踪困难、多人协作冲突和层级关系不直观等核心痛点。

### 1.3 目标用户

| 角色 | 职责描述 |
|------|---------|
| 硬件工程师 | 创建和维护BOM结构，管理元器件选型和替代料 |
| 采购人员 | 查看BOM物料清单，跟踪替代料信息，进行采购决策 |
| NPI项目经理 | 管理项目进度，审核BOM变更，对比版本差异 |
| 系统管理员 | 管理用户权限、系统配置和数据备份 |

### 1.4 核心功能

- **多层级BOM管理**：支持10级深度的树状BOM结构，可视化展示PCBA-单板-元器件的父子装配关系
- **BOM版本管理**：自动版本控制，支持版本对比、历史回溯、版本派生
- **替代料管理**：元器件替代方案追踪，验证状态管理，一键提升替代料为正式料
- **Excel导入导出**：支持Excel文件导入（含字段映射）、多种格式导出
- **高级搜索**：跨项目元器件搜索，按型号/厂商/类别筛选
- **变更历史**：完整操作记录，支持按时间/类型/操作人筛选

---

## 2. 设计要求

### 2.1 功能需求（按优先级）

#### P0 - 必须实现
- US-001: 创建多层级BOM（树状图展示，支持拖拽，最大10级深度）
- US-002: 导入Excel BOM（字段映射，数据预览，导入校验）
- US-003: BOM版本管理（自动版本号，版本状态，版本派生）
- US-004: 替代料管理（添加/删除替代料，优先级排序，验证状态）
- US-007: 项目管理（创建/归档项目，项目搜索排序）

#### P1 - 应该实现
- US-005: BOM导出（Excel格式，可选导出范围和字段）
- US-006: 高级搜索与筛选（全局搜索，跨项目搜索）
- US-008: BOM对比（并排视图，差异高亮）
- US-009: 变更历史（操作记录，时间线展示）

#### P2 - 可以实现
- US-010: 数据导入校验与预览（错误/警告分级，批量修复）

### 2.2 非功能需求

#### 性能要求
| 场景 | 目标值 |
|------|--------|
| BOM树加载（1000节点） | ≤1秒 |
| Excel导入（10000行） | ≤3秒 |
| 搜索响应 | ≤500ms |
| 版本对比 | ≤2秒 |
| 应用冷启动 | ≤3秒 |

#### 数据安全
- 本地SQLite数据库，支持SQLCipher加密
- 自动备份：每日增量备份，每周全量备份
- 删除操作二次确认，支持软删除（30天恢复期）
- 备份文件AES-256加密

#### 可用性
- 中英文双语支持
- 键盘快捷键（Ctrl+S保存、Ctrl+Z撤销、Ctrl+F搜索）
- 支持50步操作历史的撤销/重做

#### 兼容性
- Windows 10 (1809+) / Windows 11
- 最低分辨率1366x768，推荐1920x1080
- 完全离线支持

### 2.3 UI/UX设计要求

#### 布局规范
- 经典三栏布局：左侧项目导航、中间BOM编辑区、右侧属性面板
- 顶部工具栏：项目操作、BOM操作、导入导出、搜索
- 底部状态栏：当前项目、BOM版本、节点数量、保存状态

#### 视觉规范
- 主色调：专业蓝 (#409EFF)
- 辅助色：成功绿 (#67C23A)、警告橙 (#E6A23C)、危险红 (#F56C6C)
- 字体：中文使用微软雅黑，英文使用Segoe UI，代码使用Consolas
- 间距基准单位：8px

---

## 3. 技术规范

### 3.1 核心架构

采用前后端分离的桌面应用架构，通过Tauri进行整合：

```
┌─────────────────────────────────────────────────────────┐
│                    表现层 (Presentation)                  │
│  Vue 3 组件 + Element Plus + ECharts                     │
├─────────────────────────────────────────────────────────┤
│                    应用层 (Application)                   │
│  Pinia Stores + Composables + Tauri IPC Client           │
├─────────────────────────────────────────────────────────┤
│                    领域层 (Domain)                        │
│  Tauri Commands (Rust) + 业务规则引擎                      │
├─────────────────────────────────────────────────────────┤
│                  基础设施层 (Infrastructure)               │
│  Prisma ORM + SQLite + 文件系统                           │
└─────────────────────────────────────────────────────────┘
```

**架构模式**：`Vue 3 ←→ Tauri IPC ←→ Rust ←→ SQLite`

### 3.2 技术栈明细

| 分类 | 技术/框架 | 版本 | 用途 |
|------|----------|------|------|
| 桌面容器 | Tauri | v2.x | 桌面应用打包，轻量级（~10MB） |
| 前端框架 | Vue 3 | v3.4+ | 用户界面构建 |
| UI组件库 | Element Plus | v2.x | 后台管理界面组件 |
| 开发语言 | TypeScript | v5.x | 前端类型安全 |
| 构建工具 | Vite | v5.x | 极速热更新 |
| 后端语言 | Rust | 1.70+ | 系统级操作，高性能 |
| 本地数据库 | SQLite | v3.x | 数据持久化 |
| ORM工具 | Prisma | v5.x | 类型安全数据库操作 |
| 状态管理 | Pinia | v2.x | Vue 3官方推荐 |
| 图表库 | ECharts | v5.x | BOM数据可视化 |
| 文件解析 | xlsx (SheetJS) | v0.18+ | Excel读写 |

### 3.3 编码规范

#### TypeScript命名规范
| 类型 | 规则 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `bom-tree.vue` |
| 组件名 | PascalCase | `BomTree` |
| 变量/函数 | camelCase | `bomTreeData` |
| 常量 | UPPER_SNAKE_CASE | `MAX_BOM_LEVEL` |
| 类型/接口 | PascalCase | `BomNode` |
| Tauri命令 | snake_case | `create_bom_node` |
| 数据库字段 | snake_case | `part_number` |

#### Vue组件结构
```vue
<script setup lang="ts">
// 1. 类型导入
// 2. 组件导入
// 3. Composable导入
// 4. Store导入
// 5. Props定义
// 6. Emits定义
// 7. 响应式状态
// 8. Composable使用
// 9. 计算属性
// 10. 方法
// 11. 生命周期
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped lang="scss">
/* 组件样式 */
</style>
```

#### Git提交规范
```
<type>(<scope>): <subject>

类型: feat|fix|docs|style|refactor|perf|test|chore|ci
作用域: project|bom|node|component|alternative|import|export|history|settings|ui|db
```

---

## 4. 实现方案

### 4.1 模块划分

| 模块 | 职责 | 关键文件 |
|------|------|---------|
| 项目管理 | 项目的CRUD、归档、搜索 | `commands/project.rs`, `stores/projectStore.ts` |
| BOM版本管理 | 版本创建、发布、归档、派生 | `commands/bom.rs`, `stores/bomStore.ts` |
| BOM节点管理 | 树结构操作、节点增删改、拖拽 | `commands/bom_node.rs`, `composables/useBomTree.ts` |
| 元器件管理 | 元器件信息维护、搜索、去重 | `commands/component.rs`, `composables/useSearch.ts` |
| 替代料管理 | 替代料添加、排序、验证 | `commands/alternative.rs`, `stores/bomStore.ts` |
| 导入导出 | Excel解析、字段映射、数据导出 | `commands/import_export.rs`, `composables/useImport.ts` |
| 变更历史 | 变更记录、版本对比 | `commands/history.rs`, `stores/historyStore.ts` |
| 系统设置 | 用户偏好、备份恢复、主题切换 | `commands/settings.rs`, `stores/uiStore.ts` |

### 4.2 数据库设计

#### 核心表结构
```
projects (项目表)
  └── bom_versions (BOM版本表)
        └── bom_nodes (BOM节点表，自引用实现树结构)
              ├── components (元器件表)
              │     └── alternative_parts (替代料表)
              │     └── component_suppliers (元器件供应商关联表)
              └── change_history (变更历史表)
```

#### 关键约束
- BOM层级深度不超过10级
- 同一父节点下不允许重复子节点
- 替代料不能与原件相同
- 项目名称和编号唯一
- BOM版本号在同一项目下唯一

### 4.3 数据流示例

#### 创建BOM节点
```
1. 用户在BomTree组件右键点击"添加子节点"
2. 弹出NodeEditDialog，用户填写节点信息
3. 用户点击"确认"，触发 bomStore.addNode(parentId, nodeData)
4. bomStore调用 invoke('create_bom_node', { parentId, nodeData })
5. Rust命令处理器校验数据（层级深度≤10、型号不重复）
6. 调用Prisma创建节点记录
7. 返回新节点数据给前端
8. bomStore更新本地状态，BomTree组件响应式更新
9. 记录变更历史
```

### 4.4 代码示例

#### TypeScript类型定义
```typescript
// types/bom.ts
export interface BomNode {
  id: string;
  bomVersionId: string;
  parentId: string | null;
  componentId: string | null;
  nodeType: 'assembly' | 'component';
  name: string;
  quantity: number;
  unit: string;
  referenceDesignator: string;
  level: number;
  sortOrder: number;
  notes: string;
  children: BomNode[];
  hasAlternatives?: boolean;
}

export interface BomVersion {
  id: string;
  projectId: string;
  name: string;
  versionNumber: string;
  status: 'draft' | 'released' | 'archived';
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Pinia Store示例
```typescript
// stores/bomStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { safeInvoke } from '@/utils/ipc';
import type { BomNode } from '@/types/bom';

export const useBomStore = defineStore('bom', () => {
  const treeData = ref<BomNode | null>(null);
  const selectedNode = ref<BomNode | null>(null);
  const isLoading = ref(false);

  async function loadBomTree(versionId: string) {
    isLoading.value = true;
    try {
      treeData.value = await safeInvoke<BomNode>('get_bom_tree', {
        versionId,
      });
    } finally {
      isLoading.value = false;
    }
  }

  async function addNode(parentId: string | null, nodeData: Partial<BomNode>) {
    const newNode = await safeInvoke<BomNode>('create_bom_node', {
      parentId,
      ...nodeData,
    }, { successMessage: '节点创建成功' });
    await loadBomTree(nodeData.bomVersionId!);
    return newNode;
  }

  return {
    treeData,
    selectedNode,
    isLoading,
    loadBomTree,
    addNode,
  };
});
```

#### Vue组件示例
```vue
<!-- components/bom/BomTree.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { ElTree } from 'element-plus';
import type { BomNode } from '@/types/bom';
import { useBomStore } from '@/stores/bomStore';

const props = defineProps<{
  versionId: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'node-selected', node: BomNode): void;
}>();

const bomStore = useBomStore();

const treeData = computed(() => 
  bomStore.treeData ? [bomStore.treeData] : []
);

function handleNodeClick(data: BomNode) {
  bomStore.selectedNode = data;
  emit('node-selected', data);
}
</script>

<template>
  <div class="bom-tree">
    <el-tree
      :data="treeData"
      :props="{ children: 'children', label: 'name' }"
      node-key="id"
      highlight-current
      @node-click="handleNodeClick"
    >
      <template #default="{ node, data }">
        <span class="tree-node">
          <el-icon v-if="data.hasAlternatives" class="has-alt-icon">
            <Connection />
          </el-icon>
          <span>{{ data.name }}</span>
          <span class="node-quantity">x{{ data.quantity }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>
```

#### Rust命令示例
```rust
// src-tauri/src/commands/bom_node.rs
use crate::db::repositories::bom_node::BomNodeRepository;
use crate::models::bom_node::{CreateBomNodeInput, BomNodeResponse};

#[tauri::command]
pub async fn create_bom_node(
    version_id: String,
    parent_id: Option<String>,
    node_type: String,
    name: String,
    quantity: i32,
    unit: Option<String>,
    component_id: Option<String>,
    reference_designator: Option<String>,
    notes: Option<String>,
) -> Result<BomNodeResponse, String> {
    // 参数校验
    if name.is_empty() {
        return Err("节点名称不能为空".to_string());
    }
    if quantity <= 0 {
        return Err("数量必须大于0".to_string());
    }

    // 业务规则校验
    let repo = BomNodeRepository::new();
    if let Some(pid) = &parent_id {
        let parent = repo.find_by_id(pid).await
            .map_err(|e| format!("查询父节点失败: {}", e))?
            .ok_or_else(|| "父节点不存在".to_string())?;

        if parent.level >= 10 {
            return Err("已达到最大层级深度(10级)".to_string());
        }
    }

    // 创建节点
    let input = CreateBomNodeInput {
        bom_version_id: version_id,
        parent_id,
        node_type,
        name,
        quantity,
        unit: unit.unwrap_or_else(|| "PCS".to_string()),
        component_id,
        reference_designator,
        notes,
    };

    let node = repo.create(input).await
        .map_err(|e| format!("创建节点失败: {}", e))?;

    Ok(node.into())
}
```

---

## 5. 部署指南

### 5.1 系统要求

#### 开发环境
| 依赖 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 18.x LTS | 20.x LTS |
| Rust | 1.70 | 1.75+ |
| Windows SDK | 10.0.19041 | 10.0.22621 |
| WebView2 | 95.0 | 最新 |

#### 运行环境
- Windows 10 (1809+) / Windows 11
- WebView2 Runtime（Windows 11内置，Windows 10需安装）

### 5.2 开发环境搭建

```bash
# 1. 安装Node.js（推荐使用nvm管理）
nvm install 20
nvm use 20

# 2. 安装Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 3. 安装pnpm
npm install -g pnpm

# 4. 克隆项目
git clone https://github.com/lcad101/BOM-.git bom-master
cd bom-master/code

# 5. 安装前端依赖
pnpm install

# 6. 初始化Prisma
npx prisma generate
npx prisma db push

# 7. 启动开发服务器
pnpm tauri dev
```

### 5.3 构建生产版本

```bash
# 构建应用
pnpm tauri build

# 输出位置
# src-tauri/target/release/bundle/msi/  (MSI安装包)
# src-tauri/target/release/bundle/nsis/ (NSIS安装包)
# src-tauri/target/release/bundle/      (便携版)
```

### 5.4 安装包规范

| 格式 | 说明 | 大小限制 |
|------|------|---------|
| MSI安装包 | Windows标准安装包，支持静默安装 | ≤20MB |
| NSIS安装包 | 可定制安装界面 | ≤20MB |
| 便携版 | 免安装，解压即用 | ≤15MB |

### 5.5 自动更新

```json
// tauri.conf.json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/lcad101/BOM-/releases/latest/download/latest.json"
    ],
    "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ..."
  }
}
```

---

## 6. 版本管理

### 6.1 版本号策略

采用**语义化版本控制**（Semantic Versioning）：

```
MAJOR.MINOR.PATCH
  │      │      │
  │      │      └─ 修复Bug、小改动
  │      └─ 新增功能（向后兼容）
  └─ 重大更新（不兼容的API变更）
```

**BOM版本号**格式：`v{MAJOR}.{MINOR}`，如 `v1.0`、`v1.1`、`v2.0`

### 6.2 版本状态

| 状态 | 说明 | 可修改 |
|------|------|--------|
| Draft（草稿） | 开发中的版本 | ✅ 是 |
| Released（已发布） | 正式发布版本 | ❌ 否 |
| Archived（已归档） | 归档保留版本 | ❌ 否 |

### 6.3 发布流程

1. 在Draft版本中完成所有修改
2. 进行功能测试和回归测试
3. 更新CHANGELOG.md
4. 执行`pnpm tauri build`生成安装包
5. 在GitHub创建Release并上传安装包
6. 将BOM版本状态改为Released

### 6.4 版本更新日志

```markdown
# Changelog

本文件记录BOMMaster的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本控制](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- 无

### 变更
- 无

### 修复
- 无

---

## [1.1.0] - 2026-06-15

### 新增
- **BOM对比功能**：支持两个BOM版本的并排对比，差异高亮显示
- **替代料验证状态**：新增"验证中"状态，支持验证流程管理
- **快捷键支持**：Ctrl+S保存、Ctrl+Z撤销、Ctrl+Shift+Z重做

### 变更
- 优化BOM树加载性能，1000节点加载时间从1.5秒降至0.8秒
- 改进Excel导入界面，增加字段映射预览功能

### 修复
- 修复拖拽节点时层级计算错误的问题
- 修复导出Excel时特殊字符显示乱码的问题

---

## [1.0.0] - 2026-05-30

### 新增
- **项目管理**：创建、编辑、归档项目
- **BOM版本管理**：多版本支持，版本派生，状态流转
- **多层级BOM编辑**：树状图展示，拖拽调整，最大10级深度
- **元器件管理**：元器件库维护，跨项目搜索
- **替代料管理**：添加替代料，优先级排序，一键提升
- **Excel导入导出**：字段映射导入，多种格式导出
- **变更历史**：完整操作记录，按条件筛选

### 技术特性
- 基于Tauri v2的轻量级桌面应用（安装包<20MB）
- 本地SQLite数据库，完全离线支持
- Vue 3 + TypeScript + Element Plus前端
- Rust高性能后端处理

---

## [0.1.0] - 2026-04-01

### 新增
- 项目初始化
- 基础架构搭建
- 核心数据模型设计

[未发布]: https://github.com/lcad101/BOM-/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/lcad101/BOM-/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/lcad101/BOM-/releases/tag/v1.0.0
[0.1.0]: https://github.com/lcad101/BOM-/releases/tag/v0.1.0
```

---

## 7. 软件依赖

### 7.1 前端依赖

#### 生产依赖
| 包名 | 版本 | 用途 |
|------|------|------|
| @tauri-apps/api | ^2.0.0 | Tauri前端API |
| @tauri-apps/plugin-dialog | ^2.0.0 | 文件对话框插件 |
| @tauri-apps/plugin-fs | ^2.0.0 | 文件系统插件 |
| vue | ^3.4.19 | Vue 3核心 |
| vue-router | ^4.2.5 | 路由管理 |
| pinia | ^2.1.6 | 状态管理 |
| pinia-plugin-persistedstate | ^3.2.1 | 状态持久化 |
| element-plus | ^2.5.6 | UI组件库 |
| @element-plus/icons-vue | ^2.3.1 | 图标库 |
| xlsx | ^0.18.5 | Excel解析 |
| echarts | ^5.5.0 | 图表库 |
| vue-echarts | ^6.6.9 | Vue ECharts封装 |
| dayjs | ^1.11.10 | 日期处理 |
| uuid | ^9.0.0 | UUID生成 |

#### 开发依赖
| 包名 | 版本 | 用途 |
|------|------|------|
| @tauri-apps/cli | ^2.0.0 | Tauri CLI |
| @vitejs/plugin-vue | ^5.0.4 | Vite Vue插件 |
| vite | ^5.1.6 | 构建工具 |
| vue-tsc | ^2.0.6 | Vue TypeScript检查 |
| typescript | ^5.3.3 | TypeScript编译器 |
| sass | ^1.71.1 | SCSS预处理 |
| vitest | ^1.3.1 | 单元测试框架 |
| @vue/test-utils | ^2.4.4 | Vue测试工具 |
| eslint | ^8.57.0 | 代码检查 |
| prettier | ^3.2.5 | 代码格式化 |

### 7.2 后端依赖

#### Rust依赖（Cargo.toml）
```toml
[dependencies]
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
prisma-client-rust = { version = "0.6", features = ["sqlite"] }
thiserror = "1.0"
tokio = { version = "1.0", features = ["full"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
```

### 7.3 开发工具链

| 工具 | 版本 | 用途 |
|------|------|------|
| ESLint | v8.x | JavaScript/TypeScript静态分析 |
| Prettier | v3.x | 代码格式化 |
| Husky | v9.x | Git hooks管理 |
| commitlint | v18.x | Commit Message校验 |
| pnpm | v8.x | 包管理器 |

---

## 8. 环境设置

### 8.1 安装步骤

#### Windows环境

```powershell
# 1. 安装Node.js
# 下载并安装 https://nodejs.org/ 或使用nvm-windows
nvm install 20
nvm use 20

# 2. 安装Rust
# 下载并运行 https://rustup.rs/
# 或使用winget
winget install Rustlang.Rustup

# 3. 安装pnpm
npm install -g pnpm

# 4. 克隆项目
git clone https://github.com/lcad101/BOM-.git
cd BOM-/code

# 5. 安装依赖
pnpm install

# 6. 初始化数据库
npx prisma generate
npx prisma db push

# 7. 启动开发
pnpm tauri dev
```

### 8.2 IDE配置

#### VS Code推荐插件

| 插件名 | 用途 |
|--------|------|
| Vue - Official | Vue语言支持 |
| rust-analyzer | Rust语言支持 |
| Prisma | Prisma Schema语法高亮 |
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| Error Lens | 错误内联显示 |
| GitLens | Git增强 |

#### VS Code配置

```json
// .vscode/settings.json
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

### 8.3 数据库配置

#### Prisma Schema位置
```
code/src-tauri/prisma/schema.prisma
```

#### 数据库文件位置
```
%APPDATA%/com.bom-master.app/data/bom-master.db
```

#### 数据库迁移命令
```bash
# 创建迁移
npx prisma migrate dev --name <migration_name>

# 应用迁移
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset

# 查看数据库状态
npx prisma status
```

### 8.4 环境变量

```bash
# .env (开发环境)
DATABASE_URL="file:./dev.db"
TAURI_ENV_DEBUG=true

# .env.production (生产环境)
DATABASE_URL="file:./bom-master.db"
```

---

## 9. 开源规范

### 9.1 仓库信息

- **仓库地址**：https://github.com/lcad101/BOM-.git
- **许可证**：MIT License
- **默认分支**：main
- **开发分支**：develop

### 9.2 分支策略

```
main ─────────────────────────────────────────→ (生产分支)
  │
  ├── develop ──────────────────────────────→ (开发分支)
  │     │
  │     ├── feature/xxx ──────────────────→ (功能分支)
  │     │
  │     ├── fix/xxx ──────────────────────→ (修复分支)
  │     │
  │     └── release/x.x.x ────────────────→ (发布分支)
  │
  └── hotfix/xxx ──────────────────────────→ (紧急修复)
```

### 9.3 贡献者指南

#### 如何贡献

1. **Fork仓库**：点击GitHub页面右上角的Fork按钮
2. **克隆Fork**：`git clone https://github.com/your-username/BOM-.git`
3. **创建分支**：`git checkout -b feature/your-feature`
4. **提交更改**：遵循Git提交规范
5. **推送分支**：`git push origin feature/your-feature`
6. **创建PR**：在GitHub上创建Pull Request

#### 代码规范

- 遵循项目[编码规范文档](Docs/BOMMaster_编码与AI_Agent提示词规范_CodingStandards.md)
- 所有代码必须通过ESLint检查
- 新功能必须包含单元测试
- 提交前确保所有测试通过

#### PR要求

- 清晰描述修改内容
- 关联相关Issue
- 包含必要的截图（UI变更）
- 至少一位维护者批准

### 9.4 行为准则

#### 我们的承诺

为了营造一个开放、友好的环境，我们作为贡献者和维护者承诺：无论年龄、体型、残疾、民族、性别认同和表达、经验水平、国籍、外貌、种族、宗教信仰或性取向如何，参与本项目的每个人都不会受到骚扰。

#### 我们的标准

**积极的行为包括**：
- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性的批评
- 关注对社区最有利的事情
- 对其他社区成员表示同情

**不可接受的行为包括**：
- 使用性暗示的语言或图像，以及不受欢迎的性关注
- 恶意评论、人身攻击或政治攻击
- 公开或私下的骚扰
- 未经明确许可发布他人的私人信息
- 其他在专业环境中被合理认为不当的行为

#### 执行

项目维护者有权删除、编辑或拒绝不符合行为准则的评论、提交、代码、Wiki编辑、Issue和其他贡献。项目维护者有权暂时或永久禁止任何贡献者从事他们认为不当、威胁、冒犯或有害的行为。

### 9.5 Issue模板

#### Bug报告模板
```markdown
**描述**
简明扼要地描述Bug。

**复现步骤**
1. 转到'...'
2. 点击'...'
3. 滚动到'...'
4. 看到错误

**期望行为**
描述您期望发生的事情。

**截图**
如果适用，添加截图来帮助解释问题。

**环境信息**
- 操作系统：[例如 Windows 11]
- 应用版本：[例如 1.0.0]
```

#### 功能请求模板
```markdown
**功能描述**
简明扼要地描述您希望添加的功能。

**使用场景**
描述该功能的使用场景。

**期望行为**
描述您期望该功能如何工作。

**附加信息**
添加任何其他上下文或截图。
```

### 9.6 许可证

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

## 附录

### A. 项目目录结构

```
BOM-/
├── README.md                    # 项目说明
├── DESIGN.md                    # 本文档
├── CHANGELOG.md                 # 版本更新日志
├── LICENSE                      # 许可证
├── code/                        # 源代码
│   ├── src/                     # 前端源码
│   │   ├── components/          # Vue组件
│   │   ├── composables/         # 组合式函数
│   │   ├── stores/              # Pinia状态
│   │   ├── types/               # TypeScript类型
│   │   ├── utils/               # 工具函数
│   │   ├── views/               # 页面组件
│   │   ├── router/              # 路由配置
│   │   ├── assets/              # 静态资源
│   │   ├── App.vue              # 根组件
│   │   └── main.ts              # 入口文件
│   ├── src-tauri/               # Tauri后端
│   │   ├── src/                 # Rust源码
│   │   │   ├── commands/        # IPC命令
│   │   │   ├── db/              # 数据库操作
│   │   │   ├── models/          # 数据模型
│   │   │   └── main.rs          # 入口文件
│   │   ├── prisma/              # Prisma Schema
│   │   ├── Cargo.toml           # Rust依赖
│   │   └── tauri.conf.json      # Tauri配置
│   ├── tests/                   # 测试文件
│   ├── package.json             # Node依赖
│   └── vite.config.ts           # Vite配置
├── Docs/                        # 设计文档
│   ├── BOMMaster_产品需求文档_PRD.md
│   ├── BOMMaster_技术栈选型文档_TechStack.md
│   ├── BOMMaster_数据库设计文档_DatabaseDesign.md
│   ├── BOMMaster_系统架构设计文档_Architecture.md
│   ├── BOMMaster_API接口规范文档_APISpec.md
│   └── BOMMaster_编码与AI_Agent提示词规范_CodingStandards.md
└── backups/                     # 备份目录
```

### B. 常用命令速查

```bash
# 开发
pnpm tauri dev              # 启动开发服务器
pnpm tauri build            # 构建生产版本
pnpm test                   # 运行单元测试
pnpm test:e2e               # 运行E2E测试
pnpm lint                   # 代码检查
pnpm format                 # 代码格式化

# 数据库
npx prisma generate         # 生成Prisma客户端
npx prisma db push          # 推送Schema到数据库
npx prisma migrate dev      # 创建迁移
npx prisma studio           # 打开Prisma Studio

# Git
git checkout -b feature/xxx # 创建功能分支
git commit -m "feat(xxx): 描述" # 提交
git push origin feature/xxx # 推送
```

---

> 文档维护：BOMMaster Team  
> 最后更新：2026-05-30