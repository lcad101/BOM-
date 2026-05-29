<script setup lang="ts">
import { ElConfigProvider } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import MainLayout from '@/layout/MainLayout.vue';
</script>

<template>
  <el-config-provider :locale="zhCn">
    <MainLayout />
  </el-config-provider>
</template>

<style scoped>
</style>