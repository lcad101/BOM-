/**
 * IPC调用封装
 * 在Tauri桌面环境中调用真实后端，在浏览器环境中使用Mock数据
 */
import { ElMessage } from 'element-plus';
import { mockInvoke } from '@/mock';

/**
 * 检测是否在Tauri环境中运行
 */
function isTauriEnvironment(): boolean {
  try {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  } catch {
    return false;
  }
}

/**
 * 安全的IPC调用封装
 * @param command 命令名
 * @param args 命令参数
 * @param options 调用选项
 * @returns 命令执行结果
 */
export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
  options?: {
    /** 是否静默（不弹出错误提示） */
    silent?: boolean;
    /** 成功提示信息 */
    successMessage?: string;
  },
): Promise<T> {
  try {
    let result: unknown;

    if (isTauriEnvironment()) {
      // Tauri环境：使用真实IPC
      const { invoke } = await import('@tauri-apps/api/core');
      result = await invoke<T>(command, args);
    } else {
      // 浏览器环境：使用Mock
      result = await mockInvoke<T>(command, args);
    }

    if (options?.successMessage) {
      ElMessage.success(options.successMessage);
    }
    return result as T;
  } catch (error) {
    const message = typeof error === 'string' ? error : '操作失败，请稍后重试';
    if (!options?.silent) {
      ElMessage.error(message);
    }
    throw new Error(message);
  }
}