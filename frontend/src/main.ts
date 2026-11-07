import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 启动时恢复登录态（校验 HttpOnly Cookie 是否仍然有效）
const userStore = useUserStore()
userStore.hydrate().finally(() => {
  app.mount('#app')
})
