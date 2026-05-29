<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUiStore } from '@/stores/uiStore';
import { ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();

const activeMenu = computed(() => {
  if (route.path.startsWith('/projects')) return 'projects';
  if (route.path.startsWith('/components')) return 'components';
  if (route.path.startsWith('/settings')) return 'settings';
  return 'projects';
});

function handleMenuSelect(index: string) {
  router.push(`/${index}`);
}

function handleSearch() {
  if (uiStore.searchKeyword.trim()) {
    ElMessage.info(`搜索: ${uiStore.searchKeyword}`);
  }
}
</script>

<template>
  <el-container class="main-layout">
    <!-- 顶部导航栏 -->
    <el-header class="app-header" height="56px">
      <div class="header-left">
        <div class="logo">
          <el-icon :size="24" color="#409EFF"><Box /></el-icon>
          <span class="logo-text">BOMMaster</span>
        </div>
        <el-menu
          mode="horizontal"
          :default-active="activeMenu"
          :ellipsis="false"
          class="top-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="projects">
            <el-icon><Folder /></el-icon>
            <span>项目管理</span>
          </el-menu-item>
          <el-menu-item index="components">
            <el-icon><Grid /></el-icon>
            <span>元器件库</span>
          </el-menu-item>
          <el-menu-item index="settings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </div>
      <div class="header-right">
        <el-input
          v-model="uiStore.searchKeyword"
          placeholder="搜索型号、描述、厂商..."
          clearable
          class="global-search"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </el-header>

    <!-- 主内容区 -->
    <el-main class="app-main">
      <router-view />
    </el-main>

    <!-- 底部状态栏 -->
    <el-footer class="app-status" height="28px">
      <div class="status-left">
        <span>BOMMaster v1.0.0</span>
      </div>
      <div class="status-right">
        <span>{{ new Date().toLocaleDateString('zh-CN') }}</span>
      </div>
    </el-footer>
  </el-container>
</template>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.5px;
}

.top-menu {
  border-bottom: none !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.global-search {
  width: 320px;
}

.app-main {
  padding: 0;
  background: #f5f7fa;
  overflow: auto;
}

.app-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  font-size: 12px;
  color: #909399;
}
</style>