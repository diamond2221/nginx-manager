import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Save, Zap, FileText, Settings, Keyboard, RefreshCw, AlignLeft } from "lucide-react"
import { api } from "@/lib/api"
import { formatNginxConfig } from "@/lib/nginx"
import CodeMirror from "@uiw/react-codemirror"
import { keymap } from "@codemirror/view"
import { createBaseExtensions, configureTheme, getThemeColors } from "@/lib/editor-theme"
import { Toast } from "@/components/Toast"
import { Spinner } from "@/components/Spinner"
import { Kbd, KbdGroup } from "@/components/Kbd"
import { Tooltip } from "@/components/Tooltip"
import { useTheme } from "@/hooks/useTheme"

const SHORTCUTS = [
  { key: ["⌘", "S"], desc: "Save config", action: "save" },
  { key: ["⌘", "⇧", "S"], desc: "Test config", action: "test" },
  { key: ["⌘", "Z"], desc: "Undo", action: "undo" },
  { key: ["⌘", "⇧", "Z"], desc: "Redo", action: "redo" },
  { key: ["⌘", "F"], desc: "Find in file", action: "find" },
  { key: ["⌘", "G"], desc: "Find next", action: "findNext" },
  { key: ["⌘", "⇧", "G"], desc: "Find previous", action: "findPrev" },
  { key: ["⌘", "/"], desc: "Toggle line comment", action: "comment" },
  { key: ["⌘", "⇧", "F"], desc: "Format document", action: "format" },
  { key: ["⌘", "]"], desc: "Indent line", action: "indent" },
  { key: ["⌘", "["], desc: "Outdent line", action: "outdent" },
  { key: ["Esc"], desc: "Close shortcuts", action: "close" },
]

