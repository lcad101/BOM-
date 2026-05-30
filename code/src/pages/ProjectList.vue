<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useProjectStore } from '@/stores/projectStore';
import { formatRelativeTime, formatProjectStatus } from '@/utils/formatter';
import type { CreateProjectParams } from '@/types/project';

const router = useRouter();
const projectStore = useProjectStore();

// 创建项目对话框
const createDialogVisible = ref(false);
const createForm = ref<CreateProjectParams>({
  name: '',
  projectCode: '',
  description: '',
  owner: '',
});
const createFormRef = ref();

// 校验规则
const createRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 1, max: 100, message: '名称长度为1-100个字符', trigger: 'blur' },
  ],
  projectCode: [
    { required: true, message: '请输入项目编号', trigger: 'blur' },
    { pattern: /^P00\d{5}-\d{4}-\d{3}$/, message: '格式应为 P00XXXXX-YYYY-XXX', trigger: 'blur' },
  ],
  owner: [{ required: true, message: '请输入负责人', trigger: 'blur' }],
};

onMounted(() => {
  projectStore.loadProjects();
});

/** 打开创建项目对话框 */
function openCreateDialog() {
  createForm.value = { name: '', projectCode: '', description: '', owner: '' };
  createDialogVisible.value = true;
}

/** 创建项目 */
async function handleCreateProject() {
  if (!createFormRef.value) return;
  const valid = await createFormRef.value.validate().catch(() => false);
  if (!valid) return;

  const project = await projectStore.createProject(createForm.value);
  if (project) {
    createDialogVisible.value = false;
    router.push(`/projects/${project.id}`);
  }
}

/** 归档项目 */
async function handleArchive(projectId: string) {
  await ElMessageBox.confirm('确定要归档此项目吗？归档后可在归档列表中查看。', '归档确认', {
    type: 'warning',
  });
  await projectStore.archiveProject(projectId);
  projectStore.loadProjects();
}

/** 删除项目 */
async function handleDelete(projectId: string) {
  await ElMessageBox.confirm('确定要删除此项目吗？30天内可恢复。', '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    confirmButtonClass: 'el-button--danger',
  });
  await projectStore.deleteProject(projectId);
  projectStore.loadProjects();
}

/** 进入项目 */
function enterProject(projectId: string) {
  router.push(`/projects/${projectId}`);
}

/** 切换状态筛选 */
function handleStatusChange(status: string) {
  projectStore.setStatusFilter(status);
  projectStore.loadProjects();
}

/** 搜索 */
function handleSearch() {
  projectStore.loadProjects();
}
</script>

<template>
  <div class="project-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>项目管理</h2>
        <el-tag type="info">共 {{ projectStore.total }} 个项目</el-tag>
      </div>
      <div class="header-right">
        <el-input
          v-model="projectStore.keyword"
          placeholder="搜索项目名称或编号..."
          clearable
          style="width: 280px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-radio-group v-model="projectStore.statusFilter" @change="handleStatusChange">
          <el-radio-button value="active">活跃</el-radio-button>
          <el-radio-button value="archived">已归档</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          创建项目
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="projectStore.isLoading" class="loading-container">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <!-- 项目卡片列表 -->
    <div v-else class="project-grid">
      <el-card
        v-for="project in projectStore.projects"
        :key="project.id"
        class="project-card"
        shadow="hover"
        @click="enterProject(project.id)"
      >
        <div class="card-header">
          <div class="card-title">
            <h3>{{ project.name }}</h3>
            <el-tag size="small" :type="project.status === 'active' ? 'success' : 'warning'">
              {{ formatProjectStatus(project.status) }}
            </el-tag>
          </div>
          <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'archive' ? handleArchive(project.id) : handleDelete(project.id)">
            <el-button link @click.stop>
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="archive">归档</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div class="card-body">
          <p class="card-code">{{ project.projectCode }}</p>
          <p class="card-desc">{{ project.description || '暂无描述' }}</p>
        </div>
        <div class="card-footer">
          <span class="card-info">
            <el-icon><User /></el-icon>
            {{ project.owner }}
          </span>
          <span class="card-info">
            <el-icon><Document /></el-icon>
            {{ project.bomCount || 0 }} 个BOM
          </span>
          <span class="card-info">
            <el-icon><Clock /></el-icon>
            {{ formatRelativeTime(project.updatedAt) }}
          </span>
        </div>
      </el-card>

      <!-- 空状态 -->
      <el-empty
        v-if="projectStore.projects.length === 0"
        description="暂无项目"
        style="grid-column: 1 / -1"
      >
        <el-button type="primary" @click="openCreateDialog">创建第一个项目</el-button>
      </el-empty>
    </div>

    <!-- 分页 -->
    <div v-if="projectStore.total > projectStore.pageSize" class="pagination">
      <el-pagination
        v-model:current-page="projectStore.currentPage"
        :page-size="projectStore.pageSize"
        :total="projectStore.total"
        layout="prev, pager, next"
        @current-change="projectStore.loadProjects()"
      />
    </div>

    <!-- 创建项目对话框 -->
    <el-dialog v-model="createDialogVisible" title="创建项目" width="500px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="createForm.name" placeholder="如：智能网关V2.0" />
        </el-form-item>
        <el-form-item label="项目编号" prop="projectCode">
          <el-input v-model="createForm.projectCode" placeholder="如：P0000001-2026-001" />
        </el-form-item>
        <el-form-item label="负责人" prop="owner">
          <el-input v-model="createForm.owner" placeholder="请输入负责人姓名" />
        </el-form-item>
        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="项目描述（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="projectStore.isLoading" @click="handleCreateProject">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.project-list-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: #909399;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.project-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.card-body {
  margin: 12px 0;
}

.card-code {
  font-size: 13px;
  color: #909399;
  font-family: 'Consolas', monospace;
}

.card-desc {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.card-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>