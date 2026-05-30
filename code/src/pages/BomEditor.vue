<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useBomStore } from '@/stores/bomStore';
import { useProjectStore } from '@/stores/projectStore';
import BomTree from '@/components/bom/BomTree.vue';
import { formatDateTime, formatVersionStatus, formatNodeType } from '@/utils/formatter';
import { safeInvoke } from '@/utils/ipc';
import type { BomNode } from '@/types/bom';
import type { ExportResult } from '@/types/api';

// 检测是否在Tauri环境中
function isTauriEnvironment(): boolean {
  try {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  } catch {
    return false;
  }
}

const route = useRoute();
const router = useRouter();
const bomStore = useBomStore();
const projectStore = useProjectStore();

const projectId = route.params.projectId as string;
const versionId = route.params.versionId as string;

// 导出对话框
const exportDialogVisible = ref(false);
const exportOptions = ref({
  exportScope: 'all' as 'all' | 'topLevel' | 'leafOnly',
  includeAlternatives: true,
  indentLevels: true,
});

// 导入相关
const importDialogVisible = ref(false);
const importPreview = ref<Record<string, unknown>[]>([]);
const importColumns = ref<string[]>([]);
const importTotalRows = ref(0);
const importRawData = ref<Record<string, unknown>[]>([]);

// 属性面板
const propertyPanelVisible = ref(true);

onMounted(async () => {
  await projectStore.getProject(projectId);
  const version = await bomStore.getBomVersion(versionId);
  if (version) {
    bomStore.setCurrentVersion(version);
    await bomStore.loadBomTree(versionId, true);
  }
});

/** 选中节点 */
function handleNodeSelected(node: BomNode) {
  bomStore.selectNode(node);
}

/** 发布版本 */
async function handleRelease() {
  if (!bomStore.currentVersion) return;
  await ElMessageBox.confirm('发布后该版本将不可直接修改，确认发布？', '发布确认', { type: 'warning' });
  await bomStore.releaseBomVersion(versionId);
}

/** 导出BOM */
async function handleExport() {
  if (!bomStore.currentVersion) return;
  
  let filePath = '';
  
  // 如果在Tauri环境中，弹出文件保存对话框
  if (isTauriEnvironment()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const defaultName = `${bomStore.currentVersion.name}_${bomStore.currentVersion.versionNumber}.xlsx`;
      const selected = await save({
        defaultPath: defaultName,
        filters: [{
          name: 'Excel文件',
          extensions: ['xlsx']
        }]
      });
      
      // 用户取消了选择
      if (!selected) return;
      filePath = selected;
    } catch (error) {
      console.error('文件对话框错误:', error);
      ElMessage.error('打开文件保存对话框失败');
      return;
    }
  }
  
  try {
    const result = await safeInvoke<ExportResult>('export_bom_to_excel', {
      bomVersionId: versionId, filePath: filePath, options: exportOptions.value,
    });
    ElMessage.success(`导出成功，文件已保存到：${result.filePath}，共 ${result.totalRows} 行`);
    exportDialogVisible.value = false;
  } catch { /* safeInvoke handles errors */ }
}

/** Excel文件解析 */
async function handleFileChange(file: { name: string; raw?: File }) {
  if (!file.raw) return;
  try {
    const XLSX = await import('xlsx');
    const data = await file.raw.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (jsonData.length === 0) { ElMessage.warning('文件中没有数据'); return; }
    importColumns.value = Object.keys(jsonData[0]);
    importRawData.value = jsonData;
    importPreview.value = jsonData.slice(0, 10);
    importTotalRows.value = jsonData.length;
  } catch {
    ElMessage.error('文件解析失败，请检查文件格式');
  }
}

/** 确认导入 */
async function handleImportConfirm() {
  if (!bomStore.currentVersion || importRawData.value.length === 0) return;
  let count = 0;
  for (const row of importRawData.value) {
    const name = String(row['型号'] || row['Part Number'] || row['partNumber'] || row['name'] || row['Name'] || '');
    const qty = Number(row['数量'] || row['Quantity'] || row['quantity'] || 1);
    if (!name) continue;
    try {
      await bomStore.addNode({
        versionId: bomStore.currentVersion.id,
        parentId: bomStore.bomTree?.id || null,
        nodeType: 'component',
        name,
        quantity: qty || 1,
      });
      count++;
    } catch { /* skip individual errors */ }
  }
  ElMessage.success(`成功导入 ${count} 条数据`);
  importDialogVisible.value = false;
  importPreview.value = [];
  importRawData.value = [];
}

function goBack() { router.push(`/projects/${projectId}`); }
const selectedNodeDetail = computed(() => bomStore.selectedNode);
</script>

