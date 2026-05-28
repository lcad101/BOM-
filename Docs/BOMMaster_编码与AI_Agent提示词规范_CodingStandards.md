# BOM管理系统 - 编码与AI Agent提示词规范 (CodingStandards)

> 版本: v1.0 | 日期: 2026-05-28

---

## 1. TypeScript编码规范

### 1.1 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `bom-tree.vue`, `use-bom-tree.ts` |
| 组件名 | PascalCase（双词以上） | `BomTree`, `NodeEditDialog` |
| Composable | use前缀 + camelCase | `useBomTree`, `useSearch` |
| 变量/函数 | camelCase | `bomTreeData`, `loadBomTree()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_BOM_LEVEL`, `DEFAULT_PAGE_SIZE` |
| 类型/接口 | PascalCase | `BomNode`, `ProjectConfig` |
| 枚举 | PascalCase枚举名 + PascalCase值 | `NodeStatus.Active` |
| Pinia Store | camelCase文件 + use前缀 | `useBomStore`, `useProjectStore` |
| Tauri命令 | snake_case | `create_bom_node`, `list_projects` |
| Prisma模型 | PascalCase | `BomNode`, `AlternativePart` |
| 数据库字段 | snake_case | `part_number`, `created_at` |

### 1.2 类型定义规范

```typescript
// ✅ 正确：使用interface定义数据结构
interface BomNode {
  id: string;
  parentId: string | null;
  name: string;
  nodeType: 'assembly' | 'component';
  quantity: number;
  unit: string;
  level: number;
  children: BomNode[];
}

// ✅ 正确：使用type定义联合类型和工具类型
type NodeStatus = 'draft' | 'released' | 'archived';
type Nullable<T> = T | null;

// ❌ 错误：使用any
const data: any = {};  // 禁止使用any

// ✅ 正确：使用泛型或unknown
const data: unknown = {};
const result: ApiResponse<BomNode> = await invoke('get_bom_tree', args);
```

### 1.3 枚举定义

```typescript
// ✅ 正确：使用常量枚举或联合类型
const NodeType = {
  Assembly: 'assembly',
  Component: 'component',
} as const;

type NodeType = typeof NodeType[keyof typeof NodeType];

// ✅ 正确：验证状态
const VerificationStatus = {
  Unverified: 'unverified',
  Verifying: 'verifying',
  Verified: 'verified',
  NotRecommended: 'not_recommended',
} as const;
```

---

## 2. Vue 3组件开发模式

### 2.1 组件结构（Setup语法糖）

```vue
<script setup lang="ts">
// 1. 类型导入
import type { BomNode } from '@/types/bom';

// 2. 组件导入
import NodeEditDialog from './NodeEditDialog.vue';

// 3. Composable导入
import { useBomTree } from '@/composables/useBomTree';

// 4. Store导入
import { useBomStore } from '@/stores/bomStore';

// 5. Props定义
const props = defineProps<{
  versionId: string;
  readonly?: boolean;
}>();

// 6. Emits定义
const emit = defineEmits<{
  (e: 'node-selected', node: BomNode): void;
  (e: 'node-updated', node: BomNode): void;
}>();

// 7. 响应式状态
const isLoading = ref(false);
const searchKeyword = ref('');

// 8. Composable使用
const { treeData, loadTree, addNode } = useBomTree(props.versionId);

// 9. 计算属性
const nodeCount = computed(() => countNodes(treeData.value));

// 10. 方法
async function handleNodeClick(node: BomNode) {
  emit('node-selected', node);
}

// 11. 生命周期
onMounted(() => {
  loadTree();
});
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped lang="scss">
/* 组件样式 */
</style>
```

### 2.2 Props定义规范

```typescript
// ✅ 正确：使用TypeScript泛型定义Props
const props = defineProps<{
  versionId: string;
  readonly?: boolean;
  maxLevel?: number;
}>();

// 带默认值
const props = withDefaults(defineProps<{
  versionId: string;
  readonly?: boolean;
  maxLevel?: number;
}>(), {
  readonly: false,
  maxLevel: 10,
});
```

### 2.3 组合式函数 (Composable) 模式

