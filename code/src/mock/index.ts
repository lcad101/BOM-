/**
 * Mock命令处理器
 * 在浏览器环境下模拟所有Tauri IPC命令
 */
import { getData, flushData, generateId, now } from './store';
import type { Project } from '@/types/project';
import type { BomVersion, BomNode, BomCompareResult, ChangeHistory } from '@/types/bom';
import type { Component } from '@/types/component';
import type { PaginatedData } from '@/types/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const commands: Record<string, (...args: any[]) => any> = {
  create_project: cmdCreateProject,
  list_projects: cmdListProjects,
  get_project: cmdGetProject,
  update_project: cmdUpdateProject,
  archive_project: cmdArchiveProject,
  delete_project: cmdDeleteProject,
  create_bom_version: cmdCreateBomVersion,
  list_bom_versions: cmdListBomVersions,
  get_bom_version: cmdGetBomVersion,
  release_bom_version: cmdReleaseBomVersion,
  get_bom_tree: cmdGetBomTree,
  create_bom_node: cmdCreateBomNode,
  update_bom_node: cmdUpdateBomNode,
  delete_bom_node: cmdDeleteBomNode,
  move_bom_node: cmdMoveBomNode,
  compare_bom_versions: cmdCompareBomVersions,
  get_change_history: cmdGetChangeHistory,
  create_component: cmdCreateComponent,
  search_components: cmdSearchComponents,
  get_component: cmdGetComponent,
  update_component: cmdUpdateComponent,
  list_alternative_parts: cmdListAlternativeParts,
  add_alternative_part: cmdAddAlternativePart,
  remove_alternative_part: cmdRemoveAlternativePart,
  export_bom_to_excel: cmdExportBom,
  trigger_backup: cmdTriggerBackup,
  restore_from_backup: cmdRestoreFromBackup,
  delete_bom_version: cmdDeleteBomVersion,
};

export async function mockInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  const handler = commands[command];
  if (!handler) throw new Error(`未知命令: ${command}`);
  return handler(args || {}) as T;
}

// ============ 项目管理 ============

function cmdCreateProject(a: Record<string, unknown>): Project {
  const d = getData();
  const name = a.name as string;
  const code = a.projectCode as string;
  const desc = (a.description as string) || '';
  const owner = a.owner as string;
  if (!name) throw new Error('项目名称不能为空');
  if (!code) throw new Error('项目编号不能为空');
  if (d.projects.some((p) => p.name === name || p.projectCode === code)) {
    throw new Error('项目名称或编号已存在');
  }
  const ts = now();
  const p: Project = {
    id: generateId(), name, projectCode: code, description: desc, owner,
    status: 'active', bomCount: 0, createdAt: ts, updatedAt: ts, deletedAt: null,
  };
  d.projects.unshift(p);
  flushData();
  return p;
}

function cmdListProjects(a: Record<string, unknown>): PaginatedData<Project> {
  const d = getData();
  const status = (a.status as string) || 'active';
  const keyword = (a.keyword as string) || '';
  const page = (a.page as number) || 1;
  const pageSize = (a.pageSize as number) || 20;
  let items = d.projects.filter((p) => p.status === status);
  if (keyword) {
    const kw = keyword.toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(kw) || p.projectCode.toLowerCase().includes(kw));
  }
  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

function cmdGetProject(a: Record<string, unknown>): Project {
  const d = getData();
  const id = a.projectId as string;
  const p = d.projects.find((x) => x.id === id);
  if (!p) throw new Error(`项目 ${id} 不存在`);
  return { ...p, bomCount: d.bomVersions.filter((v) => v.projectId === id).length };
}

function cmdUpdateProject(a: Record<string, unknown>): Project {
  const d = getData();
  const id = a.projectId as string;
  const idx = d.projects.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`项目 ${id} 不存在`);
  if (a.name) d.projects[idx].name = a.name as string;
  if (a.description !== undefined) d.projects[idx].description = a.description as string;
  if (a.owner) d.projects[idx].owner = a.owner as string;
  d.projects[idx].updatedAt = now();
  flushData();
  return d.projects[idx];
}

