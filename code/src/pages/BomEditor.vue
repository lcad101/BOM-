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

// 导入结果校验
const importResultVisible = ref(false);
const importResult = ref<{
  success: { name: string; referenceDesignator: string }[];
  duplicate: { name: string; referenceDesignator: string }[];
  failed: { name: string; reason: string }[];
}>({ success: [], duplicate: [], failed: [] });

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

/** 将BOM树展平为行数据 */
function flattenBomNode(node: BomNode, rows: Record<string, unknown>[], level = 0): void {
  rows.push({
    '层级': level,
    '料号': node.partNumber || '',
    '位号': node.referenceDesignator || '',
    '名称': node.name,
    '数量': node.quantity,
    '单位': node.unit,
    '类型': node.nodeType === 'assembly' ? '组件' : '组件',
    '工序': node.process || '',
    '备注': node.notes || '',
  });
  if (node.children) {
    for (const child of node.children) {
      flattenBomNode(child, rows, level + 1);
    }
  }
}

/** 导出BOM */
async function handleExport() {
  if (!bomStore.currentVersion) return;
  
  // 如果在Tauri环境中，使用原有逻辑
  if (isTauriEnvironment()) {
    let filePath = '';
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const defaultName = `${bomStore.currentVersion.name}_${bomStore.currentVersion.versionNumber}.xlsx`;
      const selected = await save({
        defaultPath: defaultName,
        filters: [{ name: 'Excel文件', extensions: ['xlsx'] }]
      });
      if (!selected) return;
      filePath = selected;
    } catch (error) {
      console.error('文件对话框错误:', error);
      ElMessage.error('打开文件保存对话框失败');
      return;
    }
    try {
      const result = await safeInvoke<ExportResult>('export_bom_to_excel', {
        bomVersionId: versionId, filePath, options: exportOptions.value,
      });
      ElMessage.success(`导出成功，文件已保存到：${result.filePath}，共 ${result.totalRows} 行`);
      exportDialogVisible.value = false;
    } catch { /* safeInvoke handles errors */ }
    return;
  }
  
  // 浏览器环境：使用 xlsx 库生成真实 Excel 文件
  try {
    if (!bomStore.bomTree) {
      ElMessage.warning('没有可导出的BOM数据');
      return;
    }
    
    // 展平BOM树
    const rows: Record<string, unknown>[] = [];
    flattenBomNode(bomStore.bomTree, rows);
    
    if (rows.length === 0) {
      ElMessage.warning('BOM数据为空');
      return;
    }
    
    const XLSX = await import('xlsx');
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 添加BOM数据工作表
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },   // 层级
      { wch: 16 },  // 料号
      { wch: 12 },  // 位号
      { wch: 40 },  // 名称
      { wch: 8 },   // 数量
      { wch: 8 },   // 单位
      { wch: 8 },   // 类型
      { wch: 20 },  // 工序
      { wch: 20 },  // 备注
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'BOM数据');
    
    // 添加BOM信息工作表
    const infoRows = [
      ['BOM编号', bomStore.currentVersion.bomCode || ''],
      ['BOM名称', bomStore.currentVersion.name],
      ['版本号', bomStore.currentVersion.versionNumber],
      ['状态', bomStore.currentVersion.status],
      ['创建人', bomStore.currentVersion.createdBy],
      ['创建时间', bomStore.currentVersion.createdAt],
      ['导出时间', new Date().toLocaleString('zh-CN')],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
    wsInfo['!cols'] = [{ wch: 12 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'BOM信息');
    
    // 生成文件名
    const defaultName = `${bomStore.currentVersion.bomCode || 'BOM'}_${bomStore.currentVersion.name}_${bomStore.currentVersion.versionNumber}.xlsx`;
    
    // 尝试使用 showSaveFilePicker（Edge/Chrome）
    if ('showSaveFilePicker' in window) {
      try {
        const win = window as unknown as { showSaveFilePicker: (opts?: Record<string, unknown>) => Promise<FileSystemFileHandle> };
        const fileHandle = await win.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'Excel 文件',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }]
        });
        const wbData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const writable = await fileHandle.createWritable();
        await writable.write(wbData);
        await writable.close();
        ElMessage.success(`导出成功：${fileHandle.name}，共 ${rows.length} 行`);
        exportDialogVisible.value = false;
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // 降级到自动下载
      }
    }
    
    // 降级：自动下载
    const wbData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ElMessage.success(`导出成功：${defaultName}，共 ${rows.length} 行`);
    exportDialogVisible.value = false;
  } catch (err) {
    ElMessage.error(`导出失败: ${err instanceof Error ? err.message : String(err)}`);
  }
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

