# BOM管理系统 - 数据库设计文档 (DatabaseDesign)

> 版本: v1.0 | 日期: 2026-05-28

---

## 1. 表关系概览 (ER图)

### 1.1 实体关系描述

```
┌──────────┐     1:N     ┌──────────────┐     1:N     ┌──────────┐
│ Project  │────────────→│ BomVersion   │────────────→│ BomNode  │
│          │             │              │             │(自引用)   │
└──────────┘             └──────────────┘             └────┬─────┘
                                                          │ 1:N
                                                          ↓
┌──────────────┐     1:N     ┌──────────┐         ┌──────────────┐
│ Supplier     │←────────────│Component │←────────│AlternativePart│
│              │             │          │         │              │
└──────────────┘             └──────────┘         └──────────────┘
                                 ↑
                                 │ 1:N
                                 │
                          ┌──────────────┐
                          │ChangeHistory │
                          │              │
                          └──────────────┘
```

### 1.2 关系说明

| 关系 | 类型 | 说明 |
|------|------|------|
| Project → BomVersion | 一对多 | 一个项目可包含多个BOM版本 |
| BomVersion → BomNode | 一对多 | 一个BOM版本包含多个节点（根节点+子节点） |
| BomNode → BomNode | 自引用一对多 | 父子层级关系（parent_id指向父节点） |
| BomNode → Component | 多对一 | 多个节点可引用同一元器件（不同BOM中使用相同型号） |
| Component → AlternativePart | 一对多 | 一个元器件可有多个替代料 |
| Component → Supplier | 多对多 | 一个元器件可有多个供应商（通过component_suppliers关联表） |
| BomNode → ChangeHistory | 一对多 | 一个节点的多次变更记录 |

---

## 2. 表结构定义

### 2.1 projects - 项目表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | TEXT | PK | uuid() | 项目唯一标识 |
| name | TEXT | NOT NULL, UNIQUE | - | 项目名称 |
| project_code | TEXT | NOT NULL, UNIQUE | - | 项目编号（如PRJ-2026-001） |
| description | TEXT | - | '' | 项目描述 |
| owner | TEXT | NOT NULL | - | 项目负责人 |
| status | TEXT | NOT NULL | 'active' | 项目状态：active/archived/deleted |
| created_at | DATETIME | NOT NULL | now() | 创建时间 |
| updated_at | DATETIME | NOT NULL | now() | 最后修改时间 |
| deleted_at | DATETIME | - | NULL | 软删除时间 |

### 2.2 bom_versions - BOM版本表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | TEXT | PK | uuid() | 版本唯一标识 |
| project_id | TEXT | FK → projects.id, NOT NULL | - | 所属项目 |
| name | TEXT | NOT NULL | - | BOM名称（如"主板BOM"） |
| version_number | TEXT | NOT NULL | 'v1.0' | 版本号 |
| status | TEXT | NOT NULL | 'draft' | 版本状态：draft/released/archived |
| source_version_id | TEXT | FK → bom_versions.id | NULL | 派生来源版本ID |
| description | TEXT | - | '' | 版本描述/变更说明 |
| created_by | TEXT | NOT NULL | - | 创建人 |
| released_at | DATETIME | - | NULL | 发布时间 |
| created_at | DATETIME | NOT NULL | now() | 创建时间 |
| updated_at | DATETIME | NOT NULL | now() | 最后修改时间 |

**唯一约束**：`(project_id, name, version_number)` — 同一项目下BOM名称+版本号唯一

