# BOM管理系统 - API接口规范文档 (APISpec)

> 版本: v1.0 | 日期: 2026-05-28

---

## 1. 全局约定

### 1.1 基础路径

所有Tauri IPC命令通过 `invoke()` 调用，命令名使用 `snake_case` 命名法。

### 1.2 统一响应格式

所有命令返回值遵循以下格式：

**成功响应**：

```typescript
{
  success: true,
  data: T,           // 业务数据
  message: "操作成功"  // 可选提示信息
}
```

**错误响应**：

```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",  // 错误码
    message: "项目名称不能为空",  // 用户友好错误信息
    details: {}                 // 可选的详细信息
  }
}
```

### 1.3 分页参数

涉及列表查询的命令统一支持以下分页参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码（从1开始） |
| pageSize | number | 20 | 每页条数（最大100） |
| sortBy | string | 'createdAt' | 排序字段 |
| sortOrder | string | 'desc' | 排序方向：asc/desc |

分页响应格式：

```typescript
{
  success: true,
  data: {
    items: T[],        // 数据列表
    total: number,     // 总条数
    page: number,      // 当前页码
    pageSize: number,  // 每页条数
    totalPages: number // 总页数
  }
}
```

### 1.4 错误码体系

| 错误码 | HTTP等价 | 说明 |
|--------|---------|------|
| VALIDATION_ERROR | 400 | 输入参数校验失败 |
| NOT_FOUND | 404 | 资源不存在 |
| DUPLICATE_ERROR | 409 | 资源重复（唯一约束冲突） |
| BUSINESS_RULE_ERROR | 422 | 业务规则校验失败 |
| DATABASE_ERROR | 500 | 数据库操作失败 |
| FILE_SYSTEM_ERROR | 500 | 文件系统操作失败 |
| IMPORT_ERROR | 400 | 数据导入失败 |
| EXPORT_ERROR | 500 | 数据导出失败 |

---

## 2. 项目管理 API

### 2.1 创建项目

- **命令**：`create_project`
- **描述**：创建新项目

**请求参数**：

```typescript
{
  name: string;          // 项目名称（必填，1-100字符）
  projectCode: string;   // 项目编号（必填，格式：PRJ-YYYY-NNN）
  description?: string;  // 项目描述（可选，最大500字符）
  owner: string;         // 负责人（必填）
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    id: "proj-001",
    name: "智能网关V2.0",
    projectCode: "PRJ-2026-001",
    description: "新一代智能网关产品",
    owner: "张工",
    status: "active",
    createdAt: "2026-05-28T10:00:00Z",
    updatedAt: "2026-05-28T10:00:00Z"
  }
}
```

**错误场景**：
- `DUPLICATE_ERROR`：项目名称或编号已存在
- `VALIDATION_ERROR`：必填字段为空或格式不正确

### 2.2 获取项目列表

- **命令**：`list_projects`
- **描述**：获取项目列表，支持筛选和分页

**请求参数**：

```typescript
{
  status?: string;     // 按状态筛选：active/archived/deleted
  keyword?: string;    // 按名称/编号模糊搜索
  page?: number;       // 页码
  pageSize?: number;   // 每页条数
  sortBy?: string;     // 排序字段
  sortOrder?: string;  // 排序方向
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    items: [
      {
        id: "proj-001",
        name: "智能网关V2.0",
        projectCode: "PRJ-2026-001",
        owner: "张工",
        status: "active",
        bomCount: 3,
        lastModifiedAt: "2026-05-28T10:00:00Z",
        createdAt: "2026-05-01T08:00:00Z"
      }
    ],
    total: 15,
    page: 1,
    pageSize: 20,
    totalPages: 1
  }
}
```

### 2.3 获取项目详情

- **命令**：`get_project`
- **描述**：获取单个项目的详细信息

**请求参数**：

