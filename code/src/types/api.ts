/**
 * API响应类型定义
 */

/** 统一成功响应 */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/** 统一错误响应 */
export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** 分页数据 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 分页查询参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 错误码 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  BUSINESS_RULE_ERROR: 'BUSINESS_RULE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  IMPORT_ERROR: 'IMPORT_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 导入结果 */
export interface ImportResult {
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errorRows: number;
  errors: Array<{ row: number; message: string }>;
  createdComponents: number;
  createdNodes: number;
}

/** 导入校验结果 */
export interface ValidationResult {
  valid: boolean;
  totalRows: number;
  errors: Array<{
    row: number;
    column: string;
    severity: 'error' | 'warning';
    message: string;
  }>;
  errorCount: number;
  warningCount: number;
}

/** 导出结果 */
export interface ExportResult {
  filePath: string;
  totalRows: number;
  fileSize: number;
}

/** 导出选项 */
export interface ExportOptions {
  exportScope: 'all' | 'topLevel' | 'leafOnly';
  includeFields: string[];
  includeAlternatives?: boolean;
  indentLevels?: boolean;
}

/** 字段映射 */
export interface FieldMapping {
  partNumber: string;
  quantity: string;
  manufacturer?: string;
  category?: string;
  description?: string;
  unit?: string;
  referenceDesignator?: string;
  notes?: string;
}

/** 导入选项 */
export interface ImportOptions {
  skipDuplicates?: boolean;
  createMissingComponents?: boolean;
  maxLevel?: number;
}