### 2.3 bom_nodes - BOM节点表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | TEXT | PK | uuid() | 节点唯一标识 |
| bom_version_id | TEXT | FK → bom_versions.id, NOT NULL | - | 所属BOM版本 |
| parent_id | TEXT | FK → bom_nodes.id | NULL | 父节点ID（根节点为NULL） |
| component_id | TEXT | FK → components.id | NULL | 关联元器件（叶子节点必填） |
| node_type | TEXT | NOT NULL | - | 节点类型：assembly/component |
| name | TEXT | NOT NULL | - | 节点名称/型号 |
| quantity | INTEGER | NOT NULL | 1 | 数量 |
| unit | TEXT | NOT NULL | 'PCS' | 单位 |
| reference_designator | TEXT | - | '' | 位号（如R1,R2,R3） |
| level | INTEGER | NOT NULL | 0 | 层级深度（0=根节点） |
| sort_order | INTEGER | NOT NULL | 0 | 同级排序序号 |
| notes | TEXT | - | '' | 备注 |
| created_at | DATETIME | NOT NULL | now() | 创建时间 |
| updated_at | DATETIME | NOT NULL | now() | 最后修改时间 |

**约束**：
- `level <= 10` — 层级深度不超过10
- 同一 `parent_id` 下 `name` 不重复
- `node_type = 'component'` 时 `component_id` 不能为NULL

### 2.4 components - 元器件表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | TEXT | PK | uuid() | 元器件唯一标识 |
| part_number | TEXT | NOT NULL | - | 型号/料号 |
| manufacturer | TEXT | - | '' | 厂商/品牌 |
| category | TEXT | - | '' | 类别（电阻/电容/IC/连接器等） |
| sub_category | TEXT | - | '' | 子类别 |
| description | TEXT | - | '' | 描述/规格 |
| package_type | TEXT | - | '' | 封装类型（如0402/QFP-48） |
| specifications | TEXT | - | '' | 详细规格参数（JSON格式） |
| datasheet_url | TEXT | - | '' | 数据手册链接 |
| default_unit | TEXT | NOT NULL | 'PCS' | 默认单位 |
| is_active | BOOLEAN | NOT NULL | true | 是否有效（软删除标记） |
| created_at | DATETIME | NOT NULL | now() | 创建时间 |
| updated_at | DATETIME | NOT NULL | now() | 最后修改时间 |

**唯一约束**：`(part_number, manufacturer)` — 同一厂商下型号唯一

### 2.5 alternative_parts - 替代料表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | TEXT | PK | uuid() | 替代料唯一标识 |
| original_component_id | TEXT | FK → components.id, NOT NULL | - | 原元器件ID |
| alternative_component_id | TEXT | FK → components.id, NOT NULL | - | 替代元器件ID |
| priority | INTEGER | NOT NULL | 1 | 优先级（1=首选替代，数字越小优先级越高） |
| verification_status | TEXT | NOT NULL | 'unverified' | 验证状态：unverified/verifying/verified/not_recommended |
| notes | TEXT | - | '' | 替代料备注（兼容性说明等） |
| verified_by | TEXT | - | '' | 验证人 |
| verified_at | DATETIME | - | NULL | 验证时间 |
| created_at | DATETIME | NOT NULL | now() | 创建时间 |
| updated_at | DATETIME | NOT NULL | now() | 最后修改时间 |

**唯一约束**：`(original_component_id, alternative_component_id)` — 同一原件的替代料不重复
**检查约束**：`original_component_id != alternative_component_id` — 替代料不能与原件相同

### 2.6 change_history - 变更历史表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | TEXT | PK | uuid() | 变更记录唯一标识 |
| bom_version_id | TEXT | FK → bom_versions.id, NOT NULL | - | 所属BOM版本 |
| node_id | TEXT | FK → bom_nodes.id | NULL | 关联节点ID（版本级变更时为NULL） |
| change_type | TEXT | NOT NULL | - | 变更类型：create/update/delete/move/alternative_add/alternative_remove |
| field_name | TEXT | - | NULL | 变更字段名（update类型时必填） |
| old_value | TEXT | - | NULL | 变更前值 |
| new_value | TEXT | - | NULL | 变更后值 |
| change_summary | TEXT | NOT NULL | - | 变更摘要描述 |
| changed_by | TEXT | NOT NULL | - | 变更操作人 |
| created_at | DATETIME | NOT NULL | now() | 变更时间 |

