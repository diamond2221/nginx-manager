import { useState, useCallback, useEffect } from "react"
import { NavLink } from "react-router-dom"
import { Terminal, Database, Shield, Activity, RefreshCw, Play, Square, Power } from "lucide-react"
import { api } from "@/lib/api"
import { Toast } from "@/components/Toast"
import { Spinner } from "@/components/Spinner"
import { Tooltip } from "@/components/Tooltip"
import { ThemeToggle } from "@/components/ThemeToggle"

const tabs = [
  { to: "/", icon: Terminal, label: "Config", end: true },
  { to: "/servers", icon: Database, label: "Servers" },
  { to: "/backups", icon: Shield, label: "Backups" },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const [reloading, setReloading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [nginxRunning, setNginxRunning] = useState<boolean | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  // 获取 Nginx 状态
  const fetchStatus = useCallback(async () => {
    try {
      const status = await api.getNginxStatus()
      setNginxRunning(status.running)
    } catch {
      setNginxRunning(false)
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  // 初始化时获取状态
  useEffect(() => {
    fetchStatus()
    // 每 5 秒刷新一次状态
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleReload = useCallback(async () => {
    if (reloading) return
    setReloading(true)
    try {
      await api.reloadConfig()
      showMessage("success", "Nginx reloaded successfully")
      await fetchStatus()
    } catch (e) {
      showMessage("error", "Failed to reload nginx")
    } finally {
      setReloading(false)
    }
  }, [reloading, showMessage, fetchStatus])

  const handleStart = useCallback(async () => {
    if (starting) return
    setStarting(true)
    try {
      await api.startNginx()
      showMessage("success", "Nginx started successfully")
      await fetchStatus()
    } catch (e) {
      showMessage("error", "Failed to start nginx")
    } finally {
      setStarting(false)
    }
  }, [starting, showMessage, fetchStatus])

  const handleStop = useCallback(async () => {
    if (stopping) return
    setStopping(true)
    try {
      await api.stopNginx()
      showMessage("success", "Nginx stopped successfully")
      await fetchStatus()
    } catch (e) {
      showMessage("error", "Failed to stop nginx")
    } finally {
      setStopping(false)
    }
  }, [stopping, showMessage, fetchStatus])

  // Global keyboard shortcut for reload (⌘R / Ctrl+R)
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     const isMod = e.metaKey || e.ctrlKey
  //     // Ignore if typing in input/textarea
  //     if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
  //       return
  //     }
  //     if (isMod && e.key === "r" && !e.shiftKey) {
  //       e.preventDefault()
  //       handleReload()
  //     }
  //   }
  //   window.addEventListener("keydown", handleKeyDown)
  //   return () => window.removeEventListener("keydown", handleKeyDown)
  // }, [handleReload])

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-root)" }}>
      <Toast message={message} />
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <img src="/icon.svg" alt="Nginx Manager" className="brand-icon" />
            <span className="brand-text">NGINX</span>
          </div>

          <nav className="nav-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }: { isActive: boolean }) =>
                    `nav-tab ${isActive ? "active" : ""}`
                  }
                >
                  <Icon style={{ width: 16, height: 16 }} />
                  {tab.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="header-actions">
            <ThemeToggle />
            {/* 根据状态显示启动/停止按钮 */}
            {loadingStatus ? (
              <div className="btn btn-ghost btn-sm">
                <Spinner />
              </div>
            ) : nginxRunning ? (
              <>
                <Tooltip content="停止 Nginx">
                  <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="btn btn-ghost btn-sm"
                  >
                    {stopping ? <Spinner /> : <Power style={{ width: 18, height: 18 }} />}
                  </button>
                </Tooltip>
                <Tooltip content="重载配置 (⌘R)">
                  <button
                    onClick={handleReload}
                    disabled={reloading}
                    className="btn btn-ghost btn-sm"
                  >
                    {reloading ? <Spinner /> : <RefreshCw style={{ width: 18, height: 18 }} className={reloading ? "spin" : ""} />}
                  </button>
                </Tooltip>
                <Tooltip content="Nginx 运行中">
                  <div className="status-badge status-online">
                    <Activity style={{ width: 16, height: 16 }} />
                    在线
                  </div>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip content="启动 Nginx">
                  <button
                    onClick={handleStart}
                    disabled={starting}
                    className="btn btn-ghost btn-sm"
                  >
                    {starting ? <Spinner /> : <Play style={{ width: 18, height: 18 }} />}
                  </button>
                </Tooltip>
                <Tooltip content="Nginx 已停止">
                  <div className="status-badge status-offline">
                    <Square style={{ width: 16, height: 16 }} />
                    离线
                  </div>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}
