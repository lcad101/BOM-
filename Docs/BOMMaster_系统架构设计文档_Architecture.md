# BOM管理系统 - 系统架构设计文档 (Architecture)

> 版本: v1.0 | 日期: 2026-05-28

---

## 1. 架构原则

1. **严格分层**：表现层(UI)、业务逻辑层(Service)、数据访问层(DAL)严禁跨层调用。Vue组件只能调用Service层，Service层只能调用DAL层，DAL层操作数据库。
2. **高内聚低耦合**：模块间通过接口/事件通信，避免直接依赖具体实现。使用Pinia Store作为模块间通信桥梁。
3. **单一职责**：每个模块、组件、函数只负责一个明确的功能领域。
4. **数据驱动**：UI状态由数据驱动，遵循Vue的响应式设计原则，禁止直接操作DOM。
5. **安全优先**：所有用户输入必须校验，数据库操作使用参数化查询，敏感数据加密存储。

---

## 2. 系统分层架构

### 2.1 四层架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    表现层 (Presentation)                  │
│  Vue 3 组件 + Element Plus + ECharts                     │
│  职责: 用户交互、数据展示、表单校验                         │
├─────────────────────────────────────────────────────────┤
│                    应用层 (Application)                   │
│  Pinia Stores + Composables + Tauri IPC Client           │
│  职责: 业务流程编排、状态管理、跨模块协调                     │
├─────────────────────────────────────────────────────────┤
│                    领域层 (Domain)                        │
│  Tauri Commands (Rust) + 业务规则引擎                      │
│  职责: 核心业务逻辑、数据校验、权限控制                       │
├─────────────────────────────────────────────────────────┤
│                  基础设施层 (Infrastructure)               │
│  Prisma ORM + SQLite + 文件系统                           │
│  职责: 数据持久化、文件读写、外部服务交互                     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 各层职责与边界

| 层级 | 组件 | 允许调用 | 禁止调用 |
|------|------|---------|---------|
| 表现层 | Vue组件、布局、页面 | 应用层(Pinia/Composables) | 直接调用Tauri IPC、直接操作数据库 |
| 应用层 | Pinia Store、Composables | 表现层(被调用)、领域层(Tauri IPC) | 直接操作DOM、直接操作数据库 |
| 领域层 | Tauri Commands(Rust) | 应用层(被调用)、基础设施层(Prisma) | 直接操作UI、跨命令直接依赖 |
| 基础设施层 | Prisma、SQLite、文件系统 | 领域层(被调用) | 被表现层或应用层直接调用 |

---

## 3. Tauri IPC通信架构

### 3.1 通信流程

```
Vue组件 → Pinia Store → invoke('command_name', args) → Rust Command Handler → Prisma → SQLite
                                                    ↓
Vue组件 ← Pinia Store ← Result<T, Error> ← Rust Command Handler ← Prisma ← SQLite
```

### 3.2 命令注册规范

**Rust端命令定义** (`src-tauri/src/commands/`):

```rust
#[tauri::command]
async fn create_project(name: String, description: String) -> Result<Project, String> {
    // 业务逻辑处理
    let project = db::create_project(name, description)
        .await
        .map_err(|e| e.to_string())?;
    Ok(project)
}
```

**Rust端命令注册** (`src-tauri/src/main.rs`):

```rust
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::project::create_project,
            commands::project::list_projects,
            commands::bom::create_bom_version,
            commands::bom::get_bom_tree,
            // ... 所有命令
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**前端调用** (`src/stores/` 或 `src/composables/`):

```typescript
import { invoke } from '@tauri-apps/api/core';

async function createProject(name: string, description: string): Promise<Project> {
  return await invoke<Project>('create_project', { name, description });
}
```

### 3.3 数据序列化

- 前后端通信使用JSON序列化/反序列化。
- Rust端使用 `serde::Serialize` / `serde::Deserialize` 派生宏。
- 日期时间统一使用ISO 8601字符串格式 (`2026-05-28T10:30:00Z`)。
- 枚举值使用字符串而非数字，增强可读性。

---

## 4. 模块划分

### 4.1 核心模块

| 模块 | 职责 | 关键文件 | 依赖模块 |
|------|------|---------|---------|
| **项目管理** | 项目的CRUD、归档、搜索 | `commands/project.rs`, `stores/projectStore.ts` | 无 |
| **BOM版本管理** | 版本创建、发布、归档、派生 | `commands/bom.rs`, `stores/bomStore.ts` | 项目管理 |
| **BOM节点管理** | 树结构操作、节点增删改、拖拽排序 | `commands/bom_node.rs`, `composables/useBomTree.ts` | BOM版本管理 |
| **元器件管理** | 元器件信息维护、搜索、去重 | `commands/component.rs`, `composables/useSearch.ts` | BOM节点管理 |
| **替代料管理** | 替代料添加、优先级排序、验证状态 | `commands/alternative.rs`, `stores/bomStore.ts` | 元器件管理 |
| **导入导出** | Excel文件解析、字段映射、数据导出 | `commands/import_export.rs`, `composables/useImport.ts` | BOM节点管理、元器件管理 |
| **变更历史** | 变更记录、版本对比 | `commands/history.rs`, `stores/historyStore.ts` | BOM版本管理 |
| **系统设置** | 用户偏好、备份恢复、主题切换 | `commands/settings.rs`, `stores/uiStore.ts` | 无 |

### 4.2 模块依赖关系

```
项目管理 ←── BOM版本管理 ←── BOM节点管理 ←── 元器件管理 ←── 替代料管理
                │                   │                    │
                │                   ├── 导入导出          │
                │                   │                    │
                └── 变更历史 ←──────┘                    │
                                   │                    │
                                   └────────────────────┘
