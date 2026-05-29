/**
 * 格式化工具函数
 */
import dayjs from 'dayjs';

/**
 * 格式化日期时间
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * 格式化日期
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD');
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = dayjs(dateStr);
  const now = dayjs();
  const diffMinutes = now.diff(date, 'minute');
  const diffHours = now.diff(date, 'hour');
  const diffDays = now.diff(date, 'day');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return formatDate(dateStr);
}

/**
 * 格式化版本状态为中文
 */
export function formatVersionStatus(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    released: '已发布',
    archived: '已归档',
  };
  return map[status] || status;
}

/**
 * 格式化项目状态为中文
 */
export function formatProjectStatus(status: string): string {
  const map: Record<string, string> = {
    active: '活跃',
    archived: '已归档',
    deleted: '已删除',
  };
  return map[status] || status;
}

/**
 * 格式化节点类型为中文
 */
export function formatNodeType(type: string): string {
  const map: Record<string, string> = {
    assembly: '组件/装配体',
    component: '元器件',
  };
  return map[type] || type;
}

/**
 * 格式化验证状态为中文
 */
export function formatVerificationStatus(status: string): string {
  const map: Record<string, string> = {
    unverified: '未验证',
    verifying: '验证中',
    verified: '已验证',
    not_recommended: '不推荐',
  };
  return map[status] || status;
}

/**
 * 格式化变更类型为中文
 */
export function formatChangeType(type: string): string {
  const map: Record<string, string> = {
    create: '新增',
    update: '修改',
    delete: '删除',
    move: '移动',
    alternative_add: '添加替代料',
    alternative_remove: '移除替代料',
  };
  return map[type] || type;
}

/**
 * 生成导出文件名
 */
export function generateExportFileName(
  projectName: string,
  bomName: string,
  versionNumber: string,
): string {
  const date = dayjs().format('YYYYMMDD');
  return `${projectName}_${bomName}_${versionNumber}_${date}.xlsx`;
}