function cmdArchiveProject(a: Record<string, unknown>): void {
  const d = getData();
  const p = d.projects.find((x) => x.id === a.projectId);
  if (p) { p.status = 'archived'; p.updatedAt = now(); flushData(); }
}

function cmdDeleteProject(a: Record<string, unknown>): void {
  const d = getData();
  const id = a.projectId as string;
  if (a.permanent) {
    d.projects = d.projects.filter((p) => p.id !== id);
  } else {
    const p = d.projects.find((x) => x.id === id);
    if (p) { p.status = 'deleted'; p.deletedAt = now(); }
  }
  flushData();
}

// ============ BOM版本管理 ============

function cmdCreateBomVersion(a: Record<string, unknown>): BomVersion {
  const d = getData();
  const pid = a.projectId as string;
  const bomCode = a.bomCode as string;
  const name = a.name as string;
  const ver = (a.versionNumber as string) || 'v1.0';
  const desc = (a.description as string) || '';
  const srcId = a.sourceVersionId as string | undefined;
  const createdBy = (a.createdBy as string) || 'admin';

  if (!bomCode) throw new Error('BOM编号不能为空');
  if (d.bomVersions.some((v) => v.bomCode === bomCode)) {
    throw new Error('BOM编号已存在');
  }

  const ts = now();
  const version: BomVersion = {
    id: generateId(), projectId: pid, bomCode, name, versionNumber: ver, status: 'draft',
    sourceVersionId: srcId || null, description: desc, createdBy,
    releasedAt: null, createdAt: ts, updatedAt: ts, nodeCount: 0,
  };

  if (srcId) {
    const srcNodes = d.bomNodes.filter((n) => n.bomVersionId === srcId);
    const idMap: Record<string, string> = {};
    for (const node of srcNodes) {
      const newId = generateId();
      idMap[node.id] = newId;
      d.bomNodes.push({ ...node, id: newId, bomVersionId: version.id,
        parentId: node.parentId ? idMap[node.parentId] || null : null, createdAt: ts, updatedAt: ts });
    }
  }

  d.bomVersions.unshift(version);
  flushData();
  return version;
}

function ensureBomCode(v: BomVersion): void {
  if (!v.bomCode) {
    v.bomCode = '000000000000';
    flushData();
  }
}

