/**
 * 基于localStorage的内存数据存储
 * 在浏览器环境下替代SQLite数据库
 */
import type { Project } from '@/types/project';
import type { BomVersion, BomNode, ChangeHistory } from '@/types/bom';
import type { Component, AlternativePart } from '@/types/component';

const STORAGE_KEY = 'bom-master-data';

/** 数据存储接口 */
export interface MockData {
  projects: Project[];
  bomVersions: BomVersion[];
  bomNodes: BomNode[];
  components: Component[];
  alternativeParts: AlternativePart[];
  changeHistory: ChangeHistory[];
}

/** 默认空数据 */
function getDefaultData(): MockData {
  return {
    projects: [],
    bomVersions: [],
    bomNodes: [],
    components: [],
    alternativeParts: [],
    changeHistory: [],
  };
}

/** 加载数据 */
export function loadData(): MockData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // 忽略解析错误
  }
  return getDefaultData();
}

/** 保存数据 */
export function saveData(data: MockData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** 获取单例数据 */
let _data: MockData | null = null;

export function getData(): MockData {
  if (!_data) {
    _data = loadData();
  }
  return _data;
}

export function flushData(): void {
  if (_data) {
    saveData(_data);
  }
}

/** 生成UUID */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 获取当前时间ISO字符串 */
export function now(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}