<script setup lang="ts">
import { computed, ref } from 'vue';
import { useBomStore } from '@/stores/bomStore';
import { formatNodeType } from '@/utils/formatter';
import type { BomNode } from '@/types/bom';
import NodeEditDialog from './NodeEditDialog.vue';

const props = withDefaults(defineProps<{ readonly?: boolean }>(), { readonly: false });
const emit = defineEmits<{ (e: 'node-selected', node: BomNode): void }>();
const bomStore = useBomStore();

const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuNode = ref<BomNode | null>(null);
const editDialogVisible = ref(false);
const editParentNode = ref<BomNode | null>(null);
const editMode = ref<'add-child' | 'add-component' | 'edit'>('add-child');

// 列宽定义（可拖拽调整）
const colWidths = ref<Record<string, number>>({
  level: 60,
  partno: 120,
  ref: 100,
  name: 400,
  qty: 70,
  unit: 70,
  type: 90,
  process: 100,
  sort: 80,
});
const draggingCol = ref<{ key: string; startX: number; startWidth: number } | null>(null);

function flattenNodes(node: BomNode, result: BomNode[] = []): BomNode[] {
  result.push(node);
  if (node.children) for (const child of node.children) flattenNodes(child, result);
  return result;
}
const flatNodes = computed(() => bomStore.bomTree ? flattenNodes(bomStore.bomTree) : []);
const treeData = computed(() => bomStore.bomTree ? [bomStore.bomTree] : []);

// 列拖拽
function startResize(e: MouseEvent, colKey: string) {
  e.preventDefault();
  draggingCol.value = { key: colKey, startX: e.clientX, startWidth: colWidths.value[colKey] };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', stopResize);
}
function onMouseMove(e: MouseEvent) {
  if (!draggingCol.value) return;
  const diff = e.clientX - draggingCol.value.startX;
  const newWidth = Math.max(40, draggingCol.value.startWidth + diff);
  colWidths.value[draggingCol.value.key] = newWidth;
}
function stopResize() {
  draggingCol.value = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', stopResize);
}

function handleNodeClick(node: BomNode) { bomStore.selectNode(node); emit('node-selected', node); }
function handleNodeContextmenu(event: MouseEvent, node: BomNode) {
  event.preventDefault();
  contextMenuNode.value = node;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  contextMenuVisible.value = true;
}
function closeContextMenu() { contextMenuVisible.value = false; contextMenuNode.value = null; }
function handleAddChild() { editParentNode.value = contextMenuNode.value; editMode.value = 'add-child'; editDialogVisible.value = true; closeContextMenu(); }
function handleAddComponent() { editParentNode.value = contextMenuNode.value; editMode.value = 'add-component'; editDialogVisible.value = true; closeContextMenu(); }
function handleEditNode() { editParentNode.value = contextMenuNode.value; editMode.value = 'edit'; editDialogVisible.value = true; closeContextMenu(); }
async function handleDeleteNode() { if (!contextMenuNode.value) return; closeContextMenu(); await bomStore.deleteNode(contextMenuNode.value.id); }
function handleDialogConfirm() { editDialogVisible.value = false; }
function handleAddRoot() { editParentNode.value = null; editMode.value = 'add-child'; editDialogVisible.value = true; }
function isSelected(node: BomNode) { return bomStore.selectedNode?.id === node.id; }
</script>

