/**
 * 元器件相关类型定义
 */

/** 验证状态 */
export const VerificationStatus = {
  Unverified: 'unverified',
  Verifying: 'verifying',
  Verified: 'verified',
  NotRecommended: 'not_recommended',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** 元器件 */
export interface Component {
  id: string;
  partNumber: string;
  manufacturer: string;
  category: string;
  subCategory: string;
  description: string;
  packageType: string;
  specifications: string;
  datasheetUrl: string;
  defaultUnit: string;
  isActive: boolean;
  hasAlternatives?: boolean;
  alternativeCount?: number;
  usedInBoms?: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建元器件参数 */
export interface CreateComponentParams {
  partNumber: string;
  manufacturer?: string;
  category?: string;
  subCategory?: string;
  description?: string;
  packageType?: string;
  specifications?: Record<string, unknown>;
  datasheetUrl?: string;
  defaultUnit?: string;
}

/** 更新元器件参数 */
export interface UpdateComponentParams {
  componentId: string;
  partNumber?: string;
  manufacturer?: string;
  category?: string;
  description?: string;
  packageType?: string;
  specifications?: Record<string, unknown>;
  datasheetUrl?: string;
}

/** 替代料 */
export interface AlternativePart {
  id: string;
  originalComponentId: string;
  alternativeComponentId: string;
  alternativeComponent?: Component;
  priority: number;
  verificationStatus: VerificationStatus;
  notes: string;
  verifiedBy: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 添加替代料参数 */
export interface AddAlternativeParams {
  originalComponentId: string;
  alternativeComponentId: string;
  priority?: number;
  verificationStatus?: VerificationStatus;
  notes?: string;
}

/** 更新替代料参数 */
export interface UpdateAlternativeParams {
  alternativeId: string;
  priority?: number;
  verificationStatus?: VerificationStatus;
  notes?: string;
  verifiedBy?: string;
}

/** 元器件搜索参数 */
export interface ComponentSearchParams {
  keyword?: string;
  category?: string;
  manufacturer?: string;
  hasAlternatives?: boolean;
  page?: number;
  pageSize?: number;
}

/** 供应商 */
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  leadTimeDays: number | null;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 元器件供应商关联 */
export interface ComponentSupplier {
  id: string;
  componentId: string;
  supplierId: string;
  supplier?: Supplier;
  supplierPartNumber: string;
  unitPrice: number | null;
  currency: string;
  moq: number | null;
  leadTimeDays: number | null;
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
}