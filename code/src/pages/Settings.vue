<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useUiStore } from '@/stores/uiStore';

const uiStore = useUiStore();

// 备份相关
const isBackingUp = ref(false);
const isRestoring = ref(false);
const backupDirHandle = ref<FileSystemDirectoryHandle | null>(null);
const backupFiles = ref<FileSystemFileHandle[]>([]);
const STORAGE_KEY = 'bom-master-data';
const BACKUP_DIR_KEY = 'bom-backup-dir-path';

/** 选择备份目录 */
async function selectBackupDir(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if ('showDirectoryPicker' in window) {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      localStorage.setItem(BACKUP_DIR_KEY, handle.name);
      return handle;
    }
    ElMessage.warning('当前浏览器不支持目录选择，请使用 Edge/Chrome');
    return null;
  } catch {
    return null;
  }
}

/** 加载备份目录中的文件列表 */
async function loadBackupFiles() {
  if (!backupDirHandle.value) return;
  try {
    const files: FileSystemFileHandle[] = [];
    for await (const entry of backupDirHandle.value.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        files.push(entry as FileSystemFileHandle);
      }
    }
    files.sort((a, b) => b.name.localeCompare(a.name));
    backupFiles.value = files;
  } catch {
    backupFiles.value = [];
  }
}

/** 触发备份 - 保存到选定目录 */
async function handleBackup() {
  isBackingUp.value = true;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      ElMessage.warning('没有可备份的数据');
      return;
    }

    // 选择目录
    if (!backupDirHandle.value) {
      backupDirHandle.value = await selectBackupDir();
      if (!backupDirHandle.value) {
        ElMessage.info('已取消备份');
        return;
      }
    }

    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `bom-backup-${ts}.json`;

    const fileHandle = await backupDirHandle.value.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();

    await loadBackupFiles();
    ElMessage.success(`备份成功: ${filename}`);
  } catch (err) {
    ElMessage.error(`备份失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    isBackingUp.value = false;
  }
}

/** 从备份恢复 - 打开文件选择器 */
async function handleRestore() {
  try {
    if (!('showOpenFilePicker' in window)) {
      ElMessage.warning('当前浏览器不支持文件选择，请使用 Edge/Chrome');
      return;
    }

    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON 备份文件', accept: { 'application/json': ['.json'] } }],
    });

    const file = await fileHandle.getFile();
    const text = await file.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      ElMessage.error('文件格式错误，请选择有效的JSON备份文件');
      return;
    }

    if (!parsed.projects || !parsed.bomVersions) {
      ElMessage.error('备份文件格式不完整，缺少必要字段');
      return;
    }

    const projectCount = Array.isArray(parsed.projects) ? parsed.projects.length : 0;
    const bomCount = Array.isArray(parsed.bomVersions) ? parsed.bomVersions.length : 0;

    await ElMessageBox.confirm(
      `确认从备份文件恢复数据吗？\n\n文件: ${file.name}\n项目数: ${projectCount}\nBOM版本数: ${bomCount}\n\n当前数据将被覆盖！`,
      '恢复确认',
      { type: 'warning', confirmButtonText: '确认恢复', cancelButtonText: '取消' },
    );

    isRestoring.value = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    ElMessage.success('恢复成功，页面即将刷新');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 用户取消，不报错
      return;
    }
    ElMessage.error(`恢复失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    isRestoring.value = false;
  }
}