```typescript
{
  projectId: string;  // 项目ID
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    id: "proj-001",
    name: "智能网关V2.0",
    projectCode: "PRJ-2026-001",
    description: "新一代智能网关产品",
    owner: "张工",
    status: "active",
    bomVersions: [
      { id: "bv-001", name: "主板BOM", versionNumber: "v1.0", status: "released" }
    ],
    createdAt: "2026-05-01T08:00:00Z",
    updatedAt: "2026-05-28T10:00:00Z"
  }
}
```

**错误场景**：
- `NOT_FOUND`：项目不存在

### 2.4 更新项目

- **命令**：`update_project`
- **描述**：更新项目信息

**请求参数**：

```typescript
{
  projectId: string;      // 项目ID
  name?: string;          // 新名称
  description?: string;   // 新描述
  owner?: string;         // 新负责人
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    id: "proj-001",
    name: "智能网关V2.0（更新）",
    // ... 更新后的完整项目信息
  }
}
```

### 2.5 归档项目

- **命令**：`archive_project`
- **描述**：将项目标记为归档状态

**请求参数**：

```typescript
{
  projectId: string;  // 项目ID
}
```

**响应示例**：

```typescript
{
  success: true,
  data: { id: "proj-001", status: "archived" },
  message: "项目已归档"
}
```

### 2.6 删除项目

- **命令**：`delete_project`
- **描述**：软删除项目（30天内可恢复）

**请求参数**：

```typescript
{
  projectId: string;   // 项目ID
  permanent?: boolean;  // 是否永久删除（默认false）
}
```

**响应示例**：

```typescript
{
  success: true,
  data: { id: "proj-001", status: "deleted", deletedAt: "2026-05-28T10:00:00Z" },
  message: "项目已删除，30天内可恢复"
}
```

---

## 3. BOM版本管理 API

### 3.1 创建BOM版本

- **命令**：`create_bom_version`
- **描述**：在项目下创建新的BOM版本

**请求参数**：

```typescript
{
  projectId: string;         // 所属项目ID
  name: string;              // BOM名称（必填）
  versionNumber?: string;    // 版本号（默认v1.0）
  description?: string;      // 版本描述
  sourceVersionId?: string;  // 派生来源版本ID（可选，用于基于旧版本创建）
  createdBy: string;         // 创建人
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    id: "bv-002",
    projectId: "proj-001",
    name: "主板BOM",
    versionNumber: "v1.1",
    status: "draft",
    sourceVersionId: "bv-001",
    description: "更新电源模块",
    createdBy: "张工",
    createdAt: "2026-05-28T10:00:00Z"
  }
}
```

**错误场景**：
- `DUPLICATE_ERROR`：同一项目下BOM名称+版本号重复
- `BUSINESS_RULE_ERROR`：派生来源版本不存在

### 3.2 获取BOM版本列表

- **命令**：`list_bom_versions`
- **描述**：获取项目下所有BOM版本

**请求参数**：

```typescript
{
  projectId: string;    // 项目ID
  status?: string;      // 按状态筛选
  keyword?: string;     // 按名称搜索
}
```

### 3.3 发布BOM版本

- **命令**：`release_bom_version`
- **描述**：将草稿版本发布，发布后不可直接修改

**请求参数**：

```typescript
{
  versionId: string;  // BOM版本ID
}
```

**错误场景**：
- `BUSINESS_RULE_ERROR`：版本状态不是draft，无法发布

### 3.4 获取BOM版本详情

- **命令**：`get_bom_version`
- **描述**：获取BOM版本详细信息，包含根节点概要

**请求参数**：

```typescript
{
  versionId: string;  // BOM版本ID
}
```

---

## 4. BOM节点管理 API

### 4.1 获取BOM树

- **命令**：`get_bom_tree`
- **描述**：获取完整BOM树结构

**请求参数**：

```typescript
{
  versionId: string;   // BOM版本ID
  expandAll?: boolean; // 是否展开所有节点（默认false）
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    id: "node-001",
    name: "智能网关主板",
    nodeType: "assembly",
    quantity: 1,
    unit: "PCS",
    level: 0,
    children: [
      {
        id: "node-002",
        name: "电源模块",
        nodeType: "assembly",
        quantity: 1,
        unit: "PCS",
        level: 1,
        children: [
          {
            id: "node-003",
            name: "LM2596S-5.0",
            nodeType: "component",
            quantity: 1,
            unit: "PCS",
            level: 2,
            componentId: "comp-001",
            hasAlternatives: true,
            children: []
          }
        ]
      }
    ]
  }
}
```