### 2.7 suppliers - 供应商表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | TEXT | PK | uuid() | 供应商唯一标识 |
| name | TEXT | NOT NULL, UNIQUE | - | 供应商名称 |
| contact_person | TEXT | - | '' | 联系人 |
| contact_email | TEXT | - | '' | 联系邮箱 |
| contact_phone | TEXT | - | '' | 联系电话 |
| website | TEXT | - | '' | 官网地址 |
| lead_time_days | INTEGER | - | NULL | 默认交期（天） |
| notes | TEXT | - | '' | 备注 |
| is_active | BOOLEAN | NOT NULL | true | 是否有效 |
| created_at | DATETIME | NOT NULL | now() | 创建时间 |
| updated_at | DATETIME | NOT NULL | now() | 最后修改时间 |

### 2.8 component_suppliers - 元器件供应商关联表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | TEXT | PK | uuid() | 关联唯一标识 |
| component_id | TEXT | FK → components.id, NOT NULL | - | 元器件ID |
| supplier_id | TEXT | FK → suppliers.id, NOT NULL | - | 供应商ID |
| supplier_part_number | TEXT | - | '' | 供应商料号 |
| unit_price | REAL | - | NULL | 单价 |
| currency | TEXT | NOT NULL | 'CNY' | 币种 |
| moq | INTEGER | - | NULL | 最小起订量 |
| lead_time_days | INTEGER | - | NULL | 交期（天） |
| is_preferred | BOOLEAN | NOT NULL | false | 是否首选供应商 |
| created_at | DATETIME | NOT NULL | now() | 创建时间 |
| updated_at | DATETIME | NOT NULL | now() | 最后修改时间 |

**唯一约束**：`(component_id, supplier_id)` — 同一元器件-供应商组合不重复

### 2.9 user_settings - 用户设置表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | TEXT | PK | uuid() | 设置唯一标识 |
| setting_key | TEXT | NOT NULL, UNIQUE | - | 设置键名 |
| setting_value | TEXT | NOT NULL | - | 设置值（JSON格式） |
| updated_at | DATETIME | NOT NULL | now() | 最后修改时间 |

---

## 3. 索引设计

### 3.1 主键索引（自动创建）

所有表的 `id` 字段为主键，SQLite自动创建主键索引。

### 3.2 唯一索引

| 表名 | 字段 | 索引名 | 说明 |
|------|------|--------|------|
| projects | name | idx_projects_name | 项目名称唯一 |
| projects | project_code | idx_projects_code | 项目编号唯一 |
| bom_versions | (project_id, name, version_number) | idx_bom_version_unique | 同项目下BOM+版本唯一 |
| components | (part_number, manufacturer) | idx_component_unique | 同厂商下型号唯一 |
| alternative_parts | (original_component_id, alternative_component_id) | idx_alt_part_unique | 替代料不重复 |
| suppliers | name | idx_suppliers_name | 供应商名称唯一 |
| component_suppliers | (component_id, supplier_id) | idx_comp_supplier_unique | 元器件-供应商不重复 |
| user_settings | setting_key | idx_settings_key | 设置键唯一 |

### 3.3 查询优化索引

| 表名 | 字段 | 索引名 | 用途 |
|------|------|--------|------|
| bom_versions | project_id | idx_bomver_project | 按项目查BOM版本 |
| bom_nodes | bom_version_id | idx_bomnode_version | 按版本查节点 |
| bom_nodes | parent_id | idx_bomnode_parent | 查子节点 |
| bom_nodes | component_id | idx_bomnode_component | 按元器件查节点 |
| components | category | idx_comp_category | 按类别筛选 |
| components | part_number | idx_comp_partnum | 型号搜索 |
| alternative_parts | original_component_id | idx_altpart_original | 查原件的替代料 |
| change_history | bom_version_id | idx_change_bomver | 按版本查变更 |
| change_history | created_at | idx_change_time | 按时间排序 |
| component_suppliers | component_id | idx_compsupp_comp | 按元器件查供应商 |

---

## 4. Prisma Schema定义

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./bom-master.db"
}

