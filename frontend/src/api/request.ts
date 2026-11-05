import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建 axios 实例 —— 统一配置 + 拦截器
const request = axios.create({
  baseURL: '/api/v1',       // 开发期经 Vite proxy 到 FastAPI；生产经 Nginx 同域反代
  timeout: 10000,
  withCredentials: true,    // 关键：Cookie 会话（PRD FR-4.3）
})

// —— 响应拦截器：统一错误处理 ——
request.interceptors.response.use(
  (res) => {
    // FastAPI 返回统一格式 { code: 0, message: "...", data: ... }
    const body = res.data
    if (body && typeof body.code === 'number' && body.code !== 0) {
      // 业务错误（后端 code != 0）
      ElMessage.error(body.message || '请求失败')
      return Promise.reject(new Error(body.message))
    }
    return body
  },
  (err) => {
    // HTTP 层错误
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message
    if (status === 401) {
      ElMessage.warning('登录已过期，请重新登录')
      // TODO: 触发 Pinia user store 登出 + 弹登录面板
    } else {
      ElMessage.error(msg || '网络异常')
    }
    return Promise.reject(err)
  },
)

export default request
