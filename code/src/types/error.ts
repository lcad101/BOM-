/**
 * 错误类型定义
 */

/** 错误码枚举 */
export const AppErrorCode = {
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
export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

/** 应用错误类 */
export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: AppErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

/** Vue全局错误处理器类型 */
export interface ErrorInfo {
  component?: string;
  lifecycle?: string;
  error: unknown;
}