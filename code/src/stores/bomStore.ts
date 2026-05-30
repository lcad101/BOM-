/**
 * BOM状态管理
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { safeInvoke } from '@/utils/ipc';
import { useProjectStore } from './projectStore';
import type {
  BomNode,
  BomVersion,
  CreateBomNodeParams,
  UpdateBomNodeParams,
  MoveBomNodeParams,
  CreateBomVersionParams,
  BomCompareResult,
} from '@/types/bom';

export const useBomStore = defineStore('bom', () => {
  const bomTree = ref<BomNode | null>(null);
  const bomVersions = ref<BomVersion[]>([]);
  const currentVersion = ref<BomVersion | null>(null);
  const selectedNode = ref<BomNode | null>(null);
  const expandedNodeIds = ref<Set<string>>(new Set());
  const isLoading = ref(false);
  const isTreeLoading = ref(false);
  const error = ref<string | null>(null);

  const isDraft = computed(() => currentVersion.value?.status === 'draft');
  const isReleased = computed(() => currentVersion.value?.status === 'released');
  const canEdit = computed(() => currentVersion.value?.status === 'draft');
  const draftVersions = computed(() => bomVersions.value.filter((v) => v.status === 'draft'));
  const releasedVersions = computed(() => bomVersions.value.filter((v) => v.status === 'released'));

  function countNodes(node: BomNode | null): number {
    if (!node) return 0;
    let count = 1;
    for (const child of node.children) count += countNodes(child);
    return count;
  }
  const totalNodeCount = computed(() => countNodes(bomTree.value));

  async function loadBomVersions(projectId: string, status?: string) {
    isLoading.value = true; error.value = null;
    try {
      bomVersions.value = await safeInvoke<BomVersion[]>('list_bom_versions', { projectId, status: status || undefined });
    } catch (err) { error.value = err instanceof Error ? err.message : '加载BOM版本列表失败';
    } finally { isLoading.value = false; }
  }

  async function createBomVersion(params: CreateBomVersionParams): Promise<BomVersion | null> {
    isLoading.value = true; error.value = null;
    try {
      const version = await safeInvoke<BomVersion>('create_bom_version', {
        projectId: params.projectId, bomCode: params.bomCode, name: params.name,
        versionNumber: params.versionNumber || 'v1.0', description: params.description || '',
        sourceVersionId: params.sourceVersionId || null, createdBy: params.createdBy,
      }, { successMessage: 'BOM版本创建成功' });
      bomVersions.value.unshift(version); return version;
    } catch (err) { error.value = err instanceof Error ? err.message : '创建BOM版本失败'; return null;
    } finally { isLoading.value = false; }
  }

  async function getBomVersion(versionId: string): Promise<BomVersion | null> {
    try {
      const version = await safeInvoke<BomVersion>('get_bom_version', { versionId });
      currentVersion.value = version; return version;
    } catch (err) { error.value = err instanceof Error ? err.message : '获取BOM版本详情失败'; return null; }
  }

  async function releaseBomVersion(versionId: string): Promise<boolean> {
    try {
      await safeInvoke('release_bom_version', { versionId }, { successMessage: 'BOM版本已发布' });
      if (currentVersion.value?.id === versionId) currentVersion.value.status = 'released';
      const idx = bomVersions.value.findIndex((v) => v.id === versionId);
      if (idx !== -1) bomVersions.value[idx].status = 'released';
      return true;
    } catch (err) { error.value = err instanceof Error ? err.message : '发布BOM版本失败'; return false; }
  }

  async function deleteBomVersion(versionId: string): Promise<boolean> {
    try {
      await safeInvoke('delete_bom_version', { versionId }, { successMessage: 'BOM版本已删除' });
      bomVersions.value = bomVersions.value.filter((v) => v.id !== versionId);
      if (currentVersion.value?.id === versionId) currentVersion.value = null;
      return true;
    } catch (err) { error.value = err instanceof Error ? err.message : '删除BOM版本失败'; return false; }
  }

  async function loadBomTree(versionId: string, expandAll = false) {
    isTreeLoading.value = true; error.value = null;
    try {
      bomTree.value = await safeInvoke<BomNode>('get_bom_tree', { versionId, expandAll });
      if (expandAll && bomTree.value) expandAllNodes(bomTree.value);
    } catch (err) { error.value = err instanceof Error ? err.message : '加载BOM树失败';
    } finally { isTreeLoading.value = false; }
  }

  async function addNode(params: CreateBomNodeParams): Promise<BomNode | null> {
    if (!canEdit.value) { error.value = '该版本已发布，请创建新版本进行修改'; return null; }
    try {
      const node = await safeInvoke<BomNode>('create_bom_node', {
        versionId: params.versionId, parentId: params.parentId, nodeType: params.nodeType,
        name: params.name, quantity: params.quantity, unit: params.unit || 'PCS',
        componentId: params.componentId || null,
        referenceDesignator: params.referenceDesignator || '',
        level: params.level, sortOrder: params.sortOrder,
        partNumber: params.partNumber || '',
        process: params.process || '', notes: params.notes || '',
      }, { successMessage: '节点创建成功' });
      await loadBomTree(params.versionId); return node;
    } catch (err) { error.value = err instanceof Error ? err.message : '创建节点失败'; return null; }
  }

  async function updateNode(params: UpdateBomNodeParams): Promise<boolean> {
    if (!canEdit.value) { error.value = '该版本已发布，请创建新版本进行修改'; return false; }
    try {
      await safeInvoke('update_bom_node', {
        nodeId: params.nodeId, level: params.level, name: params.name,
        quantity: params.quantity, unit: params.unit,
        referenceDesignator: params.referenceDesignator,
        sortOrder: params.sortOrder, partNumber: params.partNumber,
        process: params.process, notes: params.notes,
      }, { successMessage: '节点更新成功' });
      if (currentVersion.value) await loadBomTree(currentVersion.value.id);
      return true;
    } catch (err) { error.value = err instanceof Error ? err.message : '更新节点失败'; return false; }
  }

  async function deleteNode(nodeId: string): Promise<boolean> {
    if (!canEdit.value) { error.value = '该版本已发布，请创建新版本进行修改'; return false; }
    try {
      await safeInvoke('delete_bom_node', { nodeId, cascade: true }, { successMessage: '节点删除成功' });
      if (selectedNode.value?.id === nodeId) selectedNode.value = null;
      if (currentVersion.value) await loadBomTree(currentVersion.value.id);
      return true;
    } catch (err) { error.value = err instanceof Error ? err.message : '删除节点失败'; return false; }
  }

  async function moveNode(params: MoveBomNodeParams): Promise<boolean> {
    if (!canEdit.value) { error.value = '该版本已发布，请创建新版本进行修改'; return false; }
    try {
      await safeInvoke('move_bom_node', {
        nodeId: params.nodeId, newParentId: params.newParentId, newSortOrder: params.newSortOrder,
      }, { successMessage: '节点移动成功' });
      if (currentVersion.value) await loadBomTree(currentVersion.value.id);
      return true;
    } catch (err) { error.value = err instanceof Error ? err.message : '移动节点失败'; return false; }
  }

  async function compareVersions(sourceId: string, targetId: string): Promise<BomCompareResult | null> {
    try {
      return await safeInvoke<BomCompareResult>('compare_bom_versions', {
        sourceVersionId: sourceId, targetVersionId: targetId,
      });
    } catch (err) { error.value = err instanceof Error ? err.message : '版本对比失败'; return null; }
  }

  function selectNode(node: BomNode | null) { selectedNode.value = node; }
  function toggleNodeExpand(nodeId: string) {
    if (expandedNodeIds.value.has(nodeId)) expandedNodeIds.value.delete(nodeId);
    else expandedNodeIds.value.add(nodeId);
  }
  function expandAllNodes(node: BomNode | null) {
    if (!node) return;
    expandedNodeIds.value.add(node.id);
    for (const child of node.children) expandAllNodes(child);
  }
  function collapseAllNodes() { expandedNodeIds.value.clear(); }
  function setCurrentVersion(version: BomVersion | null) {
    currentVersion.value = version; selectedNode.value = null; bomTree.value = null;
  }

  return {
    bomTree, bomVersions, currentVersion, selectedNode, expandedNodeIds, isLoading, isTreeLoading, error,
    isDraft, isReleased, canEdit, draftVersions, releasedVersions, totalNodeCount,
    loadBomVersions, createBomVersion, getBomVersion, releaseBomVersion, deleteBomVersion,
    loadBomTree, addNode, updateNode, deleteNode, moveNode, compareVersions,
    selectNode, toggleNodeExpand, expandAllNodes, collapseAllNodes, setCurrentVersion,
  };
});