<template>
  <div class="bom-editor-page">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button link @click="goBack"><el-icon><ArrowLeft /></el-icon></el-button>
        <div class="version-info" v-if="bomStore.currentVersion">
          <h3>{{ bomStore.currentVersion.bomCode }} {{ bomStore.currentVersion.name }} {{ bomStore.currentVersion.versionNumber }}</h3>
          <el-tag :type="bomStore.isDraft ? 'info' : 'success'" size="small">
            {{ formatVersionStatus(bomStore.currentVersion.status) }}
          </el-tag>
        </div>
      </div>
      <div class="toolbar-right">
        <el-button size="small" @click="importDialogVisible = true">
          <el-icon><Upload /></el-icon> 导入Excel
        </el-button>
        <el-button size="small" @click="exportDialogVisible = true">
          <el-icon><Download /></el-icon> 导出Excel
        </el-button>
        <el-button v-if="bomStore.isDraft" type="success" size="small" @click="handleRelease">
          <el-icon><Promotion /></el-icon> 发布版本
        </el-button>
        <el-button size="small" @click="propertyPanelVisible = !propertyPanelVisible">
          <el-icon><InfoFilled /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 主编辑区 -->
    <div class="editor-body">
      <div class="editor-tree">
        <BomTree :readonly="!bomStore.canEdit" @node-selected="handleNodeSelected" />
      </div>
      <div v-show="propertyPanelVisible" class="editor-property">
        <div class="property-header"><h4>节点属性</h4></div>
        <div v-if="selectedNodeDetail" class="property-body">
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="层级">第 {{ selectedNodeDetail.level }} 级</el-descriptions-item>
            <el-descriptions-item label="料号">{{ selectedNodeDetail.partNumber || '-' }}</el-descriptions-item>
            <el-descriptions-item label="位号">{{ selectedNodeDetail.referenceDesignator || '-' }}</el-descriptions-item>
            <el-descriptions-item label="名称">{{ selectedNodeDetail.name }}</el-descriptions-item>
            <el-descriptions-item label="数量">{{ selectedNodeDetail.quantity }}</el-descriptions-item>
            <el-descriptions-item label="单位">{{ selectedNodeDetail.unit }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ formatNodeType(selectedNodeDetail.nodeType) }}</el-descriptions-item>
            <el-descriptions-item label="工序">{{ selectedNodeDetail.process || '-' }}</el-descriptions-item>
            <el-descriptions-item label="层内编号">{{ selectedNodeDetail.sortOrder }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ selectedNodeDetail.notes || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(selectedNodeDetail.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(selectedNodeDetail.updatedAt) }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div v-else class="property-empty">
          <el-empty description="选择节点查看属性" :image-size="60" />
        </div>
      </div>
    </div>

    <!-- 导入Excel对话框 -->
    <el-dialog v-model="importDialogVisible" title="导入Excel BOM" width="600px">
      <el-upload drag accept=".xlsx,.xls" :auto-upload="false" :on-change="handleFileChange">
        <el-icon :size="40"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽文件到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xlsx 和 .xls 格式文件</div>
        </template>
      </el-upload>
      <div v-if="importPreview.length > 0" class="import-preview">
        <h4>数据预览（前10行）</h4>
        <el-table :data="importPreview" stripe size="small" max-height="300">
          <el-table-column v-for="col in importColumns" :key="col" :prop="col" :label="col" min-width="120" />
        </el-table>
        <p class="import-summary">共 {{ importTotalRows }} 行数据</p>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="importPreview.length === 0" @click="handleImportConfirm">确认导入</el-button>
      </template>
    </el-dialog>

    <!-- 导出对话框 -->
    <el-dialog v-model="exportDialogVisible" title="导出BOM" width="400px">
      <el-form label-width="100px">
        <el-form-item label="导出范围">
          <el-radio-group v-model="exportOptions.exportScope">
            <el-radio value="all">全部节点</el-radio>
            <el-radio value="topLevel">仅顶层</el-radio>
            <el-radio value="leafOnly">仅叶子节点</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="包含替代料">
          <el-switch v-model="exportOptions.includeAlternatives" />
        </el-form-item>
        <el-form-item label="缩进层级">
          <el-switch v-model="exportOptions.indentLevels" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleExport">导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.bom-editor-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px - 28px);
}
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}
.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
  h3 { font-size: 15px; font-weight: 600; color: #303133; }
}
.editor-body { display: flex; flex: 1; overflow: hidden; }
.editor-tree { flex: 1; background: #fff; overflow: auto; border-right: 1px solid #ebeef5; }
.editor-property { width: 320px; background: #fff; overflow: auto; flex-shrink: 0; }
.property-header { padding: 12px 16px; border-bottom: 1px solid #ebeef5; h4 { font-size: 14px; font-weight: 600; } }
.property-body { padding: 12px 16px; }
.property-empty { display: flex; align-items: center; justify-content: center; height: 300px; }
.import-preview { margin-top: 16px;
  h4 { font-size: 14px; margin-bottom: 8px; }
  .import-summary { margin-top: 8px; font-size: 13px; color: #909399; }
}
</style>