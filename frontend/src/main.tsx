import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

// Import the virtual module for service worker registration
import { registerSW } from 'virtual:pwa-register'

// Register Service Worker with update handling
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('发现新版本可用，点击确定重新加载页面以更新。')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('应用已准备好离线使用')
  },
  onRegistered(registration) {
    console.log('Service Worker 已注册', registration)

    // Check for updates every hour
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onRegisterError(error) {
    console.error('Service Worker 注册失败', error)
  }
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