### 4.2 创建BOM节点

- **命令**：`create_bom_node`
- **描述**：在指定父节点下创建子节点

**请求参数**：

```typescript
{
  versionId: string;        // BOM版本ID
  parentId: string | null;  // 父节点ID（根节点传null）
  nodeType: string;         // 节点类型：assembly/component
  name: string;             // 节点名称/型号
  quantity: number;         // 数量（默认1）
  unit?: string;            // 单位（默认PCS）
  componentId?: string;     // 关联元器件ID（component类型必填）
  referenceDesignator?: string; // 位号
  notes?: string;           // 备注
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    id: "node-005",
    versionId: "bv-001",
    parentId: "node-001",
    nodeType: "component",
    name: "STM32F407VGT6",
    quantity: 1,
    unit: "PCS",
    level: 1,
    sortOrder: 2,
    componentId: "comp-002",
    createdAt: "2026-05-28T10:00:00Z"
  }
}
```

**错误场景**：
- `BUSINESS_RULE_ERROR`：层级超过10级限制
- `DUPLICATE_ERROR`：同一父节点下名称重复
- `VALIDATION_ERROR`：component类型节点未提供componentId

### 4.3 更新BOM节点

- **命令**：`update_bom_node`
- **描述**：更新节点属性

**请求参数**：

```typescript
{
  nodeId: string;           // 节点ID
  name?: string;            // 新名称
  quantity?: number;        // 新数量
  unit?: string;            // 新单位
  referenceDesignator?: string; // 新位号
  notes?: string;           // 新备注
}
```

**错误场景**：
- `BUSINESS_RULE_ERROR`：版本已发布，不可修改

### 4.4 删除BOM节点

- **命令**：`delete_bom_node`
- **描述**：删除节点及其所有子节点

**请求参数**：

```typescript
{
  nodeId: string;       // 节点ID
  cascade?: boolean;    // 是否级联删除子节点（默认true）
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    deletedNodeId: "node-005",
    deletedCount: 3,  // 包含子节点的删除总数
  },
  message: "已删除1个节点及其2个子节点"
}
```

### 4.5 移动BOM节点

- **命令**：`move_bom_node`
- **描述**：移动节点到新的父节点下

**请求参数**：

```typescript
{
  nodeId: string;       // 要移动的节点ID
  newParentId: string | null;  // 新父节点ID
  newSortOrder?: number;       // 新排序位置
}
```

**错误场景**：
- `BUSINESS_RULE_ERROR`：移动后层级超过10级
- `BUSINESS_RULE_ERROR`：不能将节点移动到自身或其子节点下

---

## 5. 元器件管理 API

### 5.1 创建元器件

- **命令**：`create_component`
- **描述**：创建新元器件

**请求参数**：

```typescript
{
  partNumber: string;       // 型号（必填）
  manufacturer?: string;    // 厂商
  category?: string;        // 类别
  subCategory?: string;     // 子类别
  description?: string;     // 描述
  packageType?: string;     // 封装类型
  specifications?: object;  // 规格参数（JSON）
  datasheetUrl?: string;    // 数据手册链接
  defaultUnit?: string;     // 默认单位
}
```

**错误场景**：
- `DUPLICATE_ERROR`：同厂商下型号已存在

### 5.2 搜索元器件

- **命令**：`search_components`
- **描述**：按关键词和条件搜索元器件

**请求参数**：

```typescript
{
  keyword?: string;       // 搜索关键词（型号/描述/厂商）
  category?: string;      // 按类别筛选
  manufacturer?: string;  // 按厂商筛选
  hasAlternatives?: boolean; // 是否有替代料
  page?: number;
  pageSize?: number;
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    items: [
      {
        id: "comp-001",
        partNumber: "LM2596S-5.0",
        manufacturer: "TI",
        category: "电源IC",
        packageType: "TO-263",
        hasAlternatives: true,
        alternativeCount: 2,
        usedInBoms: 3  // 被多少个BOM使用
      }
    ],
    total: 45,
    page: 1,
    pageSize: 20
  }
}
```