```typescript
// composables/useBomTree.ts
import { ref, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { BomNode } from '@/types/bom';

export function useBomTree(versionId: Ref<string>) {
  const treeData = ref<BomNode | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function loadTree() {
    isLoading.value = true;
    error.value = null;
    try {
      treeData.value = await invoke<BomNode>('get_bom_tree', {
        versionId: versionId.value,
      });
    } catch (err) {
      error.value = typeof err === 'string' ? err : '加载BOM树失败';
    } finally {
      isLoading.value = false;
    }
  }

  async function addNode(parentId: string | null, nodeData: Partial<BomNode>) {
    const newNode = await invoke<BomNode>('create_bom_node', {
      versionId: versionId.value,
      parentId,
      ...nodeData,
    });
    // 刷新树数据
    await loadTree();
    return newNode;
  }

  // 版本变化时自动重新加载
  watch(versionId, () => {
    loadTree();
  });

  return {
    treeData,
    isLoading,
    error,
    loadTree,
    addNode,
  };
}
```

---

## 3. Prisma数据访问模式

### 3.1 Repository模式

每个数据模型对应一个Repository类，封装所有数据库操作：

```typescript
// repositories/project.repository.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProjectRepository {
  async findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        bomVersions: {
          where: { status: { not: 'deleted' } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findMany(params: {
    status?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, keyword, page = 1, pageSize = 20 } = params;
    const where: any = {};

    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { projectCode: { contains: keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async create(data: { name: string; projectCode: string; owner: string; description?: string }) {
    return prisma.project.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; description: string; owner: string }>) {
    return prisma.project.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return prisma.project.update({
      where: { id },
      data: { status: 'deleted', deletedAt: new Date() },
    });
  }
}
```

### 3.2 事务处理

```typescript
// 需要事务的操作示例：创建BOM版本并复制节点
async function deriveBomVersion(sourceVersionId: string, newVersionData: NewVersionData) {
  return prisma.$transaction(async (tx) => {
    // 1. 创建新版本
    const newVersion = await tx.bomVersion.create({
      data: {
        ...newVersionData,
        sourceVersionId,
      },
    });

    // 2. 复制源版本的所有节点
    const sourceNodes = await tx.bomNode.findMany({
      where: { bomVersionId: sourceVersionId },
    });

    const nodeIdMap = new Map<string, string>(); // 旧ID → 新ID

    for (const node of sourceNodes) {
      const newId = generateId();
      nodeIdMap.set(node.id, newId);
      await tx.bomNode.create({
        data: {
          ...node,
          id: newId,
          bomVersionId: newVersion.id,
          parentId: node.parentId ? nodeIdMap.get(node.parentId) || node.parentId : null,
        },
      });
    }

    // 3. 记录变更历史
    await tx.changeHistory.create({
      data: {
        bomVersionId: newVersion.id,
        changeType: 'create',
        changeSummary: `从版本 ${sourceVersionId} 派生创建`,
        changedBy: newVersionData.createdBy,
      },
    });

    return newVersion;
  });
}
```

### 3.3 查询优化

```typescript
// ✅ 正确：使用select只查询需要的字段
const projectList = await prisma.project.findMany({
  select: {
    id: true,
    name: true,
    projectCode: true,
    status: true,
    updatedAt: true,
    _count: { select: { bomVersions: true } },
  },
});

// ❌ 错误：查询所有字段（包含大量BOM数据）
const projectList = await prisma.project.findMany({
  include: { bomVersions: { include: { nodes: true } } },
});

// ✅ 正确：批量操作使用createMany
await prisma.bomNode.createMany({
  data: nodesToCreate,
  skipDuplicates: true,
});
```

---

## 4. Tauri IPC通信模式

### 4.1 命令定义规范（Rust端）

```rust
// src-tauri/src/commands/bom.rs
use crate::db::repositories::bom_node::BomNodeRepository;
use crate::models::bom_node::{CreateBomNodeInput, BomNodeResponse};
use crate::errors::AppError;

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
    // 1. 参数校验
    if name.is_empty() {
        return Err("节点名称不能为空".to_string());
    }
    if quantity <= 0 {
        return Err("数量必须大于0".to_string());
    }

    // 2. 业务规则校验
    let repo = BomNodeRepository::new();
    if let Some(pid) = &parent_id {
        let parent = repo.find_by_id(pid).await
            .map_err(|e| format!("查询父节点失败: {}", e))?
            .ok_or_else(|| "父节点不存在".to_string())?;

        // 检查层级深度
        if parent.level >= 10 {
            return Err("已达到最大层级深度(10级)".to_string());
        }
    }

    // 3. 执行数据库操作
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

    // 4. 返回结果
    Ok(node.into())
}
```

### 4.2 前端调用封装

