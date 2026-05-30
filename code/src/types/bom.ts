/**
 * BOM相关类型定义
 */

/** 节点类型 */
export const NodeType = {
  Assembly: 'assembly',
  Component: 'component',
} as const;
export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/** BOM版本状态 */
export const BomVersionStatus = {
  Draft: 'draft',
  Released: 'released',
  Archived: 'archived',
} as const;
export type BomVersionStatus = (typeof BomVersionStatus)[keyof typeof BomVersionStatus];

/** 变更类型 */
export const ChangeType = {
  Create: 'create',
  Update: 'update',
  Delete: 'delete',
  Move: 'move',
  AlternativeAdd: 'alternative_add',
  AlternativeRemove: 'alternative_remove',
} as const;
export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType];

/** BOM版本 */
export interface BomVersion {
  id: string;
  projectId: string;
  bomCode: string;
  name: string;
  versionNumber: string;
  status: BomVersionStatus;
  sourceVersionId?: string | null;
  description: string;
  createdBy: string;
  releasedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  nodeCount?: number;
}

/** BOM节点 */
export interface BomNode {
  id: string;
  bomVersionId: string;
  parentId: string | null;
  componentId: string | null;
  nodeType: NodeType;
  name: string;
  quantity: number;
  unit: string;
  referenceDesignator: string;
  level: number;
  sortOrder: number;
  partNumber: string;
  process: string;
  notes: string;
  hasAlternatives?: boolean;
  children: BomNode[];
  createdAt: string;
  updatedAt: string;
}

/** 创建BOM节点参数 */
export interface CreateBomNodeParams {
  versionId: string;
  parentId: string | null;
  nodeType: NodeType;
  name: string;
  quantity: number;
  unit?: string;
  componentId?: string;
  referenceDesignator?: string;
  level?: number;
  sortOrder?: number;
  partNumber?: string;
  process?: string;
  notes?: string;
}

/** 更新BOM节点参数 */
export interface UpdateBomNodeParams {
  nodeId: string;
  level?: number;
  name?: string;
  quantity?: number;
  unit?: string;
  referenceDesignator?: string;
  sortOrder?: number;
  partNumber?: string;
  process?: string;
  notes?: string;
}

/** 移动BOM节点参数 */
export interface MoveBomNodeParams {
  nodeId: string;
  newParentId: string | null;
  newSortOrder?: number;
}

/** 创建BOM版本参数 */
export interface CreateBomVersionParams {
  projectId: string;
  bomCode: string;
  name: string;
  versionNumber?: string;
  description?: string;
  sourceVersionId?: string;
  createdBy: string;
}

/** 变更历史记录 */
export interface ChangeHistory {
  id: string;
  bomVersionId: string;
  nodeId: string | null;
  changeType: ChangeType;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changeSummary: string;
  changedBy: string;
  createdAt: string;
}

/** BOM版本对比差异 */
export interface BomDifference {
  type: 'added' | 'removed' | 'modified';
  nodeId: string;
  name: string;
  details?: string;
  changes?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

/** BOM版本对比结果 */
export interface BomCompareResult {
  sourceVersion: { id: string; versionNumber: string };
  targetVersion: { id: string; versionNumber: string };
  differences: BomDifference[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    totalChanges: number;
  };
}