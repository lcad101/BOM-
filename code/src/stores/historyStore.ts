/**
 * 变更历史状态管理
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { safeInvoke } from '@/utils/ipc';
import type { ChangeHistory, BomCompareResult } from '@/types/bom';
import type { PaginatedData } from '@/types/api';

export const useHistoryStore = defineStore('history', () => {
  // ========== 状态 ==========
  const historyList = ref<ChangeHistory[]>([]);
  const compareResult = ref<BomCompareResult | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(20);

  // ========== 操作 ==========
  /** 加载变更历史 */
  async function loadHistory(params: {
    bomVersionId: string;
    nodeId?: string;
    changeType?: string;
    startDate?: string;
    endDate?: string;
    changedBy?: string;
    page?: number;
    pageSize?: number;
  }) {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await safeInvoke<PaginatedData<ChangeHistory>>('get_change_history', {
        bomVersionId: params.bomVersionId,
        nodeId: params.nodeId || undefined,
        changeType: params.changeType || undefined,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        changedBy: params.changedBy || undefined,
        page: params.page || currentPage.value,
        pageSize: params.pageSize || pageSize.value,
      });
      historyList.value = result.items;
      total.value = result.total;
      currentPage.value = result.page;
      pageSize.value = result.pageSize;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载变更历史失败';
    } finally {
      isLoading.value = false;
    }
  }

  /** 对比BOM版本 */
  async function compareVersions(sourceId: string, targetId: string): Promise<BomCompareResult | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await safeInvoke<BomCompareResult>('compare_bom_versions', {
        sourceVersionId: sourceId,
        targetVersionId: targetId,
      });
      compareResult.value = result;
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '版本对比失败';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /** 清空对比结果 */
  function clearCompareResult() {
    compareResult.value = null;
  }

  return {
    historyList,
    compareResult,
    isLoading,
    error,
    total,
    currentPage,
    pageSize,
    loadHistory,
    compareVersions,
    clearCompareResult,
  };
});