```typescript
// utils/ipc.ts
import { invoke } from '@tauri-apps/api/core';
import { ElMessage } from 'element-plus';

/**
 * 安全的IPC调用封装
 * 统一错误处理和消息提示
 */
export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
  options?: {
    silent?: boolean;      // 是否静默（不弹出错误提示）
    successMessage?: string; // 成功提示信息
  }
): Promise<T> {
  try {
    const result = await invoke<T>(command, args);
    if (options?.successMessage) {
      ElMessage.success(options.successMessage);
    }
    return result;
  } catch (error) {
    const message = typeof error === 'string' ? error : '操作失败，请稍后重试';
    if (!options?.silent) {
      ElMessage.error(message);
    }
    throw new Error(message);
  }
}

// 使用示例
const newNode = await safeInvoke<BomNode>('create_bom_node', {
  versionId: 'bv-001',
  parentId: 'node-001',
  nodeType: 'component',
  name: 'STM32F407VGT6',
  quantity: 1,
}, {
  successMessage: '节点创建成功',
});
```

### 4.3 参数序列化规则

| TypeScript类型 | Rust类型 | 序列化规则 |
|---------------|---------|-----------|
| string | String | 直接传递 |
| number | i32/i64/f64 | 直接传递 |
| boolean | bool | 直接传递 |
| Date | String | 转为ISO 8601字符串 |
| Array | Vec<T> | JSON序列化 |
| Object | struct | JSON序列化，字段名snake_case |
| null/undefined | Option<T> | null映射为None |
| enum (string) | enum | 传递字符串值 |

---

## 5. 错误处理规范

### 5.1 错误分类

```typescript
// types/error.ts
export enum ErrorCode {
  // 客户端错误 (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',       // 400: 输入校验失败
  NOT_FOUND = 'NOT_FOUND',                     // 404: 资源不存在
  DUPLICATE_ERROR = 'DUPLICATE_ERROR',         // 409: 资源重复
  BUSINESS_RULE_ERROR = 'BUSINESS_RULE_ERROR', // 422: 业务规则违反

  // 服务端错误 (5xx)
  DATABASE_ERROR = 'DATABASE_ERROR',           // 500: 数据库错误
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',     // 500: 文件系统错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',           // 500: 内部错误

  // 导入导出错误
  IMPORT_ERROR = 'IMPORT_ERROR',               // 400: 导入失败
  EXPORT_ERROR = 'EXPORT_ERROR',               // 500: 导出失败
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### 5.2 全局错误处理器

```typescript
// main.ts
import { AppError, ErrorCode } from '@/types/error';

app.config.errorHandler = (err, instance, info) => {
  console.error('[Global Error]', err, info);

  if (err instanceof AppError) {
    switch (err.code) {
      case ErrorCode.VALIDATION_ERROR:
        ElMessage.warning(err.message);
        break;
      case ErrorCode.NOT_FOUND:
        ElMessage.error('请求的资源不存在');
        break;
      case ErrorCode.DUPLICATE_ERROR:
        ElMessage.warning('数据已存在，请勿重复操作');
        break;
      case ErrorCode.DATABASE_ERROR:
        ElMessage.error('数据库操作失败，请联系管理员');
        break;
      default:
        ElMessage.error(err.message);
    }
  } else {
    ElMessage.error('系统发生未知错误');
  }
};
```

---

## 6. 测试规范

### 6.1 单元测试

```typescript
// tests/unit/stores/bomStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBomStore } from '@/stores/bomStore';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');

describe('bomStore', () => {
  let store: ReturnType<typeof useBomStore>;

  beforeEach(() => {
    store = useBomStore();
    vi.clearAllMocks();
  });

  describe('loadBomTree', () => {
    it('应正确加载BOM树数据', async () => {
      const mockTree = { id: 'root', name: '主板', children: [] };
      vi.mocked(invoke).mockResolvedValue(mockTree);

      await store.loadBomTree('bv-001');

      expect(invoke).toHaveBeenCalledWith('get_bom_tree', { versionId: 'bv-001' });
      expect(store.treeData).toEqual(mockTree);
      expect(store.isLoading).toBe(false);
    });

    it('加载失败时应设置错误状态', async () => {
      vi.mocked(invoke).mockRejectedValue('网络错误');

      await store.loadBomTree('bv-001');

      expect(store.error).toBe('网络错误');
      expect(store.isLoading).toBe(false);
    });
  });
});
```

### 6.2 E2E测试

```typescript
// tests/e2e/bom-management.spec.ts
import { test, expect } from '@playwright/test';

test('创建BOM节点', async ({ page }) => {
  await page.goto('/');
  await page.click('text=智能网关V2.0');
  await page.click('text=主板BOM');

  // 右键点击根节点
  await page.click('.bom-tree .root-node', { button: 'right' });
  await page.click('text=添加子节点');

  // 填写节点信息
  await page.fill('[data-testid="node-name-input"]', '电源模块');
  await page.selectOption('[data-testid="node-type-select"]', 'assembly');
  await page.fill('[data-testid="node-quantity-input"]', '1');

  // 确认创建
  await page.click('text=确认');

  // 验证节点已添加
  await expect(page.locator('text=电源模块')).toBeVisible();
});
```

---

## 7. AI Agent提示词模板

### 7.1 模块生成提示词

```
请为BOM管理系统生成【{模块名}】模块的完整代码。

