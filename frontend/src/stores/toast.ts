import { defineStore } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'

/**
 * Toast 通知 Store
 * —— 全局可用的轻量提示（用 Element Plus ElMessage 实现）
 */
export const useToastStore = defineStore('toast', () => {
  function success(msg: string) {
    ElMessage({ message: msg, type: 'success', showClose: true })
  }
  function warn(msg: string) {
    ElMessage({ message: msg, type: 'warning', showClose: true })
  }
  function error(msg: string) {
    ElMessage({ message: msg, type: 'error', showClose: true })
  }
  function info(msg: string) {
    ElMessage({ message: msg, type: 'info', showClose: true })
  }

  function confirm(title: string, msg: string) {
    return ElMessageBox.confirm(msg, title, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  }

  return { success, warn, error, info, confirm }
})