### 5.3 获取元器件详情

- **命令**：`get_component`
- **描述**：获取元器件详细信息，包含替代料和供应商

**请求参数**：

```typescript
{
  componentId: string;  // 元器件ID
  includeAlternatives?: boolean;  // 是否包含替代料（默认true）
  includeSuppliers?: boolean;     // 是否包含供应商（默认true）
}
```

### 5.4 更新元器件

- **命令**：`update_component`
- **描述**：更新元器件信息

**请求参数**：

```typescript
{
  componentId: string;
  partNumber?: string;
  manufacturer?: string;
  category?: string;
  description?: string;
  packageType?: string;
  specifications?: object;
  datasheetUrl?: string;
}
```

---

## 6. 替代料管理 API

### 6.1 添加替代料

- **命令**：`add_alternative_part`
- **描述**：为元器件添加替代料

**请求参数**：

```typescript
{
  originalComponentId: string;     // 原元器件ID
  alternativeComponentId: string;  // 替代元器件ID
  priority?: number;               // 优先级（默认1）
  verificationStatus?: string;     // 验证状态（默认unverified）
  notes?: string;                  // 备注
}
```

**错误场景**：
- `DUPLICATE_ERROR`：替代料关系已存在
- `VALIDATION_ERROR`：替代料与原件相同
- `NOT_FOUND`：元器件不存在

### 6.2 获取替代料列表

- **命令**：`list_alternative_parts`
- **描述**：获取某元器件的所有替代料

**请求参数**：

```typescript
{
  componentId: string;  // 元器件ID
}
```

**响应示例**：

```typescript
{
  success: true,
  data: [
    {
      id: "alt-001",
      originalComponentId: "comp-001",
      alternativeComponent: {
        id: "comp-004",
        partNumber: "LM2596S-5.0-A",
        manufacturer: "TI",
        category: "电源IC"
      },
      priority: 1,
      verificationStatus: "verified",
      notes: "完全兼容替代",
      verifiedBy: "张工",
      verifiedAt: "2026-05-20T10:00:00Z"
    }
  ]
}
```

### 6.3 更新替代料

- **命令**：`update_alternative_part`
- **描述**：更新替代料信息

**请求参数**：

```typescript
{
  alternativeId: string;        // 替代料记录ID
  priority?: number;            // 新优先级
  verificationStatus?: string;  // 新验证状态
  notes?: string;               // 新备注
  verifiedBy?: string;          // 验证人
}
```

### 6.4 删除替代料

- **命令**：`remove_alternative_part`
- **描述**：移除替代料关系

**请求参数**：

```typescript
{
  alternativeId: string;  // 替代料记录ID
}
```

### 6.5 提升替代料为正式料

- **命令**：`promote_alternative`
- **描述**：将替代料替换原元器件，更新所有引用该元器件的BOM节点

**请求参数**：

```typescript
{
  alternativeId: string;     // 替代料记录ID
  bomVersionId?: string;    // 指定BOM版本（不传则更新所有版本）
  createNewVersion?: boolean; // 是否创建新版本（默认true）
}
```

---

## 7. 变更历史 API

### 7.1 获取变更历史

- **命令**：`get_change_history`
- **描述**：获取BOM版本的变更历史记录

**请求参数**：

```typescript
{
  bomVersionId: string;     // BOM版本ID
  nodeId?: string;          // 按节点筛选
  changeType?: string;      // 按变更类型筛选
  startDate?: string;       // 起始日期
  endDate?: string;         // 结束日期
  changedBy?: string;       // 按操作人筛选
  page?: number;
  pageSize?: number;
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    items: [
      {
        id: "ch-001",
        bomVersionId: "bv-001",
        nodeId: "node-003",
        changeType: "update",
        fieldName: "quantity",
        oldValue: "1",
        newValue: "2",
        changeSummary: "LM2596S-5.0 数量从1改为2",
        changedBy: "张工",
        createdAt: "2026-05-28T10:30:00Z"
      }
    ],
    total: 25,
    page: 1,
    pageSize: 20
  }
}
```

