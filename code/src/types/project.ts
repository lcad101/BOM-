/**
 * 项目相关类型定义
 */

/** 项目状态 */
export const ProjectStatus = {
  Active: 'active',
  Archived: 'archived',
  Deleted: 'deleted',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

/** 项目 */
export interface Project {
  id: string;
  name: string;
  projectCode: string;
  description: string;
  owner: string;
  status: ProjectStatus;
  bomCount?: number;
  lastModifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** 创建项目参数 */
export interface CreateProjectParams {
  name: string;
  projectCode: string;
  description?: string;
  owner: string;
}

/** 更新项目参数 */
export interface UpdateProjectParams {
  projectId: string;
  name?: string;
  description?: string;
  owner?: string;
}

/** 项目查询参数 */
export interface ProjectQueryParams {
  status?: ProjectStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}