model Project {
  id          String      @id @default(uuid())
  name        String      @unique
  projectCode String      @unique @map("project_code")
  description String      @default("")
  owner       String
  status      String      @default("active") // active, archived, deleted
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  deletedAt   DateTime?   @map("deleted_at")

  bomVersions BomVersion[]

  @@map("projects")
}

model BomVersion {
  id              String     @id @default(uuid())
  projectId       String     @map("project_id")
  name            String
  versionNumber   String     @default("v1.0") @map("version_number")
  status          String     @default("draft") // draft, released, archived
  sourceVersionId String?    @map("source_version_id")
  description     String     @default("")
  createdBy       String     @map("created_by")
  releasedAt      DateTime?  @map("released_at")
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")

  project       Project       @relation(fields: [projectId], references: [id])
  sourceVersion BomVersion?   @relation("VersionDerivation", fields: [sourceVersionId], references: [id])
  derivedVersions BomVersion[] @relation("VersionDerivation")
  nodes         BomNode[]
  changeHistory ChangeHistory[]

  @@unique([projectId, name, versionNumber])
  @@map("bom_versions")
}

model BomNode {
  id                  String    @id @default(uuid())
  bomVersionId        String    @map("bom_version_id")
  parentId            String?   @map("parent_id")
  componentId         String?   @map("component_id")
  nodeType            String    @map("node_type") // assembly, component
  name                String
  quantity            Int       @default(1)
  unit                String    @default("PCS")
  referenceDesignator String?   @default("") @map("reference_designator")
  level               Int       @default(0)
  sortOrder           Int       @default(0) @map("sort_order")
  notes               String    @default("")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  bomVersion BomVersion   @relation(fields: [bomVersionId], references: [id])
  parent     BomNode?     @relation("NodeHierarchy", fields: [parentId], references: [id])
  children   BomNode[]    @relation("NodeHierarchy")
  component  Component?   @relation(fields: [componentId], references: [id])
  changeHistory ChangeHistory[]

  @@map("bom_nodes")
}

model Component {
  id             String    @id @default(uuid())
  partNumber     String    @map("part_number")
  manufacturer   String    @default("")
  category       String    @default("")
  subCategory    String    @default("") @map("sub_category")
  description    String    @default("")
  packageType    String    @default("") @map("package_type")
  specifications String    @default("") // JSON
  datasheetUrl   String    @default("") @map("datasheet_url")
  defaultUnit    String    @default("PCS") @map("default_unit")
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  bomNodes          BomNode[]
  originalAlternatives AlternativePart[] @relation("OriginalComponent")
  alternativeFor    AlternativePart[] @relation("AlternativeComponent")
  suppliers         ComponentSupplier[]

  @@unique([partNumber, manufacturer])
  @@map("components")
}

model AlternativePart {
  id                    String   @id @default(uuid())
  originalComponentId   String   @map("original_component_id")
  alternativeComponentId String  @map("alternative_component_id")
  priority              Int      @default(1)
  verificationStatus    String   @default("unverified") @map("verification_status")
  // unverified, verifying, verified, not_recommended
  notes                 String   @default("")
  verifiedBy            String?  @default("") @map("verified_by")
  verifiedAt            DateTime? @map("verified_at")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  originalComponent   Component @relation("OriginalComponent", fields: [originalComponentId], references: [id])
  alternativeComponent Component @relation("AlternativeComponent", fields: [alternativeComponentId], references: [id])

  @@unique([originalComponentId, alternativeComponentId])
  @@map("alternative_parts")
}

model ChangeHistory {
  id             String   @id @default(uuid())
  bomVersionId   String   @map("bom_version_id")
  nodeId         String?  @map("node_id")
  changeType     String   @map("change_type")
  // create, update, delete, move, alternative_add, alternative_remove
  fieldName      String?  @map("field_name")
  oldValue       String?  @map("old_value")
  newValue       String?  @map("new_value")
  changeSummary  String   @map("change_summary")
  changedBy      String   @map("changed_by")
  createdAt      DateTime @default(now()) @map("created_at")

  bomVersion BomVersion @relation(fields: [bomVersionId], references: [id])
  node       BomNode?   @relation(fields: [nodeId], references: [id])

  @@map("change_history")
}