### 7.2 对比BOM版本

- **命令**：`compare_bom_versions`
- **描述**：对比两个BOM版本的差异

**请求参数**：

```typescript
{
  sourceVersionId: string;  // 源版本ID
  targetVersionId: string;  // 目标版本ID
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    sourceVersion: { id: "bv-001", versionNumber: "v1.0" },
    targetVersion: { id: "bv-002", versionNumber: "v1.1" },
    differences: [
      {
        type: "added",       // added/removed/modified
        nodeId: "node-006",
        name: "TPS5430DDAR",
        details: "新增元器件节点"
      },
      {
        type: "modified",
        nodeId: "node-003",
        name: "LM2596S-5.0",
        changes: [
          { field: "quantity", oldValue: "1", newValue: "2" }
        ]
      },
      {
        type: "removed",
        nodeId: "node-007",
        name: "旧电容",
        details: "删除元器件节点"
      }
    ],
    summary: {
      added: 1,
      removed: 1,
      modified: 1,
      totalChanges: 3
    }
  }
}
```

---

## 8. 导入导出 API

### 8.1 导入Excel BOM

- **命令**：`import_bom_from_excel`
- **描述**：从Excel文件导入BOM数据

**请求参数**：

```typescript
{
  filePath: string;          // Excel文件路径
  bomVersionId: string;      // 目标BOM版本ID
  fieldMapping: {            // 字段映射关系
    partNumber: string;      // Excel列名 → 系统字段"型号"
    quantity: string;        // Excel列名 → 系统字段"数量"
    manufacturer?: string;   // Excel列名 → 系统字段"厂商"
    category?: string;       // Excel列名 → 系统字段"类别"
    description?: string;    // Excel列名 → 系统字段"描述"
    unit?: string;           // Excel列名 → 系统字段"单位"
    referenceDesignator?: string; // Excel列名 → 系统字段"位号"
    notes?: string;          // Excel列名 → 系统字段"备注"
  };
  options?: {
    skipDuplicates?: boolean;  // 跳过重复项（默认true）
    createMissingComponents?: boolean; // 自动创建不存在的元器件（默认true）
    maxLevel?: number;         // 最大层级深度（默认10）
  }
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    totalRows: 150,
    importedRows: 145,
    skippedRows: 3,
    errorRows: 2,
    errors: [
      { row: 23, message: "型号字段为空" },
      { row: 67, message: "数量格式不正确：'abc'" }
    ],
    createdComponents: 12,  // 新创建的元器件数量
    createdNodes: 145       // 新创建的节点数量
  }
}
```

### 8.2 校验导入数据

- **命令**：`validate_import_data`
- **描述**：校验Excel数据，不实际写入数据库

**请求参数**：同 `import_bom_from_excel`

**响应示例**：

```typescript
{
  success: true,
  data: {
    valid: false,
    totalRows: 150,
    errors: [
      { row: 23, column: "A", severity: "error", message: "型号字段为空" },
      { row: 45, column: "C", severity: "warning", message: "厂商名称可能不规范" },
      { row: 67, column: "B", severity: "error", message: "数量格式不正确" }
    ],
    errorCount: 2,
    warningCount: 1
  }
}
```

### 8.3 导出BOM

- **命令**：`export_bom_to_excel`
- **描述**：将BOM导出为Excel文件

**请求参数**：

```typescript
{
  bomVersionId: string;    // BOM版本ID
  filePath: string;        // 导出文件保存路径
  options?: {
    exportScope: string;   // 导出范围：all/topLevel/leafOnly
    includeFields: string[]; // 包含的字段列表
    includeAlternatives?: boolean; // 是否包含替代料信息
    indentLevels?: boolean;  // 是否用缩进表示层级
  }
}
```

