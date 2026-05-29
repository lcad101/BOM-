<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { safeInvoke } from '@/utils/ipc';
import { formatDateTime, formatVerificationStatus } from '@/utils/formatter';
import type { Component, CreateComponentParams, AlternativePart } from '@/types/component';
import type { PaginatedData } from '@/types/api';

// 元器件列表
const components = ref<Component[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const isLoading = ref(false);
const searchKeyword = ref('');
const categoryFilter = ref('');

// 创建/编辑对话框
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formData = ref<CreateComponentParams>({
  partNumber: '',
  manufacturer: '',
  category: '',
  subCategory: '',
  description: '',
  packageType: '',
  defaultUnit: 'PCS',
});
const formRef = ref();
const editingComponentId = ref('');

// 替代料对话框
const altDialogVisible = ref(false);
const selectedComponent = ref<Component | null>(null);
const alternatives = ref<AlternativePart[]>([]);

const formRules = {
  partNumber: [{ required: true, message: '请输入型号', trigger: 'blur' }],
};

const categories = [
  '电阻', '电容', '电感', 'IC', '连接器', '晶体振荡器', '二极管', '三极管',
  'MOS管', '电源IC', 'MCU', '存储器', '传感器', '光电器件', '其他',
];

onMounted(() => {
  loadComponents();
});

async function loadComponents() {
  isLoading.value = true;
  try {
    const result = await safeInvoke<PaginatedData<Component>>('search_components', {
      keyword: searchKeyword.value,
      category: categoryFilter.value || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
    });
    components.value = result.items;
    total.value = result.total;
  } catch {
    // safeInvoke handles errors
  } finally {
    isLoading.value = false;
  }
}

/** 打开创建对话框 */
function openCreateDialog() {
  dialogMode.value = 'create';
  formData.value = { partNumber: '', manufacturer: '', category: '', subCategory: '', description: '', packageType: '', defaultUnit: 'PCS' };
  dialogVisible.value = true;
}

/** 打开编辑对话框 */
function openEditDialog(comp: Component) {
  dialogMode.value = 'edit';
  editingComponentId.value = comp.id;
  formData.value = {
    partNumber: comp.partNumber,
    manufacturer: comp.manufacturer,
    category: comp.category,
    subCategory: comp.subCategory,
    description: comp.description,
    packageType: comp.packageType,
    defaultUnit: comp.defaultUnit,
  };
  dialogVisible.value = true;
}

/** 保存元器件 */
async function handleSave() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  try {
    if (dialogMode.value === 'create') {
      await safeInvoke('create_component', formData.value, { successMessage: '元器件创建成功' });
    } else {
      await safeInvoke('update_component', {
        componentId: editingComponentId.value,
        ...formData.value,
      }, { successMessage: '元器件更新成功' });
    }
    dialogVisible.value = false;
    loadComponents();
  } catch {
    // safeInvoke handles errors
  }
}

/** 查看替代料 */
async function viewAlternatives(comp: Component) {
  selectedComponent.value = comp;
  try {
    const result = await safeInvoke<AlternativePart[]>('list_alternative_parts', {
      componentId: comp.id,
    });
    alternatives.value = result;
    altDialogVisible.value = true;
  } catch {
    // safeInvoke handles errors
  }
}

/** 搜索 */
function handleSearch() {
  currentPage.value = 1;
  loadComponents();
}
</script>

<template>
  <div class="component-library-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>元器件库</h2>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索型号、描述、厂商..."
          clearable
          style="width: 280px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="categoryFilter" clearable placeholder="类别筛选" @change="handleSearch" style="width: 140px">
          <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
        </el-select>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon> 添加元器件
        </el-button>
      </div>
    </div>

    <!-- 元器件表格 -->
    <el-table :data="components" v-loading="isLoading" stripe style="width: 100%">
      <el-table-column prop="partNumber" label="型号" min-width="160" />
      <el-table-column prop="manufacturer" label="厂商" width="120" />
      <el-table-column prop="category" label="类别" width="100" />
      <el-table-column prop="packageType" label="封装" width="100" />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="替代料" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.hasAlternatives" type="warning" size="small" @click="viewAlternatives(row)" style="cursor: pointer">
            {{ row.alternativeCount }}
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button type="primary" link size="small" @click="viewAlternatives(row)">替代料</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadComponents()"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '添加元器件' : '编辑元器件'"
      width="600px"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="型号" prop="partNumber">
          <el-input v-model="formData.partNumber" placeholder="如：STM32F407VGT6" />
        </el-form-item>
        <el-form-item label="厂商" prop="manufacturer">
          <el-input v-model="formData.manufacturer" placeholder="如：ST" />
        </el-form-item>
        <el-form-item label="类别" prop="category">
          <el-select v-model="formData.category" filterable allow-create placeholder="选择类别" style="width: 100%">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="子类别" prop="subCategory">
          <el-input v-model="formData.subCategory" placeholder="子类别（可选）" />
        </el-form-item>
        <el-form-item label="封装" prop="packageType">
          <el-input v-model="formData.packageType" placeholder="如：LQFP-100" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="元器件描述" />
        </el-form-item>
        <el-form-item label="默认单位" prop="defaultUnit">
          <el-select v-model="formData.defaultUnit" style="width: 100%">
            <el-option label="PCS" value="PCS" />
            <el-option label="SET" value="SET" />
            <el-option label="M" value="M" />
            <el-option label="KG" value="KG" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 替代料对话框 -->
    <el-dialog
      v-model="altDialogVisible"
      :title="`替代料管理 - ${selectedComponent?.partNumber || ''}`"
      width="600px"
    >
      <el-table :data="alternatives" stripe>
        <el-table-column prop="alternativeComponent.partNumber" label="替代型号" min-width="150" />
        <el-table-column prop="alternativeComponent.manufacturer" label="厂商" width="120" />
        <el-table-column prop="priority" label="优先级" width="80" />
        <el-table-column label="验证状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.verificationStatus === 'verified' ? 'success' : row.verificationStatus === 'verifying' ? 'warning' : 'info'"
              size="small"
            >
              {{ formatVerificationStatus(row.verificationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="150" show-overflow-tooltip />
      </el-table>
      <el-empty v-if="alternatives.length === 0" description="暂无替代料" />
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.component-library-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;

  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.text-muted {
  color: #c0c4cc;
}
</style>