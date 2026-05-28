# BOM管理系统 - 编码与AI Agent规范

## 1. TypeScript 严格模式
- 强制开启 `strict: true` 在 `tsconfig.json` 中。
- **绝对禁止**使用 `any` 类型。如遇类型未知，必须使用 `unknown` 并进行类型守卫。
- 避免使用隐式的类型推断，函数参数和返回值必须显式声明类型。

## 2. 命名规范
- **变量/函数：** `camelCase` (例: `getBomTree`, `isLeafNode`)
- **类/接口/类型：** `PascalCase` (例: `BomTreeNode`, `ComponentEntity`)
- **常量：** `UPPER_SNAKE_CASE` (例: `MAX_TREE_DEPTH`)
- **文件名：** 
  - Vue组件: `PascalCase.vue` (例: `BomTree.vue`)
  - TS工具/服务: `camelCase.ts` (例: `bom.service.ts`)

## 3. 架构红线 (AI Agent 强规则)
- **禁止跨层调用：** `.vue` 文件中**严禁**出现 `prisma.xxx.findMany()` 的调用。必须通过 `services/` 层封装。
- **禁止硬编码：** 魔法数字必须提取为常量。错误写法：`if (level > 10)`；正确写法：`if (level > MAX_TREE_DEPTH)`。
- **组件单一职责：** 单个 Vue 组件代码行数超过 300 行时，必须考虑拆分为子组件。

## 4. 错误处理
- 所有涉及异步操作（Prisma查询、文件读取）的代码，必须使用 `try-catch` 包裹。
- 捕获到错误时，必须使用 `console.error` 记录完整堆栈，并通过 UI 框架（如 ElMessage）向用户展示友好的错误提示，禁止直接 `alert()`。

## 5. 提交规范
- Git Commit Message 遵循 Angular 规范：
  - `feat: 新增BOM导入功能`
  - `fix: 修复树状图层级超过10级时的崩溃问题`
  - `refactor: 重构Excel解析逻辑，提升性能`