系统设置 (独立模块，无外部依赖)
```

---

## 5. 数据流设计

### 5.1 CRUD操作数据流

以"创建BOM节点"为例：

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

### 5.2 Excel导入数据流

```
1. 用户上传Excel文件
2. 前端使用xlsx库解析文件，提取列名
3. 显示字段映射界面，用户映射Excel列到系统字段
4. 前端将映射关系和文件数据发送到Rust端
5. Rust端校验数据（必填项、数据类型、重复检测）
6. 返回校验结果给前端，显示预览表格
7. 用户确认导入，调用 invoke('confirm_import', { mappedData })
8. Rust端批量写入数据库（使用事务）
9. 返回导入结果摘要（成功/失败/跳过行数）
10. bomStore刷新BOM树数据
```

### 5.3 BOM导出数据流

```
1. 用户点击"导出BOM"，选择导出范围和字段
2. 调用 invoke('export_bom', { bomVersionId, options })
3. Rust端查询BOM数据，按层级排序
4. 使用Rust端xlsx库生成Excel文件
5. 保存到用户选择的路径
6. 返回导出结果（文件路径、行数）
7. 前端提示导出成功，提供"打开文件"按钮
```

### 5.4 搜索数据流

```
1. 用户在搜索框输入关键词
2. 前端防抖处理（300ms延迟）
3. 调用 invoke('search_components', { keyword, filters })
4. Rust端执行全文搜索（型号、描述、厂商）
5. 返回匹配结果列表
6. 前端高亮显示匹配节点，展开父节点
```

---

## 6. 状态管理架构

### 6.1 Pinia Store设计

采用模块化Store设计，每个业务领域一个独立Store：

| Store | 状态 | 操作 (Actions) |
|-------|------|---------------|
| `projectStore` | 项目列表、当前项目、筛选条件 | loadProjects, createProject, archiveProject, setCurrentProject |
| `bomStore` | BOM树数据、当前版本、选中节点、展开状态 | loadBomTree, addNode, removeNode, updateNode, moveNode, selectNode |
| `historyStore` | 变更历史列表、对比数据 | loadHistory, compareVersions, getDiff |
| `uiStore` | 侧边栏状态、主题、语言、快捷键 | toggleSidebar, setTheme, setLanguage |

### 6.2 Store通信模式

```typescript
// Store间通过action调用通信，禁止直接修改其他Store状态
// bomStore需要项目信息时：
import { useProjectStore } from './projectStore';

export const useBomStore = defineStore('bom', () => {
  const projectStore = useProjectStore();

  async function loadBomTree(versionId: string) {
    const projectId = projectStore.currentProject.id;
    const tree = await invoke('get_bom_tree', { projectId, versionId });
    bomTree.value = tree;
  }
});
```

### 6.3 状态持久化

- 关键UI状态（侧边栏宽度、主题、语言）通过 `pinia-plugin-persistedstate` 持久化到localStorage。
- 业务数据通过Tauri IPC持久化到SQLite，不使用localStorage存储业务数据。

---

## 7. 错误处理架构

### 7.1 错误分类

| 错误类型 | 来源 | 处理策略 |
|---------|------|---------|
| **校验错误** | 前端表单校验 | 即时提示，阻止提交 |
| **业务错误** | Rust端业务规则校验 | 返回错误信息，前端展示 |
| **数据库错误** | Prisma/SQLite | 记录日志，返回友好提示 |
| **文件系统错误** | 文件读写操作 | 记录日志，提示用户检查文件 |
| **系统错误** | Tauri运行时 | 记录日志，提示重启应用 |

### 7.2 全局错误处理器

**前端全局错误处理**：

```typescript
// main.ts
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err, info);
  ElMessage.error('系统发生错误，请稍后重试');
};

// Tauri IPC错误处理封装
async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const message = typeof error === 'string' ? error : '未知错误';
    ElMessage.error(message);
    throw new AppError(command, message);
  }
}
```

**Rust端错误处理**：

```rust
// 统一错误类型
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("业务错误: {0}")]
    Business(String),
    #[error("数据库错误: {0}")]
    Database(#[from] prisma_client::Error),
    #[error("文件操作错误: {0}")]
    Filesystem(#[from] std::io::Error),
    #[error("校验错误: {0}")]
    Validation(String),
}

// 命令返回统一错误
#[tauri::command]
async fn create_project(name: String) -> Result<Project, String> {
    // 校验
    if name.is_empty() {
        return Err("项目名称不能为空".to_string());
    }
    // 业务逻辑
    db::create_project(name)
        .await
        .map_err(|e| format!("创建项目失败: {}", e))
}
```

---

## 8. 安全架构

### 8.1 输入验证

1. **前端验证**：表单提交前进行格式校验（必填项、长度、正则匹配）。
2. **后端验证**：Rust端对所有输入参数进行二次校验，不信任前端数据。
3. **数据库约束**：Prisma Schema定义字段约束（唯一索引、非空、外键）。

### 8.2 SQL注入防护

- 使用Prisma ORM进行数据库操作，自动参数化查询。
- 禁止在Rust端拼接SQL字符串。
- 如需原生SQL，必须使用参数绑定。

### 8.3 XSS防护

- Vue 3默认对模板插值进行HTML转义。
- 禁止使用 `v-html` 渲染用户输入内容。
- Element Plus组件库已内置XSS防护。

### 8.4 数据加密

- SQLite数据库文件使用SQLCipher加密。
- 用户敏感设置（如云端同步Token）使用操作系统密钥链存储。
- 备份文件使用AES-256加密。