export function MainConfig() {
  const { isDark } = useTheme()
  const [config, setConfig] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [shortcutsVisible, setShortcutsVisible] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [editorThemeId, setEditorThemeId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nginx-manager-editor-theme")
      return stored || "nord"
    }
    return "nord"
  })
  const editorRef = useRef<HTMLDivElement>(null)
  const configRef = useRef(config)
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get theme colors for inline styles
  const themeColors = getThemeColors(editorThemeId, isDark)

  // Handle editor theme change - force re-render by changing key
  const handleEditorThemeChange = useCallback((themeId: string) => {
    setEditorThemeId(themeId)
    localStorage.setItem("nginx-manager-editor-theme", themeId)
    // Force re-render of editor to apply new theme
    setEditorKey(prev => prev + 1)
  }, [])

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current)
    }
    setMessage({ type, text })
    messageTimerRef.current = setTimeout(() => setMessage(null), 3000)
  }, [])

  // Use ref to always have latest format function
  const handleFormatRef = useRef<() => void>(() => {})

  const handleFormat = useCallback(() => {
    const formatted = formatNginxConfig(configRef.current)
    setConfig(formatted)
    configRef.current = formatted
    setHasChanges(true)
    showMessage("success", "Config formatted")
  }, [showMessage])

  // Keep ref updated
  handleFormatRef.current = handleFormat

  // Create format keymap extension - use ref to avoid stale closure
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

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getConfig()
      setConfig(data.content)
      configRef.current = data.content
      setHasChanges(false)
    } catch (e) {
      showMessage("error", "Failed to load config")
    } finally {
      setLoading(false)
    }
  }, [showMessage])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.saveConfig(configRef.current)
      showMessage("success", "Config saved successfully")
      setHasChanges(false)
    } catch (e) {
      const error = e instanceof Error ? e.message : "Failed to save config"
      showMessage("error", error)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await api.testConfig()
      const output = (res as { output?: string }).output || "OK"
      showMessage("success", output.replace(/\n/g, " "))
    } catch (e) {
      showMessage("error", "Config test failed")
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      const isShift = e.shiftKey

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (isMod && e.key === "s" && !isShift) {
        e.preventDefault()
        if (hasChanges && !saving) handleSave()
      } else if (isMod && isShift && e.key === "S") {
        e.preventDefault()
        if (!testing) handleTest()
      } else if (isMod && isShift && (e.key === "f" || e.key === "F")) {
        e.preventDefault()
        handleFormat()
      } else if (e.key === "Escape") {
        setShortcutsVisible(false)
      } else if (isMod && e.key === "k" && isShift) {
        e.preventDefault()
        setShortcutsVisible(v => !v)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hasChanges, saving, testing, handleSave, handleTest, handleFormat, setShortcutsVisible])

  return (
    <div className="animate-fade-in page-flex-container">
      <Toast message={message} />

      <div className="page-header">
        <h1>
          <FileText style={{ width: 24, height: 24, color: "var(--accent)" }} />
          Main Configuration
        </h1>
        <p>Edit nginx.conf with syntax highlighting and real-time validation</p>
      </div>

      {/* Info panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
        <div className="info-panel info-panel-compact">
          <div className="info-header">
            <Settings style={{ width: 12, height: 12 }} />
            Configuration Info
          </div>
          <ul className="info-list">
            <li>File: <code>/etc/nginx/nginx.conf</code></li>
            <li>Status: <span style={{ color: hasChanges ? "var(--accent-amber)" : "var(--accent)" }}>{hasChanges ? "Unsaved changes" : "Saved"}</span></li>
          </ul>
        </div>

        <div className="info-panel info-panel-compact">
          <div className="info-header">
            <Zap style={{ width: 12, height: 12 }} />
            Quick Actions
          </div>
          <ul className="info-list">
            <li>Test: <code>nginx -t</code> (⌘⇧S)</li>
            <li>Format: <code>⌘⇧F</code></li>
          </ul>
        </div>
      </div>

      <div className="editor-wrapper">
        <div className="editor-header">
          <div className="editor-tabs">
            <div className="editor-tab active">
              <FileText style={{ width: 14, height: 14 }} />
              nginx.conf
            </div>
          </div>
          <div className="editor-actions">
            <div className="theme-select-wrapper">
              <select
                value={editorThemeId}
                onChange={(e) => handleEditorThemeChange(e.target.value)}
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
            <Tooltip content="从磁盘重新加载">
              <button
                onClick={loadConfig}
                disabled={loading}
                className="btn btn-ghost btn-sm"
              >
                {loading ? <Spinner /> : <RefreshCw style={{ width: 14, height: 14 }} />}
              </button>
            </Tooltip>
            <Tooltip content="格式化 (⌘⇧F)">
              <button
                onClick={handleFormat}
                className="btn btn-ghost btn-sm"
              >
                <AlignLeft style={{ width: 14, height: 14 }} />
              </button>
            </Tooltip>
            <Tooltip content="测试配置 (⌘⇧S)">
              <button
                onClick={handleTest}
                disabled={testing || saving}
                className="btn btn-ghost btn-sm"
              >
                {testing ? <Spinner /> : <Zap style={{ width: 14, height: 14 }} />}
              </button>
            </Tooltip>
            <div style={{ width: 1, height: 16, background: "var(--border-light)", margin: "0 var(--space-1)" }} />
            <Tooltip content="快捷键 (⌘⇧K)">
              <button
                onClick={() => setShortcutsVisible(!shortcutsVisible)}
                className={`btn btn-ghost btn-sm ${shortcutsVisible ? "active" : ""}`}
              >
                <Keyboard style={{ width: 14, height: 14 }} />
              </button>
            </Tooltip>
            <Tooltip content="保存配置 (⌘S)">
              <button
                id="save-main"
                onClick={handleSave}
                disabled={loading || !hasChanges || saving}
                className="btn btn-primary btn-sm"
              >
                {saving ? <Spinner /> : <Save style={{ width: 12, height: 12 }} />}
                保存
                <KbdGroup keys={["⌘", "S"]} />
              </button>
            </Tooltip>
          </div>
        </div>

        <div ref={editorRef} className="editor-content-area" style={{ "--syntax-keyword": themeColors.keyword, "--syntax-comment": themeColors.comment, "--syntax-string": themeColors.string, "--syntax-number": themeColors.number, "--syntax-variable": themeColors.variable, "--syntax-directive": themeColors.directive, "--syntax-operator": themeColors.operator } as React.CSSProperties}>
          <CodeMirror
            key={`editor-${editorKey}`}
            value={config}
            height="100%"
            extensions={extensions}
            onChange={(value) => {
              setConfig(value)
              configRef.current = value
              setHasChanges(true)
            }}
            style={{ fontSize: 13, height: "100%" }}
            className="cm-editor-container"
          />
        </div>
      </div>

      {shortcutsVisible && (
        <div className="shortcuts-panel">
          <div className="shortcuts-header">
            <Keyboard style={{ width: 14, height: 14 }} />
            Keyboard Shortcuts
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>
              Press <Kbd>Esc</Kbd> to close
            </span>
          </div>
          <div className="shortcuts-grid">
            {SHORTCUTS.map((shortcut, i) => (
              <div key={i} className="shortcut-item">
                <KbdGroup keys={shortcut.key} />
                <span className="shortcut-desc">{shortcut.desc}</span>
              </div>
            ))}
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
          padding: 6px 28px 6px 10px;
          font-size: 13px;
          cursor: pointer;
          min-width: 100px;
        }
        .theme-select:hover {
          background: var(--bg-hover);
        }
        .theme-select-wrapper::after {
          content: "▼";
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 8px;
          color: var(--text-muted);
          pointer-events: none;
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