## 技术栈
- 前端：Vue 3 + TypeScript + Element Plus + Pinia
- 后端：Tauri (Rust) + Prisma ORM + SQLite
- 通信：Tauri IPC (invoke命令)

## 数据库模型
{相关Prisma Schema}

## API接口
{相关API定义}

## 编码规范
- 文件名：kebab-case
- 组件名：PascalCase
- Tauri命令：snake_case
- 使用Repository模式封装数据库操作
- 使用safeInvoke封装前端IPC调用
- 所有异步操作需处理loading和error状态

## 需要生成的文件
1. Rust命令处理器：src-tauri/src/commands/{module}.rs
2. Repository：src-tauri/src/db/repositories/{module}.rs
3. Pinia Store：src/stores/{module}Store.ts
4. Vue组件：src/views/{Module}/index.vue
5. 类型定义：src/types/{module}.ts
6. 单元测试：tests/unit/{module}.test.ts
```

### 7.2 组件生成提示词

```
请为BOM管理系统生成【{组件名}】Vue组件。

## 组件职责
{组件功能描述}

## Props
{Props定义}

## Emits
{Emits定义}

## 依赖的Store/Composable
{依赖列表}

## UI要求
- 使用Element Plus组件库
- 遵循系统视觉规范（主色#409EFF）
- 支持响应式布局
- 支持键盘导航

## 编码规范
- 使用<script setup lang="ts">
- Props使用defineProps<Type>()
- Emits使用defineEmits<Type>()
- 异步操作显示loading状态
- 错误使用ElMessage提示
```

### 7.3 API命令生成提示词

```
请为BOM管理系统生成【{命令名}】Tauri IPC命令的完整实现。

## 命令定义
- 命令名：{command_name}
- 功能：{描述}
- 请求参数：{参数列表及类型}
- 响应格式：{响应类型}
- 错误场景：{错误列表}

## 数据库模型
{相关Prisma Schema}

## 编码规范
- Rust端使用thiserror定义错误类型
- 参数校验在Rust端执行
- 数据库操作使用Repository模式
- 返回Result<T, String>格式
- 记录变更历史（如涉及数据修改）
```

### 7.4 数据库迁移提示词

```
请为BOM管理系统生成数据库迁移。

## 变更描述
{变更内容描述}

## 当前Schema
{当前Prisma Schema}

## 目标Schema
{目标Prisma Schema}