/** 从备份文件列表中恢复 */
async function handleRestoreFromFile(fileHandle: FileSystemFileHandle) {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!parsed.projects || !parsed.bomVersions) {
      ElMessage.error('备份文件格式不完整');
      return;
    }

    const projectCount = Array.isArray(parsed.projects) ? parsed.projects.length : 0;
    const bomCount = Array.isArray(parsed.bomVersions) ? parsed.bomVersions.length : 0;

    await ElMessageBox.confirm(
      `确认从备份恢复吗？\n\n文件: ${fileHandle.name}\n项目数: ${projectCount}\nBOM版本数: ${bomCount}\n\n当前数据将被覆盖！`,
      '恢复确认',
      { type: 'warning', confirmButtonText: '确认恢复', cancelButtonText: '取消' },
    );

    isRestoring.value = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    ElMessage.success('恢复成功，页面即将刷新');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    ElMessage.error(`恢复失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    isRestoring.value = false;
  }
}

/** 删除备份文件 */
async function handleDeleteBackup(fileHandle: FileSystemFileHandle) {
  try {
    await ElMessageBox.confirm(`确认删除备份文件 ${fileHandle.name}？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
    });
    await backupDirHandle.value?.removeEntry(fileHandle.name);
    await loadBackupFiles();
    ElMessage.success('已删除');
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    ElMessage.error('删除失败');
  }
}

/** 连接到备份目录（重新打开已有目录） */
async function connectBackupDir() {
  try {
    if ('showDirectoryPicker' in window) {
      backupDirHandle.value = await window.showDirectoryPicker({ mode: 'readwrite' });
      await loadBackupFiles();
    }
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="settings-page">
    <h2>系统设置</h2>

    <el-card class="settings-section">
      <template #header>
        <span>外观设置</span>
      </template>
      <el-form label-width="120px">
        <el-form-item label="主题">
          <el-radio-group v-model="uiStore.theme" @change="uiStore.setTheme(uiStore.theme)">
            <el-radio value="light">浅色</el-radio>
            <el-radio value="dark">深色</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="语言">
          <el-select v-model="uiStore.language" @change="uiStore.setLanguage(uiStore.language)">
            <el-option label="中文" value="zh-CN" />
            <el-option label="English" value="en" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="settings-section">
      <template #header>
        <span>数据管理</span>
      </template>
      <el-form label-width="120px">
        <el-form-item label="数据备份">
          <div class="backup-actions">
            <el-button type="primary" :loading="isBackingUp" @click="handleBackup">
              <el-icon><Download /></el-icon> 立即备份
            </el-button>
            <el-button :loading="isRestoring" @click="handleRestore">
              <el-icon><Upload /></el-icon> 从备份恢复
            </el-button>
          </div>
          <p class="form-tip">备份将保存到共享文件夹，首次使用需选择目录</p>
        </el-form-item>
      </el-form>

      <!-- 备份文件列表 -->
      <div v-if="backupFiles.length > 0" class="backup-list">
        <el-divider content-position="left">已有备份文件</el-divider>
        <div v-for="file in backupFiles" :key="file.name" class="backup-item">
          <span class="backup-name">{{ file.name }}</span>
          <div class="backup-actions-small">
            <el-button type="primary" link size="small" @click="handleRestoreFromFile(file)">
              恢复
            </el-button>
            <el-button type="danger" link size="small" @click="handleDeleteBackup(file)">
              删除
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="!backupDirHandle" class="backup-connect">
        <el-button size="small" @click="connectBackupDir">
          <el-icon><FolderOpened /></el-icon> 连接到备份目录
        </el-button>
      </div>
    </el-card>

    <el-card class="settings-section">
      <template #header>
        <span>关于</span>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="应用名称">BOMMaster</el-descriptions-item>
        <el-descriptions-item label="版本">v1.0.0</el-descriptions-item>
        <el-descriptions-item label="技术栈">Vue 3 + Tauri + SQLite</el-descriptions-item>
        <el-descriptions-item label="说明">BOM管理系统 - 本地离线桌面应用</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;

  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 24px;
  }
}

.settings-section {
  margin-bottom: 20px;
}

.backup-actions {
  display: flex;
  gap: 12px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.backup-list {
  padding: 0 16px 16px;
}

.backup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f7fa;
  }
}

.backup-name {
  font-size: 13px;
  color: #606266;
  font-family: 'Consolas', monospace;
}

.backup-actions-small {
  display: flex;
  gap: 4px;
}

.backup-connect {
  padding: 8px 16px;
}
</style>