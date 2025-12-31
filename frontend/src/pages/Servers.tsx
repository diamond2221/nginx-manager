import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { FileText, Save, RefreshCw, Database, Settings, AlignLeft, Plus, Trash2, Edit3, X, Check } from "lucide-react"
import { api } from "@/lib/api"
import { formatNginxConfig } from "@/lib/nginx"
import CodeMirror from "@uiw/react-codemirror"
import { keymap } from "@codemirror/view"
import { createBaseExtensions, configureTheme, getThemeColors } from "@/lib/editor-theme"
import { Toast } from "@/components/Toast"
import { Spinner } from "@/components/Spinner"
import { Kbd } from "@/components/Kbd"
import { Tooltip } from "@/components/Tooltip"
import { useTheme } from "@/hooks/useTheme"

type ServerFile = { name: string; path: string; updated: number }

export function Servers() {
  const { isDark } = useTheme()
  const [editorKey, setEditorKey] = useState(0)
  const [editorThemeId, setEditorThemeId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nginx-manager-editor-theme") || "nord"
    }
    return "nord"
  })
  const [servers, setServers] = useState<ServerFile[]>([])
  const [filteredServers, setFilteredServers] = useState<ServerFile[]>([])
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // 创建/重命名/删除相关状态
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createFileName, setCreateFileName] = useState("")
  const [creating, setCreating] = useState(false)
  const [renamingServer, setRenamingServer] = useState<string | null>(null)
  const [renameFileName, setRenameFileName] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [deletingServer, setDeletingServer] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const editorRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef("") // 用 ref 保存最新内容
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get theme colors for inline styles
  const themeColors = getThemeColors(editorThemeId, isDark)

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    // 清除之前的 timer
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current)
    }
    setMessage({ type, text })
    messageTimerRef.current = setTimeout(() => setMessage(null), 3000)
  }, [])

  // Format handler with ref for keymap
  const handleFormatRef = useRef<() => void>(() => {})

  const handleFormat = useCallback(() => {
    if (!selectedServer) return
    const formatted = formatNginxConfig(contentRef.current)
    setContent(formatted)
    contentRef.current = formatted
    setHasChanges(true)
    showMessage("success", "Config formatted")
  }, [selectedServer, showMessage])

  handleFormatRef.current = handleFormat

  // Create format keymap extension
  const formatKeymap = useMemo(() => keymap.of([
    {
      key: "Mod-Shift-f",
      run: () => {
        handleFormatRef.current()
        return true
      },
    },
  ]), [])

  // Get extensions for current theme
  const extensions = useMemo(() => [
    ...createBaseExtensions(),
    configureTheme(editorThemeId, isDark),
    formatKeymap,
  ], [editorThemeId, isDark, formatKeymap])

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const loadServers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getServers()
      // 按更新时间排序（从近到远）
      const sorted = data.servers.sort((a, b) => b.updated - a.updated)
      setServers(sorted)
      setFilteredServers(sorted)
    } catch (e) {
      showMessage("error", "Failed to load servers")
    } finally {
      setLoading(false)
    }
  }, [showMessage])

  useEffect(() => { loadServers() }, [loadServers])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = servers.filter(s =>
        s.name.toLowerCase().includes(query) || s.path.toLowerCase().includes(query)
      )
      // 保持排序
      setFilteredServers(filtered.sort((a, b) => b.updated - a.updated))
    } else {
      setFilteredServers(servers)
    }
  }, [searchQuery, servers])

  const selectServer = useCallback(async (name: string) => {
    setLoading(true)
    try {
      const data = await api.getServer(name)
      setContent(data.content)
      contentRef.current = data.content
      setSelectedServer(name)
      setHasChanges(false)
    } catch (e) {
      showMessage("error", "Failed to load server")
    } finally {
      setLoading(false)
    }
  }, [showMessage])

  const handleSave = async () => {
    if (!selectedServer) return
    setSaving(true)
    try {
      await api.saveServer(selectedServer, contentRef.current)
      showMessage("success", "Saved and reloaded successfully")
      setHasChanges(false)
    } catch (e) {
      const error = e instanceof Error ? e.message : "Failed to save"
      showMessage("error", error)
    } finally {
      setSaving(false)
    }
  }

  // 创建新站点
  const handleCreate = async () => {
    const name = createFileName.trim()
    if (!name) {
      showMessage("error", "请输入文件名")
      return
    }
    setCreating(true)
    try {
      const result = await api.createServer(name)
      showMessage("success", `已创建 ${result.name}`)
      setCreateFileName("")
      setShowCreateDialog(false)
      await loadServers()
      // 自动选中新创建的文件
      setSelectedServer(result.name || null)
      setContent("")
      contentRef.current = ""
      setHasChanges(false)
    } catch (e) {
      const error = e instanceof Error ? e.message : "Failed to create"
      showMessage("error", error)
    } finally {
      setCreating(false)
    }
  }

  // 重命名站点
  const handleRename = async (oldName: string) => {
    const newName = renameFileName.trim()
    if (!newName) {
      showMessage("error", "请输入新文件名")
      return
    }
    setRenaming(true)
    try {
      const result = await api.renameServer(oldName, newName)
      showMessage("success", `已重命名为 ${result.newName}`)
      setRenamingServer(null)
      setRenameFileName("")
      await loadServers()
      // 更新选中状态
      if (selectedServer === oldName) {
        setSelectedServer(result.newName || null)
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : "Failed to rename"
      showMessage("error", error)
    } finally {
      setRenaming(false)
    }
  }

  // 删除站点
  const handleDelete = async (name: string) => {
    setDeleting(true)
    try {
      await api.deleteServer(name)
      showMessage("success", `已删除 ${name}`)
      setDeletingServer(null)
      await loadServers()
      // 如果删除的是当前选中的文件，清空选中状态
      if (selectedServer === name) {
        setSelectedServer(null)
        setContent("")
        contentRef.current = ""
        setHasChanges(false)
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : "Failed to delete"
      showMessage("error", error)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key === "s") {
        e.preventDefault()
        if (selectedServer && hasChanges && !saving) handleSave()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedServer, hasChanges, saving])

  return (
    <div className="animate-fade-in page-flex-container">
      <Toast message={message} />

      <div className="page-header">
        <h1>
          <Database style={{ width: 24, height: 24, color: "var(--accent)" }} />
          Servers
        </h1>
        <p>Server block configurations</p>
      </div>

      {/* Info panel */}
      <div className="info-panel info-panel-compact" style={{ marginBottom: "var(--space-3)", marginTop: 0 }}>
        <div className="info-title">
          <Settings style={{ width: 12, height: 12 }} />
          Information
        </div>
        <ul className="info-list">
          <li>Location: <code>/etc/nginx/sites-available/</code></li>
          <li>Symlinks in <code>sites-enabled/</code> are active</li>
        </ul>
      </div>

      <div className="main-grid" style={{ flex: 1, minHeight: 0 }}>
        <aside className="card" style={{ padding: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <Database style={{ width: 12, height: 12 }} />
              Files
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
              <Tooltip content="创建新站点">
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "4px 8px" }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                </button>
              </Tooltip>
              <Tooltip content="刷新服务器列表">
                <button
                  onClick={loadServers}
                  disabled={loading}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "4px 8px" }}
                >
                  <RefreshCw style={{ width: 14, height: 14 }} />
                </button>
              </Tooltip>
              <span className="badge badge-info">{filteredServers.length}</span>
            </div>
          </div>

          <div style={{ padding: "var(--space-md)", borderBottom: "var(--border-light)" }}>
            <input
              type="text"
              placeholder="Search files..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="server-list">
            {filteredServers.length === 0 ? (
              <div style={{ padding: "var(--space-xl)", textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                  {searchQuery ? "No matches found" : "No server files"}
                </p>
              </div>
            ) : (
              filteredServers.map((s) => (
                <div
                  key={s.name}
                  className={`list-item ${selectedServer === s.name ? "active" : ""}`}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, cursor: "pointer", gap: "8px" }}
                    onClick={() => selectServer(s.name)}
                  >
                    <div className="list-icon" style={{fontSize: '14px'}}>{ s.name[0] }</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renamingServer === s.name ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <input
                            type="text"
                            defaultValue={s.name}
                            autoFocus
                            onFocus={(e) => {
                              const val = e.target.value
                              e.target.value = ""
                              e.target.value = val
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRename(s.name)
                              } else if (e.key === "Escape") {
                                setRenamingServer(null)
                                setRenameFileName("")
                              }
                            }}
                            onChange={(e) => setRenameFileName(e.target.value)}
                            className="search-input"
                            style={{ padding: "2px 6px", fontSize: "12px", height: "24px" }}
                          />
                          <button
                            onClick={() => handleRename(s.name)}
                            disabled={renaming}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "2px 6px" }}
                          >
                            <Check style={{ width: 12, height: 12 }} />
                          </button>
                          <button
                            onClick={() => {
                              setRenamingServer(null)
                              setRenameFileName("")
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "2px 6px" }}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="list-name">{s.name}</div>
                          <div className="list-path">{s.path}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "2px" }}>
                            {formatTime(s.updated)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {renamingServer !== s.name && (
                    <div style={{ display: "flex", gap: "2px", marginLeft: "4px" }}>
                      <Tooltip content="重命名">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenamingServer(s.name)
                            setRenameFileName(s.name.replace(".conf", ""))
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: "4px 6px" }}
                        >
                          <Edit3 style={{ width: 12, height: 12 }} />
                        </button>
                      </Tooltip>
                      <Tooltip content="删除">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingServer(s.name)
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: "4px 6px", color: "var(--color-error)" }}
                        >
                          <Trash2 style={{ width: 12, height: 12 }} />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="editor-wrapper">
          <div className="editor-header">
            <div className="editor-tabs">
              <div className="editor-tab active">
                <Database style={{ width: 12, height: 12 }} />
                {selectedServer || "Select a file"}
              </div>
            </div>
            <div className="editor-actions">
              <div className="theme-select-wrapper">
                <select
                  value={editorThemeId}
                  onChange={(e) => {
                    const newTheme = e.target.value
                    localStorage.setItem("nginx-manager-editor-theme", newTheme)
                    setEditorThemeId(newTheme)
                    setEditorKey(prev => prev + 1)
                  }}
                  className="theme-select"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                    borderColor: "var(--border-subtle)"
                  }}
                >
                  <option value="nord">Nord</option>
                  <option value="dracula">Dracula</option>
                  <option value="github">GitHub</option>
                  <option value="monokai">Monokai</option>
                  <option value="one-dark">One Dark</option>
                  <option value="solarized">Solarized</option>
                  <option value="vscode">VSCode</option>
                </select>
              </div>
              <Tooltip content="格式化 (⌘⇧F)">
                <button
                  onClick={handleFormat}
                  disabled={!selectedServer}
                  className="btn btn-ghost btn-sm"
                >
                  <AlignLeft style={{ width: 14, height: 14 }} />
                </button>
              </Tooltip>
              <div style={{ width: 1, height: 16, background: "var(--border-light)", margin: "0 var(--space-xs)" }} />
              <Tooltip content="保存服务器配置 (⌘S)">
                <button
                  id="save-server"
                  onClick={handleSave}
                  disabled={!selectedServer || !hasChanges || saving}
                  className="btn btn-primary btn-sm"
                >
                  {saving ? <Spinner /> : <Save style={{ width: 12, height: 12 }} />}
                  保存
                  <Kbd>CmdS</Kbd>
                </button>
              </Tooltip>
            </div>
          </div>

          {selectedServer ? (
            <div ref={editorRef} className="editor-content-area" style={{ "--syntax-keyword": themeColors.keyword, "--syntax-comment": themeColors.comment, "--syntax-string": themeColors.string, "--syntax-number": themeColors.number, "--syntax-variable": themeColors.variable, "--syntax-directive": themeColors.directive, "--syntax-operator": themeColors.operator } as React.CSSProperties}>
              <CodeMirror
                key={`editor-${editorKey}`}
                value={content}
                height="100%"
                extensions={extensions}
                onChange={(value) => { setContent(value); contentRef.current = value; setHasChanges(true); }}
                style={{ fontSize: "13px", height: "100%" }}
              />
            </div>
          ) : (
            <div className="empty-state editor-content-area">
              <FileText style={{ width: 32, height: 32 }} />
              <p>Select a file to edit</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建对话框 */}
      {showCreateDialog && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateDialog(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ minWidth: "320px", maxWidth: "400px" }}
          >
            <div className="card-header">
              <div className="card-title">创建新站点</div>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px 8px" }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: "var(--space-md)" }}>
              <div style={{ marginBottom: "var(--space-md)" }}>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>
                  文件名
                </label>
                <input
                  type="text"
                  value={createFileName}
                  onChange={(e) => setCreateFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreate()
                    } else if (e.key === "Escape") {
                      setShowCreateDialog(false)
                      setCreateFileName("")
                    }
                  }}
                  placeholder="例如: my-site.conf"
                  className="search-input"
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setShowCreateDialog(false)
                    setCreateFileName("")
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !createFileName.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {creating ? <Spinner /> : <Plus style={{ width: 12, height: 12 }} />}
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {deletingServer && (
        <div
          className="modal-overlay"
          onClick={() => setDeletingServer(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ minWidth: "320px", maxWidth: "400px" }}
          >
            <div className="card-header">
              <div className="card-title">确认删除</div>
              <button
                onClick={() => setDeletingServer(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px 8px" }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: "var(--space-md)" }}>
              <p style={{ fontSize: "14px", marginBottom: "var(--space-md)" }}>
                确定要删除 <code style={{ background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px" }}>{deletingServer}</code> 吗？
                <br />
                <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>删除前会自动创建备份。</span>
              </p>
              <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setDeletingServer(null)}
                  className="btn btn-ghost btn-sm"
                  disabled={deleting}
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(deletingServer)}
                  disabled={deleting}
                  className="btn btn-danger btn-sm"
                  style={{ background: "var(--color-error)", color: "white" }}
                >
                  {deleting ? <Spinner /> : <Trash2 style={{ width: 12, height: 12 }} />}
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .theme-select-wrapper {
          position: relative;
        }
        .theme-select {
          appearance: none;
          border: var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 4px 24px 4px 8px;
          font-size: 12px;
          cursor: pointer;
          min-width: 80px;
        }
        .theme-select:hover {
          background: var(--bg-hover);
        }
        .theme-select-wrapper::after {
          content: "▼";
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 6px;
          color: var(--text-muted);
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
