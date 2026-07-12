import { API_URL } from '~/constants/env'
import { request } from '~/utils/request'

export interface AppInfo {
  name: string
  version: string
  hash?: string
}

export interface InitData {
  username: string
  password: string
  name: string
  mail: string
  url: string
}

export interface DebugEventData {
  type: string
  payload: any
}

export interface PtyRecord {
  id: string
  data: any
}

export interface CreateOwnerData {
  username: string
  password: string
  name?: string
  mail: string
  url?: string
  avatar?: string
  introduce?: string
}

export const systemApi = {
  // 获取应用信息
  getAppInfo: () => request.get<AppInfo>('/'),

  /**
   * 检查系统是否已初始化。
   *
   * /init 的语义：200 = 未初始化，404 = 已初始化。
   * 但 ofetch 的全局 onResponseError 会对所有非 2xx 弹 toast，而这里的 404 是
   * 正常语义不该弹，所以先用原生 fetch 静默探测一次：
   *   - 404 → 已初始化，直接返回，不触发 toast
   *   - 非 404 → 交给 ofetch 正式请求，保留 502 toast、401 跳登录等错误处理
   *
   * 两次请求非原子，但后台低频单人调用，且最坏只是多弹一个 404 toast，无害。
   */
  checkInit: async (): Promise<{ isInit: boolean }> => {
    // 先静默探测——404 = 已初始化，不做任何 toast
    try {
      const probe = await fetch(`${API_URL}/init?t=${Date.now()}`, {
        credentials: 'include',
      })
      if (probe.status === 404) return { isInit: true }
    } catch {
      // 网络不通，交给下面的正式请求去报错
    }

    // 非 404 → 正常走 ofetch，保留全局拦截器的 toast / 401 处理
    try {
      return await request.get<{ isInit: boolean }>('/init')
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.status === 404) {
        return { isInit: true }
      }
      throw error
    }
  },

  // 初始化系统
  init: (data: InitData) => request.post<void>('/init', { data }),

  // 获取初始化默认配置
  getInitDefaultConfigs: () => request.get<any>('/init/configs/default'),

  // 更新初始化配置
  patchInitConfig: (key: string, data: any) =>
    request.patch<void>(`/init/configs/${key}`, { data }),

  // 从备份恢复
  restoreFromBackup: (formData: FormData, timeout?: number) =>
    request.post<void>('/init/restore', { data: formData, timeout }),

  // 创建站点主人
  createOwner: (data: CreateOwnerData) =>
    request.post<void>('/init/owner', { data }),

  // === Debug ===

  // 发送调试事件
  sendDebugEvent: (data: DebugEventData) =>
    request.post<void>('/debug/events', { data }),

  // 执行 Serverless 函数
  executeFunction: (data: { code: string; context?: any }) =>
    request.post<any>('/debug/function', { data }),

  // === PTY ===

  // 获取 PTY 记录
  getPtyRecords: () => request.get<PtyRecord[]>('/pty/record'),

  // === 内置函数 ===

  // 执行内置函数
  callBuiltInFunction: (name: string, params?: Record<string, any>) =>
    request.get<any>(`/fn/built-in/${name}`, { params }),

  // 获取函数类型定义
  getFnTypes: () => request.get<string>('/fn/types'),
}
