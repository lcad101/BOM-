/**
 * 数据校验工具
 */

/** 校验结果 */
export interface ValidateResult {
  valid: boolean;
  message?: string;
}

/**
 * 校验必填字段
 */
export function required(value: unknown, fieldName: string): ValidateResult {
  if (value === undefined || value === null || value === '') {
    return { valid: false, message: `${fieldName}不能为空` };
  }
  return { valid: true };
}

/**
 * 校验字符串长度
 */
export function stringLength(
  value: string,
  min: number,
  max: number,
  fieldName: string,
): ValidateResult {
  if (value.length < min) {
    return { valid: false, message: `${fieldName}长度不能少于${min}个字符` };
  }
  if (value.length > max) {
    return { valid: false, message: `${fieldName}长度不能超过${max}个字符` };
  }
  return { valid: true };
}

/**
 * 校验项目编号格式 (P00XXXXX-YYYY-XXX)
 */
export function projectCodeFormat(code: string): ValidateResult {
  const regex = /^P00\d{5}-\d{4}-\d{3}$/;
  if (!regex.test(code)) {
    return { valid: false, message: '项目编号格式不正确，应为 P00XXXXX-YYYY-XXX' };
  }
  return { valid: true };
}

/**
 * 校验数量（正整数）
 */
export function positiveInteger(value: number, fieldName: string): ValidateResult {
  if (!Number.isInteger(value) || value <= 0) {
    return { valid: false, message: `${fieldName}必须是大于0的整数` };
  }
  return { valid: true };
}

/**
 * 校验BOM层级深度
 */
export function bomLevel(level: number, maxLevel = 10): ValidateResult {
  if (level > maxLevel) {
    return { valid: false, message: `已达到最大层级深度(${maxLevel}级)` };
  }
  return { valid: true };
}

/**
 * 校验替代料不能与原件相同
 */
export function alternativeNotSame(originalId: string, alternativeId: string): ValidateResult {
  if (originalId === alternativeId) {
    return { valid: false, message: '替代料不能与原件型号相同' };
  }
  return { valid: true };
}

/**
 * 校验邮箱格式
 */
export function emailFormat(email: string): ValidateResult {
  if (!email) return { valid: true };
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return { valid: false, message: '邮箱格式不正确' };
  }
  return { valid: true };
}

/**
 * 批量校验，返回第一个失败的结果或通过
 */
export function validateAll(...results: ValidateResult[]): ValidateResult {
  for (const result of results) {
    if (!result.valid) return result;
  }
  return { valid: true };
}