<template>
  <div class="bom-tree-container" @click="closeContextMenu">
    <div class="tree-toolbar">
      <div class="toolbar-left">
        <el-button v-if="!readonly" type="primary" size="small" @click="handleAddRoot">
          <el-icon><Plus /></el-icon> 添加节点
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button-group size="small">
          <el-button @click="bomStore.expandAllNodes(bomStore.bomTree)"><el-icon><FolderOpened /></el-icon> 展开全部</el-button>
          <el-button @click="bomStore.collapseAllNodes()"><el-icon><Folder /></el-icon> 折叠全部</el-button>
        </el-button-group>
        <span class="node-count">共 {{ bomStore.totalNodeCount }} 个节点</span>
      </div>
    </div>

    <div v-if="bomStore.isTreeLoading" class="tree-loading">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon><span>加载中...</span>
    </div>
    <div v-else-if="!bomStore.bomTree" class="tree-empty">
      <el-empty description="暂无BOM数据">
        <el-button type="primary" @click="handleAddRoot">添加根节点</el-button>
      </el-empty>
    </div>

    <!-- 活动表格 -->
    <div v-else class="tree-table">
      <!-- 表头（支持列宽拖拽） -->
      <div class="table-header">
        <div class="col-level" :style="{ width: colWidths.level + 'px' }">
          <span>层级</span>
          <span class="resizer" @mousedown="(e) => startResize(e, 'level')"></span>
        </div>
        <div class="col-partno" :style="{ width: colWidths.partno + 'px' }">
          <span>料号</span>
          <span class="resizer" @mousedown="(e) => startResize(e, 'partno')"></span>
        </div>
        <div class="col-ref" :style="{ width: colWidths.ref + 'px' }">
          <span>位号</span>
          <span class="resizer" @mousedown="(e) => startResize(e, 'ref')"></span>
        </div>
        <div class="col-name" :style="{ width: colWidths.name + 'px' }">
          <span>名称</span>
          <span class="resizer" @mousedown="(e) => startResize(e, 'name')"></span>
        </div>
        <div class="col-qty" :style="{ width: colWidths.qty + 'px' }">
          <span>数量</span>
          <span class="resizer" @mousedown="(e) => startResize(e, 'qty')"></span>
        </div>
        <div class="col-unit" :style="{ width: colWidths.unit + 'px' }">
          <span>单位</span>
          <span class="resizer" @mousedown="(e) => startResize(e, 'unit')"></span>
        </div>
        <div class="col-type" :style="{ width: colWidths.type + 'px' }">
          <span>类型</span>
          <span class="resizer" @mousedown="(e) => startResize(e, 'type')"></span>
        </div>
        <div class="col-process" :style="{ width: colWidths.process + 'px' }">
          <span>工序</span>
          <span class="resizer" @mousedown="(e) => startResize(e, 'process')"></span>
        </div>
        <div class="col-sort" :style="{ width: colWidths.sort + 'px' }">
          <span>层内编号</span>
          <span class="resizer" @mousedown="(e) => startResize(e, 'sort')"></span>
        </div>
      </div>

      <!-- 数据行 -->
      <div
        v-for="node in flatNodes" :key="node.id"
        class="table-row"
        :class="{ 'table-row--selected': isSelected(node), 'table-row--assembly': node.nodeType === 'assembly', 'table-row--component': node.nodeType === 'component' }"
        @click="handleNodeClick(node)"
        @contextmenu="handleNodeContextmenu($event, node)"
      >
        <div class="row-indent" :style="{ width: (node.level * 24) + 'px' }"></div>
        <div class="col-level" :style="{ width: colWidths.level + 'px' }">{{ node.level }}</div>
        <div class="col-partno" :style="{ width: colWidths.partno + 'px' }">
          <span class="cell-text">{{ node.partNumber || '' }}</span>
        </div>
        <div class="col-ref" :style="{ width: colWidths.ref + 'px' }">
          <span class="cell-text">{{ node.referenceDesignator || '' }}</span>
        </div>
        <div class="col-name" :style="{ width: colWidths.name + 'px' }">
          <el-icon :size="14" :color="node.nodeType === 'assembly' ? '#409EFF' : '#67C23A'" class="mr-1">
            <Folder v-if="node.nodeType === 'assembly'" /><Microphone v-else />
          </el-icon>
          <span class="cell-text">{{ node.name }}×{{ node.quantity }}</span>
        </div>
        <div class="col-qty" :style="{ width: colWidths.qty + 'px' }">{{ node.quantity }}</div>
        <div class="col-unit" :style="{ width: colWidths.unit + 'px' }">{{ node.unit }}</div>
        <div class="col-type" :style="{ width: colWidths.type + 'px' }">
          <el-tag :type="node.nodeType === 'assembly' ? 'primary' : 'success'" size="small" effect="plain">
            {{ node.nodeType === 'assembly' ? '组件' : '器件' }}
          </el-tag>
        </div>
        <div class="col-process" :style="{ width: colWidths.process + 'px' }">
          <span class="cell-text">{{ node.process || '' }}</span>
        </div>
        <div class="col-sort" :style="{ width: colWidths.sort + 'px' }">{{ node.sortOrder }}</div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div v-show="contextMenuVisible" class="context-menu" :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }">
      <div class="context-menu-item" @click="handleAddChild"><el-icon><FolderAdd /></el-icon> 添加子节点</div>
      <div class="context-menu-item" @click="handleAddComponent"><el-icon><Plus /></el-icon> 挂料（添加元器件）</div>
      <div class="context-menu-divider" />
      <div class="context-menu-item" @click="handleEditNode"><el-icon><Edit /></el-icon> 编辑节点</div>
      <div class="context-menu-item context-menu-item--danger" @click="handleDeleteNode"><el-icon><Delete /></el-icon> 删除节点</div>
    </div>

    <NodeEditDialog v-model:visible="editDialogVisible" :parent-node="editParentNode" :mode="editMode" @confirm="handleDialogConfirm" />
  </div>