model Supplier {
  id            String   @id @default(uuid())
  name          String   @unique
  contactPerson String?  @default("") @map("contact_person")
  contactEmail  String?  @default("") @map("contact_email")
  contactPhone  String?  @default("") @map("contact_phone")
  website       String?  @default("")
  leadTimeDays  Int?     @map("lead_time_days")
  notes         String   @default("")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  components ComponentSupplier[]

  @@map("suppliers")
}

model ComponentSupplier {
  id               String   @id @default(uuid())
  componentId      String   @map("component_id")
  supplierId       String   @map("supplier_id")
  supplierPartNumber String? @default("") @map("supplier_part_number")
  unitPrice        Float?   @map("unit_price")
  currency         String   @default("CNY")
  moq              Int?     @map("moq")
  leadTimeDays     Int?     @map("lead_time_days")
  isPreferred      Boolean  @default(false) @map("is_preferred")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  component Component @relation(fields: [componentId], references: [id])
  supplier  Supplier  @relation(fields: [supplierId], references: [id])

  @@unique([componentId, supplierId])
  @@map("component_suppliers")
}

model UserSetting {
  id           String   @id @default(uuid())
  settingKey   String   @unique @map("setting_key")
  settingValue String   @map("setting_value") // JSON
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("user_settings")
}
```

---

## 5. 数据迁移策略

### 5.1 迁移管理

使用Prisma Migrate管理数据库迁移：

```bash
# 创建迁移
npx prisma migrate dev --name init

# 应用迁移
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset
```

### 5.2 迁移原则

1. 每次Schema变更必须创建迁移文件，禁止手动修改数据库。
2. 迁移文件纳入Git版本控制。
3. 新增字段必须提供默认值或允许NULL，确保向后兼容。
4. 删除字段前确认无代码引用，先标记废弃再在下个版本删除。
5. 数据迁移脚本与Schema迁移分离，使用种子脚本(seeding)处理数据转换。

### 5.3 种子数据

```bash
# 运行种子脚本
npx prisma db seed
```

种子脚本应包含：
- 默认项目分类
- 常用元器件类别
- 默认供应商
- 系统默认设置项

---

## 6. 示例数据

### 6.1 项目示例

| id | name | project_code | owner | status |
|----|------|-------------|-------|--------|
| proj-001 | 智能网关V2.0 | PRJ-2026-001 | 张工 | active |
| proj-002 | 5G模组 | PRJ-2026-002 | 李工 | active |

### 6.2 BOM版本示例

| id | project_id | name | version_number | status |
|----|-----------|------|---------------|--------|
| bv-001 | proj-001 | 主板BOM | v1.0 | released |
| bv-002 | proj-001 | 主板BOM | v1.1 | draft |

### 6.3 BOM节点示例

| id | bom_version_id | parent_id | node_type | name | quantity | level |
|----|---------------|-----------|-----------|------|----------|-------|
| node-001 | bv-001 | NULL | assembly | 智能网关主板 | 1 | 0 |
| node-002 | bv-001 | node-001 | assembly | 电源模块 | 1 | 1 |
| node-003 | bv-001 | node-002 | component | LM2596S-5.0 | 1 | 2 |
| node-004 | bv-001 | node-001 | component | STM32F407VGT6 | 1 | 1 |

### 6.4 元器件示例

| id | part_number | manufacturer | category | package_type |
|----|------------|-------------|----------|-------------|
| comp-001 | LM2596S-5.0 | TI | 电源IC | TO-263 |
| comp-002 | STM32F407VGT6 | ST | MCU | LQFP-100 |
| comp-003 | GRM155R71C104KA88D | Murata | 电容 | 0402 |

### 6.5 替代料示例

| id | original_component_id | alternative_component_id | priority | verification_status |
|----|----------------------|------------------------|----------|-------------------|
| alt-001 | comp-001 | comp-004 | 1 | verified |
| alt-002 | comp-002 | comp-005 | 1 | unverified |
