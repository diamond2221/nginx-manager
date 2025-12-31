import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebug = (msg: string) => {
    console.log('[PWA Debug]', msg)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  useEffect(() => {
    // 检测 iOS 设备
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // 检查是否已安装
    const isStandalone = (window.matchMedia('(display-mode: standalone)').matches) ||
                        (window.navigator as any).standalone === true
    if (isStandalone) {
      addDebug('App is already installed (standalone mode)')
      setIsInstalled(true)
      return
    }

    // 检查是否在 HTTPS 环境或 localhost
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    if (!isSecure) {
      addDebug('PWA requires HTTPS or localhost')
      return
    }

    // 监听 beforeinstallprompt 事件
    const handler = (e: Event) => {
      addDebug('beforeinstallprompt event fired')
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setShowPrompt(true)
      addDebug('Install prompt available')
    }

    window.addEventListener('beforeinstallprompt', handler)

    // 监听 appinstalled 事件
    const installHandler = () => {
      addDebug('appinstalled event fired')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', installHandler)

    // 延迟检查是否有事件触发
    const checkTimer = setTimeout(() => {
      if (!deferredPrompt && !isInstalled) {
        addDebug('No beforeinstallprompt event after 5 seconds')
        addDebug('This might mean: 1) Already installed, 2) Not meeting criteria, 3) Browser doesn\'t support PWA')
        if (isIOSDevice) {
          addDebug('iOS detected: Use "Share" > "Add to Home Screen" to install')
        }
      }
    }, 5000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installHandler)
      clearTimeout(checkTimer)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      addDebug('No deferredPrompt available')
      return
    }

    addDebug('Showing install prompt')
    // 显示安装提示
    await deferredPrompt.prompt()

    // 等待用户响应
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      addDebug('User accepted install prompt')
    } else {
      addDebug('User dismissed install prompt')
    }

    // 清除 deferredPrompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    addDebug('User dismissed install banner')
    setShowPrompt(false)
    // 存储到 localStorage 避免频繁显示
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // 检查用户最近是否关闭过提示
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) {
        setShowPrompt(false)
        addDebug(`Install banner dismissed ${daysSinceDismissed.toFixed(1)} days ago`)
      }
    }
  }, [])

  // iOS 安装提示
  if (isIOS && !isInstalled && showPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <img src="/icon.svg" alt="⚡ Nginx Manager" className="w-12 h-12" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">安装应用</h3>
              <p className="text-xs text-zinc-400 mt-1">
                在 Safari 中点击分享按钮，然后选择"添加到主屏幕"
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 标准 PWA 安装提示
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4 flex items-start gap-3">
          <div className="flex-shrink-0">
            <img src="/icon.svg" alt="⚡ Nginx Manager" className="w-12 h-12" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">安装应用</h3>
            <p className="text-xs text-zinc-400 mt-1">
              将 Nginx Manager 安装到您的桌面，获得更好的使用体验
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
              >
                安装
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                暂不
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Debug info - 只在开发环境显示 */}
      {import.meta.env.DEV && debugInfo.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-80 z-40">
          <details className="text-xs bg-black/80 text-green-400 p-2 rounded cursor-pointer">
            <summary>PWA Debug ({debugInfo.length})</summary>
            <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {debugInfo.map((info, i) => (
                <li key={i}>{info}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </>
  )
}