/** 将类型字符串映射为节点类型 */
function mapNodeType(type: string): 'assembly' | 'component' {
  if (type === '组件') return 'assembly';
  if (type === '器件') return 'component';
  return 'component';
}

/** 收集现有BOM树中所有位号+料号组合 */
function collectExistingKeys(node: BomNode, set: Set<string>): void {
  if (node.referenceDesignator) {
    const key = `${node.referenceDesignator}|${node.partNumber || ''}`;
    set.add(key);
  }
  if (node.children) {
    for (const child of node.children) {
      collectExistingKeys(child, set);
    }
  }
}

/** 确认导入 */
async function handleImportConfirm() {
  if (!bomStore.currentVersion || importRawData.value.length === 0) return;
  
  let rootNodeId: string | null = null;
  let replaceRoot = false; // 是否需要替换根节点
  
  // 检查导入数据是否有根节点（层级0）
  const rootRows = importRawData.value.filter(row => Number(row['层级'] || row['level'] || row['Level'] || 0) === 0);
  if (rootRows.length > 0) {
    replaceRoot = true;
    const rootRow = rootRows[0];
    
    // 如果已有BOM树，删除整个旧树
    if (bomStore.bomTree) {
      try {
        await bomStore.deleteNode(bomStore.bomTree.id);
      } catch { /* 忽略 */ }
    }
    
    // 创建新根节点
    try {
      const root = await bomStore.addNode({
        versionId: bomStore.currentVersion.id,
        parentId: null,
        nodeType: mapNodeType(String(rootRow['类型'] || '')),
        name: String(rootRow['名称'] || '根节点'),
        quantity: Number(rootRow['数量'] || 1),
        unit: String(rootRow['单位'] || 'PCS'),
        partNumber: String(rootRow['料号'] || ''),
        referenceDesignator: String(rootRow['位号'] || ''),
        process: String(rootRow['工序'] || ''),
        notes: String(rootRow['备注'] || ''),
      });
      rootNodeId = root?.id || null;
    } catch {
      ElMessage.error('创建根节点失败');
      return;
    }
    
    // 移除已处理的根节点行
    importRawData.value = importRawData.value.filter(row => !rootRows.includes(row));
  } else {
    if (!bomStore.bomTree) {
      try {
        const root = await bomStore.addNode({
          versionId: bomStore.currentVersion.id,
          parentId: null,
          nodeType: 'assembly',
          name: '根节点',
          quantity: 1,
        });
        rootNodeId = root?.id || null;
      } catch {
        ElMessage.error('创建根节点失败');
        return;
      }
    } else {
      rootNodeId = bomStore.bomTree.id;
    }
  }
  
  // 收集现有所有位号+料号组合
  const existingKeys = new Set<string>();
  if (!replaceRoot && bomStore.bomTree) {
    collectExistingKeys(bomStore.bomTree, existingKeys);
  }
  
  // 按层级重建树结构
  const levelStack: Record<number, string> = {};
  if (rootNodeId) {
    levelStack[-1] = rootNodeId;
  }
  
  // 结果统计
  const successList: { name: string; referenceDesignator: string }[] = [];
  const duplicateList: { name: string; referenceDesignator: string }[] = [];
  const failedList: { name: string; reason: string }[] = [];
  
  for (const row of importRawData.value) {
    const name = String(row['名称'] || row['型号'] || row['Part Number'] || row['partNumber'] || row['name'] || row['Name'] || '');
    const refDes = String(row['位号'] || row['referenceDesignator'] || '');
    const qty = Number(row['数量'] || row['Quantity'] || row['quantity'] || 1);
    const level = Number(row['层级'] || row['level'] || row['Level'] || 0);
    
    if (!name) {
      failedList.push({ name: '(空)', reason: '名称为空' });
      continue;
    }
    
    // 检查位号+料号重复
    const partNumber = String(row['料号'] || row['partNumber'] || '');
    const duplicateKey = `${refDes}|${partNumber}`;
    if (refDes && existingKeys.has(duplicateKey)) {
      duplicateList.push({ name, referenceDesignator: refDes });
      continue;
    }
    
    const parentLevel = level - 1;
    const parentId = levelStack[parentLevel] || rootNodeId || null;
    
    try {
      const node = await bomStore.addNode({
        versionId: bomStore.currentVersion.id,
        parentId,
        nodeType: mapNodeType(String(row['类型'] || '')),
        name,
        quantity: qty || 1,
        unit: String(row['单位'] || 'PCS'),
        partNumber: String(row['料号'] || ''),
        referenceDesignator: refDes,
        process: String(row['工序'] || ''),
        notes: String(row['备注'] || ''),
      });
      if (node) {
        levelStack[level] = node.id;
        // 添加到位号+料号组合集合
        if (refDes) existingKeys.add(`${refDes}|${String(row['料号'] || row['partNumber'] || '')}`);
        // 清除更深层级
        for (const k of Object.keys(levelStack)) {
          const kNum = Number(k);
          if (kNum > level) delete levelStack[kNum];
        }
        successList.push({ name, referenceDesignator: refDes });
      }
    } catch (err) {
      failedList.push({ name, reason: err instanceof Error ? err.message : '未知错误' });
    }
  }
  
  // 设置导入结果并显示校验弹窗
  importResult.value = {
    success: successList,
    duplicate: duplicateList,
    failed: failedList,
  };
  
  // 关闭导入对话框，打开结果弹窗
  importDialogVisible.value = false;
  importPreview.value = [];
  importRawData.value = [];
  
  // 始终显示导入结果校验弹窗
  importResultVisible.value = true;
  
  // 刷新BOM树
  if (bomStore.currentVersion) {
    await bomStore.loadBomTree(bomStore.currentVersion.id, true);
  }
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

    <!-- 导入结果校验弹窗 -->
    <el-dialog v-model="importResultVisible" title="BOM 导入结果校验" width="600px">
      <div class="import-result">
        <!-- 成功导入 -->
        <div class="result-section" v-if="importResult.success.length > 0">
          <h4 class="result-title result-success">✅ 成功导入 ({{ importResult.success.length }} 条)</h4>
          <el-table :data="importResult.success" stripe size="small" max-height="200">
            <el-table-column prop="name" label="名称" min-width="200" />
            <el-table-column prop="referenceDesignator" label="位号" width="120" />
          </el-table>
        </div>
        
        <!-- 重复跳过 -->
        <div class="result-section" v-if="importResult.duplicate.length > 0">
          <h4 class="result-title result-duplicate">⚠️ 重复跳过 ({{ importResult.duplicate.length }} 条)</h4>
          <p class="result-hint">以下元器件位号与现有BOM中的位号重复，已跳过导入</p>
          <el-table :data="importResult.duplicate" stripe size="small" max-height="200">
            <el-table-column prop="name" label="名称" min-width="200" />
            <el-table-column prop="referenceDesignator" label="位号" width="120" />
          </el-table>
        </div>
        
        <!-- 失败 -->
        <div class="result-section" v-if="importResult.failed.length > 0">
          <h4 class="result-title result-failed">❌ 导入失败 ({{ importResult.failed.length }} 条)</h4>
          <el-table :data="importResult.failed" stripe size="small" max-height="200">
            <el-table-column prop="name" label="名称" min-width="200" />
            <el-table-column prop="reason" label="失败原因" min-width="150" />
          </el-table>
        </div>
        
        <!-- 汇总 -->
        <div class="result-summary">
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="成功">
              <el-tag type="success">{{ importResult.success.length }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="重复">
              <el-tag type="warning">{{ importResult.duplicate.length }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="失败">
              <el-tag type="danger">{{ importResult.failed.length }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="importResultVisible = false">确定</el-button>
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

.import-result {
  .result-section {
    margin-bottom: 20px;
  }
  .result-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    padding: 6px 0;
  }
  .result-success { color: #67C23A; }
  .result-duplicate { color: #E6A23C; }
  .result-failed { color: #F56C6C; }
  .result-hint {
    font-size: 12px;
    color: #909399;
    margin-bottom: 8px;
  }
  .result-summary {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #EBEEF5;
  }
}
</style>