## 要求
1. 生成Prisma迁移命令
2. 新增字段必须提供默认值或允许NULL
3. 如有数据转换需求，提供种子脚本
4. 确保向后兼容
```

---

## 8. 项目目录结构详细规范

```
bom-master/
├── src-tauri/                          # Tauri后端 (Rust)
│   ├── src/
│   │   ├── main.rs                     # 应用入口，注册所有命令
│   │   ├── commands/                   # Tauri命令处理器
│   │   │   ├── mod.rs                  # 命令模块注册
│   │   │   ├── project.rs              # 项目管理命令
│   │   │   ├── bom.rs                  # BOM版本管理命令
│   │   │   ├── bom_node.rs             # BOM节点管理命令
│   │   │   ├── component.rs            # 元器件管理命令
│   │   │   ├── alternative.rs          # 替代料管理命令
│   │   │   ├── history.rs              # 变更历史命令
│   │   │   ├── import_export.rs        # 导入导出命令
│   │   │   └── settings.rs             # 系统设置命令
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── client.rs               # Prisma客户端初始化
│   │   │   └── repositories/           # 数据访问层
│   │   │       ├── mod.rs
│   │   │       ├── project.repository.rs
│   │   │       ├── bom_version.repository.rs
│   │   │       ├── bom_node.repository.rs
│   │   │       ├── component.repository.rs
│   │   │       ├── alternative.repository.rs
│   │   │       └── change_history.repository.rs
│   │   ├── models/                     # 数据模型
│   │   │   ├── mod.rs
│   │   │   ├── project.rs
│   │   │   ├── bom_node.rs
│   │   │   ├── component.rs
│   │   │   └── common.rs              # 通用模型（分页、响应等）
│   │   ├── services/                   # 业务逻辑层
│   │   │   ├── mod.rs
│   │   │   ├── bom_service.rs          # BOM业务逻辑
│   │   │   ├── import_service.rs       # 导入业务逻辑
│   │   │   └── export_service.rs       # 导出业务逻辑
│   │   └── errors.rs                   # 统一错误定义
│   ├── prisma/
│   │   └── schema.prisma               # 数据库模型定义
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                                # 前端 (Vue 3)
│   ├── assets/                         # 静态资源
│   │   ├── styles/                     # 全局样式
│   │   │   ├── variables.scss          # SCSS变量
│   │   │   ├── mixins.scss             # SCSS混入
│   │   │   └── global.scss             # 全局样式
│   │   └── icons/                      # 图标资源
│   ├── components/                     # 通用组件
│   │   ├── common/                     # 基础组件
│   │   │   ├── AppHeader.vue           # 顶部导航栏
│   │   │   ├── AppSidebar.vue          # 侧边栏
│   │   │   └── AppStatus.vue           # 底部状态栏
│   │   ├── bom/                        # BOM相关组件
│   │   │   ├── BomTree.vue             # BOM树组件
│   │   │   ├── BomNodeCard.vue         # 节点信息卡片
│   │   │   ├── NodeEditDialog.vue      # 节点编辑对话框
│   │   │   └── AlternativeTag.vue      # 替代料标签
│   │   └── import/                     # 导入相关组件
│   │       ├── ImportDialog.vue        # 导入对话框
│   │       ├── FieldMapping.vue        # 字段映射组件
│   │       └── ImportPreview.vue       # 导入预览组件
│   ├── composables/                    # 组合式函数
│   │   ├── useBomTree.ts              # BOM树操作
│   │   ├── useSearch.ts               # 搜索功能
│   │   ├── useImport.ts               # 导入功能
│   │   ├── useExport.ts               # 导出功能
│   │   └── useUndoRedo.ts             # 撤销重做
│   ├── layouts/                        # 布局组件
│   │   └── MainLayout.vue             # 主布局
│   ├── router/                         # 路由配置
│   │   └── index.ts
│   ├── stores/                         # Pinia状态管理
│   │   ├── projectStore.ts            # 项目状态
│   │   ├── bomStore.ts                # BOM状态
│   │   ├── historyStore.ts            # 变更历史状态
│   │   └── uiStore.ts                 # UI状态
│   ├── types/                          # TypeScript类型定义
│   │   ├── bom.ts                     # BOM相关类型
│   │   ├── project.ts                 # 项目相关类型
│   │   ├── component.ts               # 元器件相关类型
│   │   ├── api.ts                     # API响应类型
│   │   └── error.ts                   # 错误类型
│   ├── utils/                          # 工具函数
│   │   ├── ipc.ts                     # IPC调用封装
│   │   ├── excel.ts                   # Excel处理工具
│   │   ├── validator.ts               # 数据校验工具
│   │   └── formatter.ts               # 格式化工具
│   ├── views/                          # 页面组件
│   │   ├── ProjectList.vue            # 项目列表页
│   │   ├── ProjectDetail.vue          # 项目详情页
│   │   ├── BomEditor.vue              # BOM编辑页
│   │   ├── ComponentLibrary.vue       # 元器件库页
│   │   └── Settings.vue               # 设置页
│   ├── App.vue
│   └── main.ts
├── prisma/                             # Prisma Schema（前端引用）
│   ├── schema.prisma
│   └── migrations/
├── tests/                              # 测试文件
│   ├── unit/
│   │   ├── stores/
│   │   ├── composables/
│   │   └── utils/
│   └── e2e/
│       ├── project.spec.ts
│       ├── bom-editor.spec.ts
│       └── import-export.spec.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .eslintrc.cjs
├── .prettierrc
└── .gitignore
```

---

## 9. Git提交规范

### 9.1 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 9.2 Type枚举

| Type | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复Bug |
| docs | 文档变更 |
| style | 代码格式（不影响功能） |
| refactor | 重构（不新增功能也不修复Bug） |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具变更 |
| ci | CI/CD配置 |

### 9.3 Scope枚举

| Scope | 说明 |
|-------|------|
| project | 项目管理模块 |
| bom | BOM版本管理模块 |
| node | BOM节点管理模块 |
| component | 元器件管理模块 |
| alternative | 替代料管理模块 |
| import | 导入功能 |
| export | 导出功能 |
| history | 变更历史模块 |
| settings | 系统设置 |
| ui | UI组件 |
| db | 数据库相关 |

### 9.4 示例

```
feat(node): 支持拖拽调整BOM节点层级

- 实现节点拖拽排序功能
- 添加层级深度校验（最大10级）
- 拖拽时显示放置位置指示器

Closes #123
```