**响应示例**：

```typescript
{
  success: true,
  data: {
    filePath: "C:/Users/张工/Documents/智能网关V2.0_主板BOM_v1.0_20260528.xlsx",
    totalRows: 150,
    fileSize: 25600  // 字节
  },
  message: "导出成功"
}
```

### 8.4 下载导入模板

- **命令**：`download_import_template`
- **描述**：生成并保存Excel导入模板

**请求参数**：

```typescript
{
  filePath: string;  // 模板保存路径
}
```

---

## 9. 系统设置 API

### 9.1 获取设置

- **命令**：`get_settings`
- **描述**：获取所有用户设置

**请求参数**：

```typescript
{
  keys?: string[];  // 指定获取的设置键（不传则获取全部）
}
```

### 9.2 更新设置

- **命令**：`update_settings`
- **描述**：批量更新用户设置

**请求参数**：

```typescript
{
  settings: {
    [key: string]: any;  // 设置键值对
  }
}
// 示例：
{
  settings: {
    "theme": "dark",
    "language": "zh-CN",
    "autoBackup": true,
    "backupInterval": 24,
    "defaultBomLevel": 5
  }
}
```

### 9.3 触发备份

- **命令**：`trigger_backup`
- **描述**：手动触发数据库备份

**请求参数**：

```typescript
{
  backupPath?: string;  // 备份保存路径（不传使用默认路径）
}
```

### 9.4 从备份恢复

- **命令**：`restore_from_backup`
- **描述**：从备份文件恢复数据库

**请求参数**：

```typescript
{
  backupFilePath: string;  // 备份文件路径
  confirmOverwrite: boolean; // 确认覆盖当前数据
}
```

---

## 10. Tauri IPC命令注册汇总

| 命令名 | 模块 | 说明 |
|--------|------|------|
| `create_project` | 项目管理 | 创建项目 |
| `list_projects` | 项目管理 | 获取项目列表 |
| `get_project` | 项目管理 | 获取项目详情 |
| `update_project` | 项目管理 | 更新项目 |
| `archive_project` | 项目管理 | 归档项目 |
| `delete_project` | 项目管理 | 删除项目 |
| `create_bom_version` | BOM版本 | 创建BOM版本 |
| `list_bom_versions` | BOM版本 | 获取版本列表 |
| `get_bom_version` | BOM版本 | 获取版本详情 |
| `release_bom_version` | BOM版本 | 发布版本 |
| `archive_bom_version` | BOM版本 | 归档版本 |
| `get_bom_tree` | BOM节点 | 获取BOM树 |
| `create_bom_node` | BOM节点 | 创建节点 |
| `update_bom_node` | BOM节点 | 更新节点 |
| `delete_bom_node` | BOM节点 | 删除节点 |
| `move_bom_node` | BOM节点 | 移动节点 |
| `create_component` | 元器件 | 创建元器件 |
| `search_components` | 元器件 | 搜索元器件 |
| `get_component` | 元器件 | 获取元器件详情 |
| `update_component` | 元器件 | 更新元器件 |
| `add_alternative_part` | 替代料 | 添加替代料 |
| `list_alternative_parts` | 替代料 | 获取替代料列表 |
| `update_alternative_part` | 替代料 | 更新替代料 |
| `remove_alternative_part` | 替代料 | 删除替代料 |
| `promote_alternative` | 替代料 | 提升替代料为正式料 |
| `get_change_history` | 变更历史 | 获取变更历史 |
| `compare_bom_versions` | 变更历史 | 对比版本差异 |
| `import_bom_from_excel` | 导入导出 | 导入Excel |
| `validate_import_data` | 导入导出 | 校验导入数据 |
| `export_bom_to_excel` | 导入导出 | 导出Excel |
| `download_import_template` | 导入导出 | 下载导入模板 |
| `get_settings` | 系统设置 | 获取设置 |
| `update_settings` | 系统设置 | 更新设置 |
| `trigger_backup` | 系统设置 | 触发备份 |
| `restore_from_backup` | 系统设置 | 从备份恢复 |
