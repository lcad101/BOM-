/**
 * 项目状态管理
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { safeInvoke } from '@/utils/ipc';
import type { Project, CreateProjectParams, UpdateProjectParams, ProjectQueryParams } from '@/types/project';
import type { PaginatedData } from '@/types/api';

export const useProjectStore = defineStore('project', () => {
  // ========== 状态 ==========
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(20);
  const keyword = ref('');
  const statusFilter = ref<string>('active');

  // ========== 计算属性 ==========
  const activeProjects = computed(() => projects.value.filter((p) => p.status === 'active'));
  const archivedProjects = computed(() => projects.value.filter((p) => p.status === 'archived'));

  // ========== 操作 ==========
  /** 加载项目列表 */
  async function loadProjects(params?: ProjectQueryParams) {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await safeInvoke<PaginatedData<Project>>('list_projects', {
        status: params?.status || statusFilter.value,
        keyword: params?.keyword || keyword.value,
        page: params?.page || currentPage.value,
        pageSize: params?.pageSize || pageSize.value,
        sortBy: params?.sortBy || 'updated_at',
        sortOrder: params?.sortOrder || 'desc',
      });
      projects.value = result.items;
      total.value = result.total;
      currentPage.value = result.page;
      pageSize.value = result.pageSize;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载项目列表失败';
    } finally {
      isLoading.value = false;
    }
  }

  /** 创建项目 */
  async function createProject(params: CreateProjectParams): Promise<Project | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const project = await safeInvoke<Project>('create_project', {
        name: params.name,
        projectCode: params.projectCode,
        description: params.description || '',
        owner: params.owner,
      }, { successMessage: '项目创建成功' });
      projects.value.unshift(project);
      return project;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建项目失败';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /** 更新项目 */
  async function updateProject(params: UpdateProjectParams): Promise<Project | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const project = await safeInvoke<Project>('update_project', {
        projectId: params.projectId,
        name: params.name,
        description: params.description,
        owner: params.owner,
      }, { successMessage: '项目更新成功' });
      const index = projects.value.findIndex((p) => p.id === params.projectId);
      if (index !== -1) {
        projects.value[index] = project;
      }
      if (currentProject.value?.id === params.projectId) {
        currentProject.value = project;
      }
      return project;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新项目失败';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /** 归档项目 */
  async function archiveProject(projectId: string): Promise<boolean> {
    try {
      await safeInvoke('archive_project', { projectId }, { successMessage: '项目已归档' });
      const index = projects.value.findIndex((p) => p.id === projectId);
      if (index !== -1) {
        projects.value[index].status = 'archived';
      }
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '归档项目失败';
      return false;
    }
  }

  /** 删除项目 */
  async function deleteProject(projectId: string, permanent = false): Promise<boolean> {
    try {
      await safeInvoke('delete_project', { projectId, permanent }, {
        successMessage: permanent ? '项目已永久删除' : '项目已删除，30天内可恢复',
      });
      if (permanent) {
        projects.value = projects.value.filter((p) => p.id !== projectId);
      } else {
        const index = projects.value.findIndex((p) => p.id === projectId);
        if (index !== -1) {
          projects.value[index].status = 'deleted';
        }
      }
      if (currentProject.value?.id === projectId) {
        currentProject.value = null;
      }
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除项目失败';
      return false;
    }
  }

  /** 获取项目详情 */
  async function getProject(projectId: string): Promise<Project | null> {
    try {
      const project = await safeInvoke<Project>('get_project', { projectId });
      currentProject.value = project;
      return project;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取项目详情失败';
      return null;
    }
  }

  /** 设置当前项目 */
  function setCurrentProject(project: Project | null) {
    currentProject.value = project;
  }

  /** 设置搜索关键词 */
  function setKeyword(value: string) {
    keyword.value = value;
  }

  /** 设置状态筛选 */
  function setStatusFilter(value: string) {
    statusFilter.value = value;
  }

  return {
    // 状态
    projects,
    currentProject,
    isLoading,
    error,
    total,
    currentPage,
    pageSize,
    keyword,
    statusFilter,
    // 计算属性
    activeProjects,
    archivedProjects,
    // 操作
    loadProjects,
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
    getProject,
    setCurrentProject,
    setKeyword,
    setStatusFilter,
  };
});