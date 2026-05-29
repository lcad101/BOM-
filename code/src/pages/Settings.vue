<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useUiStore } from '@/stores/uiStore';
import { safeInvoke } from '@/utils/ipc';

const uiStore = useUiStore();

// 备份相关
const isBackingUp = ref(false);
const isRestoring = ref(false);

/** 触发备份 */
async function handleBackup() {
  isBackingUp.value = true;
  try {
    await safeInvoke('trigger_backup', {}, { successMessage: '备份成功' });
  } catch {
    // safeInvoke handles errors
  } finally {
    isBackingUp.value = false;
  }
}

/** 从备份恢复 */
async function handleRestore() {
  isRestoring.value = true;
  try {
    await safeInvoke('restore_from_backup', {
      backupFilePath: '',
      confirmOverwrite: true,
    }, { successMessage: '恢复成功' });
  } catch {
    // safeInvoke handles errors
  } finally {
    isRestoring.value = false;
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
          <p class="form-tip">备份文件存储在应用数据目录的 backups/ 子目录下</p>
        </el-form-item>
      </el-form>
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
</style>