</template>

<style scoped lang="scss">
.bom-tree-container { position: relative; height: 100%; display: flex; flex-direction: column; }

.tree-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #ebeef5; background: #fff; }
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 8px; }
.node-count { font-size: 12px; color: #909399; white-space: nowrap; }
.tree-loading, .tree-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #909399; }

// ===== 活动表格 =====
.tree-table { flex: 1; overflow: auto; user-select: none; }

.table-header {
  display: flex; align-items: center; height: 38px;
  background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
  border-bottom: 2px solid #dee2e6;
  position: sticky; top: 0; z-index: 2;
  font-size: 13px; font-weight: 700; color: #495057;
}

.table-header > div {
  display: flex; align-items: center; justify-content: center; padding: 0 6px; position: relative; height: 100%;
}

.resizer {
  position: absolute; right: 0; top: 0; width: 5px; height: 100%;
  cursor: col-resize; z-index: 3;
  &:hover { background: #409EFF; }
}

.row-indent { flex-shrink: 0; }

.table-row {
  display: flex; align-items: center; min-height: 40px; padding: 0 8px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer; transition: background-color 0.12s, box-shadow 0.12s;
  font-size: 13px; color: #303133;

  &:nth-child(even) { background: #f8f9fb; }

  &:hover {
    background: #e3f2fd !important;
    box-shadow: inset 2px 0 0 #409EFF;
  }

  &--selected {
    background: #bbdefb !important;
    box-shadow: inset 2px 0 0 #1565C0;
    font-weight: 500;
  }

  &--assembly { border-left: 3px solid #409EFF; }
  &--component { border-left: 3px solid #67C23A; }
}

.table-row > div {
  display: flex; align-items: center; padding: 0 6px; height: 40px; overflow: hidden;
}

.cell-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.col-level { flex-shrink: 0; }
.col-partno { flex-shrink: 0; }
.col-ref { flex-shrink: 0; }
.col-name { flex-shrink: 0; }
.col-qty { flex-shrink: 0; }
.col-unit { flex-shrink: 0; }
.col-type { flex-shrink: 0; }
.col-process { flex-shrink: 0; }
.col-sort { flex-shrink: 0; }

.mr-1 { margin-right: 4px; }

// 右键菜单
.context-menu {
  position: fixed; z-index: 2000; background: #fff; border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15); padding: 4px 0; min-width: 160px;
}
.context-menu-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px;
  font-size: 13px; cursor: pointer; transition: background-color 0.15s;
  &:hover { background: #ecf5ff; }
  &--danger { color: #f56c6c; &:hover { background: #fef0f0; } }
}
.context-menu-divider { height: 1px; background: #ebeef5; margin: 4px 0; }
</style>