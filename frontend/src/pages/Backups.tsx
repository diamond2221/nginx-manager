import { useState, useEffect, useCallback, useRef } from "react"
import { Shield, Play, RefreshCw, Copy, Upload, Settings, Clock, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { Toast } from "@/components/Toast"
import { Spinner } from "@/components/Spinner"
import { Tooltip } from "@/components/Tooltip"
import { Dialog } from "@/components/Dialog"

type BackupFile = { name: string; size: number; created: string }

type ConfirmStep = "first" | "second" | null

export function Backups() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dialog state for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<ConfirmStep>(null)
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null)

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    // 清除之前的 timer
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current)
    }
    setMessage({ type, text })
    messageTimerRef.current = setTimeout(() => setMessage(null), 3000)
  }, [])

  const loadBackups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getBackups()
      setBackups(data.backups || [])
    } catch (e) {
      showMessage("error", "Failed to load backups")
    } finally {
      setLoading(false)
    }
  }, [showMessage])

  useEffect(() => { loadBackups() }, [loadBackups])

  const createBackup = async () => {
    setCreating(true)
    try {
      await api.createBackup()
      showMessage("success", "Backup created")
      loadBackups()
    } catch (e) {
      showMessage("error", "Failed to create backup")
    } finally {
      setCreating(false)
    }
  }

  const restoreBackup = async (name: string) => {
    if (!confirm(`Restore "${name}"?`)) return
    setLoading(true)
    try {
      await api.restoreBackup(name)
      showMessage("success", "Restored successfully")
    } catch (e) {
      showMessage("error", "Failed to restore")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showMessage("success", "Copied to clipboard")
    } catch {
      showMessage("error", "Failed to copy")
    }
  }

  const handleDeleteClick = (name: string) => {
    setBackupToDelete(name)
    setDeleteConfirmStep("first")
    setDeleteDialogOpen(true)
  }

  const handleFirstConfirm = () => {
    setDeleteConfirmStep("second")
  }

  const handleSecondConfirm = async () => {
    if (!backupToDelete) return
    setLoading(true)
    setDeleteDialogOpen(false)
    setDeleteConfirmStep(null)
    try {
      await api.deleteBackup(backupToDelete)
      showMessage("success", "Backup deleted")
      loadBackups()
    } catch (e) {
      showMessage("error", "Failed to delete")
    } finally {
      setLoading(false)
      setBackupToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setDeleteConfirmStep(null)
    setBackupToDelete(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="animate-fade-in">
      <Toast message={message} />

      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1>Backups</h1>
        <p style={{ marginTop: "var(--space-sm)" }}>Configuration snapshots</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-header">
          <div className="card-title">
            <Shield style={{ width: 12, height: 12 }} />
            Snapshots
          </div>
          <Tooltip content="创建新备份">
            <button
              onClick={createBackup}
              disabled={creating || loading}
              className="btn btn-primary btn-sm"
            >
              {creating ? <Spinner /> : <Play style={{ width: 12, height: 12 }} />}
              创建
            </button>
          </Tooltip>
        </div>

        <div className="card-content">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-lg)" }}>
            <Tooltip content="刷新备份列表">
              <button
                onClick={loadBackups}
                disabled={loading}
                className="btn btn-secondary btn-sm"
              >
                {loading ? <Spinner /> : <RefreshCw style={{ width: 12, height: 12 }} />}
                刷新
              </button>
            </Tooltip>
            <span style={{ fontSize: "12px", color: "var(--text-slate)" }}>
              {backups.length} backup{backups.length !== 1 ? "s" : ""}
            </span>
          </div>

          {backups.length === 0 ? (
            <div className="empty-state" style={{ height: "200px" }}>
              <Shield style={{ width: 32, height: 32 }} />
              <p>No backups yet</p>
            </div>
          ) : (
            <div>
              {backups.map((backup) => (
                <div key={backup.name} className="list-item" style={{ border: "var(--border-light)", borderRadius: "8px", marginBottom: "var(--space-sm)", alignItems: "flex-start" }}>
                  <div className="list-icon" style={{ background: "var(--accent-subtle)" }}>
                    <Shield style={{ width: 14, height: 14, color: "var(--accent)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: "var(--space-sm)" }}>
                    <div style={{ position: "relative", paddingRight: "28px" }}>
                      <div
                        className="list-name"
                        style={{
                          wordBreak: "break-all",
                          whiteSpace: "normal",
                          lineHeight: "1.5",
                          fontFamily: "ui-monospace, SFMono-Regular, Monaco, Consolas, monospace",
                          fontSize: "13px"
                        }}
                      >
                        {backup.name}
                      </div>
                      <Tooltip content="复制路径">
                        <button
                          onClick={() => copyToClipboard(backup.name)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "-4px",
                            padding: "4px",
                            height: "24px",
                            width: "24px",
                            minWidth: "24px"
                          }}
                        >
                          <Copy style={{ width: 12, height: 12 }} />
                        </button>
                      </Tooltip>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-lg)", marginTop: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock style={{ width: 10, height: 10 }} />
                        {formatDate(backup.created)}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{formatSize(backup.size)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-xs)", flexShrink: 0, paddingTop: "2px" }}>
                    <Tooltip content="恢复此备份">
                      <button
                        onClick={() => restoreBackup(backup.name)}
                        disabled={loading}
                        className="btn btn-secondary btn-sm"
                      >
                        <Upload style={{ width: 12, height: 12 }} />
                        恢复
                      </button>
                    </Tooltip>
                    <Tooltip content="删除此备份">
                      <button
                        onClick={() => handleDeleteClick(backup.name)}
                        disabled={loading}
                        className="btn btn-danger btn-sm"
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                        删除
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="info-panel info-panel-compact" style={{ marginTop: `14px`}}>
        <div className="info-title">
          <Settings style={{ width: 12, height: 12 }} />
          Information
        </div>
        <ul className="info-list">
          <li>Storage: <code>./backups/</code></li>
          <li>Format: <code>nginx_backup_YYYYMMDD.conf</code></li>
        </ul>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        title={deleteConfirmStep === "first" ? "删除备份" : "再次确认"}
        message={
          deleteConfirmStep === "first"
            ? `确定要删除备份 "${backupToDelete}" 吗？`
            : `删除后无法恢复，确定要继续删除 "${backupToDelete}" 吗？`
        }
        confirmText={deleteConfirmStep === "first" ? "继续" : "确认删除"}
        cancelText="取消"
        variant="danger"
        onConfirm={deleteConfirmStep === "first" ? handleFirstConfirm : handleSecondConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}
