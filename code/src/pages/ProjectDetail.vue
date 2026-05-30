<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useProjectStore } from '@/stores/projectStore';
import { useBomStore } from '@/stores/bomStore';
import { formatDateTime, formatVersionStatus } from '@/utils/formatter';
import type { CreateBomVersionParams } from '@/types/bom';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const bomStore = useBomStore();

const projectId = route.params.projectId as string;

// 创建BOM版本对话框
const createVersionDialogVisible = ref(false);
const versionForm = ref({
  bomCode: '',
  name: '',
  versionNumber: 'v1.0',
  description: '',
  sourceVersionId: '',
});
const versionFormRef = ref();

const versionRules = {
  bomCode: [
    { required: true, message: '请输入BOM编号', trigger: 'blur' },
    { pattern: /^\d{12}$/, message: 'BOM编号为12位数字', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入BOM名称', trigger: 'blur' }],
};

onMounted(async () => {
  await projectStore.getProject(projectId);
  await bomStore.loadBomVersions(projectId);
});

/** 创建BOM版本 */
async function handleCreateVersion() {
  if (!versionFormRef.value) return;
  const valid = await versionFormRef.value.validate().catch(() => false);
  if (!valid) return;

  const params: CreateBomVersionParams = {
    projectId,
    bomCode: versionForm.value.bomCode,
    name: versionForm.value.name,
    versionNumber: versionForm.value.versionNumber,
    description: versionForm.value.description,
    sourceVersionId: versionForm.value.sourceVersionId || undefined,
    createdBy: projectStore.currentProject?.owner || 'admin',
  };

  const version = await bomStore.createBomVersion(params);
  if (version) {
    createVersionDialogVisible.value = false;
    openBomEditor(version.id);
  }
}

/** 打开BOM编辑器 */
function openBomEditor(versionId: string) {
  router.push(`/projects/${projectId}/bom/${versionId}`);
}

/** 发布BOM版本 */
async function handleRelease(versionId: string) {
  await ElMessageBox.confirm('发布后该版本将不可直接修改，确认发布？', '发布确认', {
    type: 'warning',
    confirmButtonText: '确认发布',
  });
  await bomStore.releaseBomVersion(versionId);
  await bomStore.loadBomVersions(projectId);
}

/** 删除BOM版本 */
async function handleDeleteVersion(versionId: string, bomName: string) {
  await ElMessageBox.confirm(`确定要删除BOM版本「${bomName}」吗？删除后不可恢复！`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    confirmButtonClass: 'el-button--danger',
  });
  const success = await bomStore.deleteBomVersion(versionId);
  if (success) {
    await bomStore.loadBomVersions(projectId);
  }
}

/** 打开创建版本对话框 */
function openCreateVersionDialog() {
  versionForm.value = { bomCode: '', name: '', versionNumber: 'v1.0', description: '', sourceVersionId: '' };
  createVersionDialogVisible.value = true;
}
</script>

<template>
  <div class="project-detail-page">
    <!-- 项目信息头部 -->
    <div class="detail-header">
      <el-button link @click="router.push('/projects')">
        <el-icon><ArrowLeft /></el-icon> 返回项目列表
      </el-button>
      <div class="project-info" v-if="projectStore.currentProject">
        <h2>{{ projectStore.currentProject.name }}</h2>
        <el-tag>{{ projectStore.currentProject.projectCode }}</el-tag>
        <span class="info-text">负责人: {{ projectStore.currentProject.owner }}</span>
      </div>
    </div>

    <!-- BOM版本列表 -->
    <div class="version-section">
      <div class="section-header">
        <h3>BOM版本列表</h3>
        <el-button type="primary" size="small" @click="openCreateVersionDialog">
          <el-icon><Plus /></el-icon> 创建BOM版本
        </el-button>
      </div>

      <el-table
        :data="bomStore.bomVersions"
        v-loading="bomStore.isLoading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="bomCode" label="BOM编号" min-width="140" />
        <el-table-column prop="name" label="BOM名称" min-width="150" />
        <el-table-column prop="versionNumber" label="版本号" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'draft' ? 'info' : row.status === 'released' ? 'success' : 'warning'"
              size="small"
            >
              {{ formatVersionStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="100" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openBomEditor(row.id)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button
              v-if="row.status === 'draft'"
              type="success"
              link
              size="small"
              @click="handleRelease(row.id)"
            >
              <el-icon><Promotion /></el-icon> 发布
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDeleteVersion(row.id, row.name)"
            >
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 创建BOM版本对话框 -->
    <el-dialog v-model="createVersionDialogVisible" title="创建BOM版本" width="500px">
      <el-form ref="versionFormRef" :model="versionForm" :rules="versionRules" label-width="100px">
        <el-form-item label="BOM编号" prop="bomCode">
          <el-input v-model="versionForm.bomCode" placeholder="如：123456789012" />
        </el-form-item>
        <el-form-item label="BOM名称" prop="name">
          <el-input v-model="versionForm.name" placeholder="如：主板BOM" />
        </el-form-item>
        <el-form-item label="版本号" prop="versionNumber">
          <el-input v-model="versionForm.versionNumber" placeholder="如：v1.0" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="versionForm.description" type="textarea" :rows="3" placeholder="版本描述" />
        </el-form-item>
        <el-form-item label="派生来源" prop="sourceVersionId">
          <el-select v-model="versionForm.sourceVersionId" clearable placeholder="选择已有版本派生（可选）" style="width: 100%">
            <el-option
              v-for="v in bomStore.bomVersions"
              :key="v.id"
              :label="`${v.name} ${v.versionNumber}`"
              :value="v.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVersionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="bomStore.isLoading" @click="handleCreateVersion">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.project-detail-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.detail-header {
  margin-bottom: 24px;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;

  h2 {
    font-size: 22px;
    font-weight: 600;
    color: #303133;
  }
}

.info-text {
  font-size: 13px;
  color: #909399;
}

.version-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h3 {
    font-size: 16px;
    font-weight: 600;
  }
}
</style>