function cmdListBomVersions(a: Record<string, unknown>): BomVersion[] {
  const d = getData();
  const pid = a.projectId as string;
  const status = a.status as string | undefined;
  return d.bomVersions.filter((v) => v.projectId === pid && (!status || v.status === status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function cmdGetBomVersion(a: Record<string, unknown>): BomVersion {
  const d = getData();
  const v = d.bomVersions.find((x) => x.id === a.versionId);
  if (!v) throw new Error(`BOM版本 ${a.versionId} 不存在`);
  ensureBomCode(v);
  return v;
}

function cmdReleaseBomVersion(a: Record<string, unknown>): void {
  const d = getData();
  const v = d.bomVersions.find((x) => x.id === a.versionId);
  if (v && v.status === 'draft') { v.status = 'released'; v.releasedAt = now(); v.updatedAt = now(); flushData(); }
}

// ============ BOM节点管理 ============

function cmdGetBomTree(a: Record<string, unknown>): BomNode | null {
  const d = getData();
  const vid = a.versionId as string;
  const nodes = d.bomNodes.filter((n) => n.bomVersionId === vid).sort((x, y) => x.sortOrder - y.sortOrder);
  if (nodes.length === 0) return null;

  for (const node of nodes) {
    if (node.componentId) {
      node.hasAlternatives = d.alternativeParts.some((ap) => ap.originalComponentId === node.componentId);
    }
  }

  const nodeMap = new Map<string, BomNode>();
  nodes.forEach((n) => nodeMap.set(n.id, { ...n, children: [] }));

  let root: BomNode | null = null;
  for (const node of nodes) {
    const mapped = nodeMap.get(node.id)!;
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(mapped);
    } else if (!node.parentId) {
      root = mapped;
    }
  }
  return root;
}

function cmdCreateBomNode(a: Record<string, unknown>): BomNode {
  const d = getData();
  const vid = a.versionId as string;
  const parentId = (a.parentId as string) || null;
  const nodeType = a.nodeType as string;
  const name = a.name as string;
  const quantity = (a.quantity as number) || 1;
  const unit = (a.unit as string) || 'PCS';
  const componentId = (a.componentId as string) || null;
  const refDes = (a.referenceDesignator as string) || '';
  const process = (a.process as string) || '';
  const pn = (a.partNumber as string) || '';
  const notes = (a.notes as string) || '';

  if (!name) throw new Error('节点名称不能为空');
  if (quantity <= 0) throw new Error('数量必须大于0');

  const version = d.bomVersions.find((v) => v.id === vid);
  if (!version || version.status !== 'draft') throw new Error('该版本已发布，不可修改');

  let level = 0;
  if (parentId) {
    const parent = d.bomNodes.find((n) => n.id === parentId);
    if (!parent) throw new Error('父节点不存在');
    if (parent.level >= 10) throw new Error('已达到最大层级深度(10级)');
    level = parent.level + 1;
  }

  const dup = d.bomNodes.find((n) => n.bomVersionId === vid && n.parentId === parentId && n.name === name);
  if (dup) throw new Error('同一父节点下已存在同名节点');

  const maxOrder = d.bomNodes.filter((n) => n.bomVersionId === vid && n.parentId === parentId)
    .reduce((max, n) => Math.max(max, n.sortOrder), 0);

  const ts = now();
  const node: BomNode = {
    id: generateId(), bomVersionId: vid, parentId, componentId,
    nodeType: nodeType as 'assembly' | 'component', name, quantity, unit,
    referenceDesignator: refDes, level, sortOrder: maxOrder + 1, partNumber: pn, process, notes,
    hasAlternatives: false, children: [], createdAt: ts, updatedAt: ts,
  };
  d.bomNodes.push(node);
  flushData();
  return node;
}

function cmdUpdateBomNode(a: Record<string, unknown>): void {
  const d = getData();
  const node = d.bomNodes.find((n) => n.id === a.nodeId);
  if (!node) throw new Error('节点不存在');
  const version = d.bomVersions.find((v) => v.id === node.bomVersionId);
  if (version && version.status !== 'draft') throw new Error('该版本已发布，不可修改');

  if (a.level !== undefined) node.level = a.level as number;
  if (a.name !== undefined) node.name = a.name as string;
  if (a.quantity !== undefined) node.quantity = a.quantity as number;
  if (a.unit !== undefined) node.unit = a.unit as string;
  if (a.referenceDesignator !== undefined) node.referenceDesignator = a.referenceDesignator as string;
  if (a.partNumber !== undefined) node.partNumber = a.partNumber as string;
  if (a.process !== undefined) node.process = a.process as string;
  if (a.sortOrder !== undefined) node.sortOrder = a.sortOrder as number;
  if (a.notes !== undefined) node.notes = a.notes as string;
  node.updatedAt = now();
  flushData();
}

function cmdDeleteBomNode(a: Record<string, unknown>): { deletedNodeId: string; deletedCount: number } {
  const d = getData();
  const nodeId = a.nodeId as string;
  const toDelete = new Set<string>();
  function collect(id: string) {
    toDelete.add(id);
    d.bomNodes.filter((n) => n.parentId === id).forEach((n) => collect(n.id));
  }
  collect(nodeId);
  d.bomNodes = d.bomNodes.filter((n) => !toDelete.has(n.id));
  flushData();
  return { deletedNodeId: nodeId, deletedCount: toDelete.size };
}

function cmdMoveBomNode(a: Record<string, unknown>): void {
  const d = getData();
  const node = d.bomNodes.find((n) => n.id === a.nodeId);
  if (!node) throw new Error('节点不存在');
  let newLevel = 0;
  const newParentId = (a.newParentId as string) || null;
  if (newParentId) {
    const parent = d.bomNodes.find((n) => n.id === newParentId);
    if (!parent) throw new Error('目标父节点不存在');
    if (parent.level >= 10) throw new Error('移动后层级超过10级');
    newLevel = parent.level + 1;
  }
  node.parentId = newParentId;
  node.level = newLevel;
  node.sortOrder = (a.newSortOrder as number) || 0;
  node.updatedAt = now();
  flushData();
}

// ============ 版本对比和历史 ============

function cmdCompareBomVersions(a: Record<string, unknown>): BomCompareResult {
  const d = getData();
  const srcId = a.sourceVersionId as string;
  const tgtId = a.targetVersionId as string;
  if (srcId === tgtId) throw new Error('请选择不同的版本进行对比');

  const srcVer = d.bomVersions.find((v) => v.id === srcId);
  const tgtVer = d.bomVersions.find((v) => v.id === tgtId);
  if (!srcVer || !tgtVer) throw new Error('版本不存在');

  const srcNodes = d.bomNodes.filter((n) => n.bomVersionId === srcId);
  const tgtNodes = d.bomNodes.filter((n) => n.bomVersionId === tgtId);
  const srcMap = new Map(srcNodes.map((n) => [n.name, n]));
  const tgtMap = new Map(tgtNodes.map((n) => [n.name, n]));

  const differences: BomCompareResult['differences'] = [];
  let added = 0, removed = 0, modified = 0;

  for (const [name, tgtNode] of tgtMap) {
    const srcNode = srcMap.get(name);
    if (srcNode) {
      if (srcNode.quantity !== tgtNode.quantity) {
        modified++;
        differences.push({ type: 'modified', nodeId: tgtNode.id, name,
          changes: [{ field: 'quantity', oldValue: String(srcNode.quantity), newValue: String(tgtNode.quantity) }] });
      }
    } else {
      added++;
      differences.push({ type: 'added', nodeId: tgtNode.id, name, details: '新增节点' });
    }
  }
  for (const [name, srcNode] of srcMap) {
    if (!tgtMap.has(name)) {
      removed++;
      differences.push({ type: 'removed', nodeId: srcNode.id, name, details: '删除节点' });
    }
  }

  return {
    sourceVersion: { id: srcVer.id, versionNumber: srcVer.versionNumber },
    targetVersion: { id: tgtVer.id, versionNumber: tgtVer.versionNumber },
    differences,
    summary: { added, removed, modified, totalChanges: added + removed + modified },
  };
}

function cmdGetChangeHistory(a: Record<string, unknown>): PaginatedData<ChangeHistory> {
  const d = getData();
  const vid = a.bomVersionId as string;
  const page = (a.page as number) || 1;
  const pageSize = (a.pageSize as number) || 20;
  const items = d.changeHistory.filter((h) => h.bomVersionId === vid)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ============ 元器件管理 ============

function cmdCreateComponent(a: Record<string, unknown>): Component {
  const d = getData();
  const pn = a.partNumber as string;
  const mfr = (a.manufacturer as string) || '';
  if (!pn) throw new Error('型号不能为空');
  if (d.components.some((c) => c.partNumber === pn && c.manufacturer === mfr)) {
    throw new Error('同厂商下型号已存在');
  }
  const ts = now();
  const comp: Component = {
    id: generateId(), partNumber: pn, manufacturer: mfr,
    category: (a.category as string) || '', subCategory: (a.subCategory as string) || '',
    description: (a.description as string) || '', packageType: (a.packageType as string) || '',
    specifications: '{}', datasheetUrl: (a.datasheetUrl as string) || '',
    defaultUnit: (a.defaultUnit as string) || 'PCS', isActive: true,
    hasAlternatives: false, alternativeCount: 0, usedInBoms: 0, createdAt: ts, updatedAt: ts,
  };
  d.components.push(comp);
  flushData();
  return comp;
}

function cmdSearchComponents(a: Record<string, unknown>): PaginatedData<Component> {
  const d = getData();
  const keyword = (a.keyword as string) || '';
  const category = a.category as string | undefined;
  const mfr = a.manufacturer as string | undefined;
  const page = (a.page as number) || 1;
  const pageSize = (a.pageSize as number) || 20;

  let items = d.components.filter((c) => c.isActive);
  if (keyword) {
    const kw = keyword.toLowerCase();
    items = items.filter((c) => c.partNumber.toLowerCase().includes(kw) ||
      c.description.toLowerCase().includes(kw) || c.manufacturer.toLowerCase().includes(kw));
  }
  if (category) items = items.filter((c) => c.category === category);
  if (mfr) items = items.filter((c) => c.manufacturer === mfr);

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

function cmdGetComponent(a: Record<string, unknown>): Component {
  const d = getData();
  const comp = d.components.find((c) => c.id === a.componentId);
  if (!comp) throw new Error(`元器件 ${a.componentId} 不存在`);
  const altCount = d.alternativeParts.filter((ap) => ap.originalComponentId === a.componentId).length;
  return { ...comp, hasAlternatives: altCount > 0, alternativeCount: altCount };
}

function cmdUpdateComponent(a: Record<string, unknown>): void {
  const d = getData();
  const comp = d.components.find((c) => c.id === a.componentId);
  if (!comp) throw new Error('元器件不存在');
  if (a.partNumber) comp.partNumber = a.partNumber as string;
  if (a.manufacturer) comp.manufacturer = a.manufacturer as string;
  if (a.category) comp.category = a.category as string;
  if (a.description !== undefined) comp.description = a.description as string;
  if (a.packageType) comp.packageType = a.packageType as string;
  if (a.datasheetUrl !== undefined) comp.datasheetUrl = a.datasheetUrl as string;
  comp.updatedAt = now();
  flushData();
}

// ============ 替代料管理 ============

function cmdListAlternativeParts(a: Record<string, unknown>): unknown[] {
  const d = getData();
  return d.alternativeParts.filter((ap) => ap.originalComponentId === a.componentId)
    .map((ap) => ({ ...ap, alternativeComponent: d.components.find((c) => c.id === ap.alternativeComponentId) || null }));
}

function cmdAddAlternativePart(a: Record<string, unknown>): unknown {
  const d = getData();
  const origId = a.originalComponentId as string;
  const altId = a.alternativeComponentId as string;
  if (origId === altId) throw new Error('替代料不能与原件相同');
  const ts = now();
  const alt = {
    id: generateId(), originalComponentId: origId, alternativeComponentId: altId,
    priority: (a.priority as number) || 1,
    verificationStatus: ((a.verificationStatus as string) || 'unverified') as 'unverified' | 'verifying' | 'verified' | 'not_recommended',
    notes: (a.notes as string) || '', verifiedBy: '', verifiedAt: null, createdAt: ts, updatedAt: ts,
  };
  d.alternativeParts.push(alt);
  flushData();
  return alt;
}

function cmdRemoveAlternativePart(a: Record<string, unknown>): void {
  const d = getData();
  d.alternativeParts = d.alternativeParts.filter((ap) => ap.id !== a.alternativeId);
  flushData();
}

function cmdDeleteBomVersion(a: Record<string, unknown>): void {
  const d = getData();
  const versionId = a.versionId as string;
  // 删除BOM版本
  d.bomVersions = d.bomVersions.filter((v) => v.id !== versionId);
  // 删除关联的BOM节点
  d.bomNodes = d.bomNodes.filter((n) => n.bomVersionId !== versionId);
  flushData();
}

function cmdTriggerBackup(): { backupPath: string; timestamp: string } {
  const ts = now();
  const backupPath = `backups/bom_master_backup_${ts.replace(/[: ]/g, '-').replace(/-/g, '')}.json`;
  return { backupPath, timestamp: ts };
}

function cmdRestoreFromBackup(): { success: boolean; message: string } {
  return { success: true, message: '恢复成功，数据已还原' };
}

function cmdExportBom(a: Record<string, unknown>): { filePath: string; totalRows: number; fileSize: number } {
  const d = getData();
  const nodes = d.bomNodes.filter((n) => n.bomVersionId === a.bomVersionId);
  // 使用用户指定的路径，如果未指定则使用默认路径
  const filePath = (a.filePath as string) || `bom_export_${a.bomVersionId}.xlsx`;
  return { filePath, totalRows: nodes.length, fileSize: nodes.length * 200 };
}
