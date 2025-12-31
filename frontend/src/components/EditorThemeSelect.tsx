import { ChevronDown } from "lucide-react"
import { editorThemes, getEditorTheme } from "@/lib/editor-themes"
import { useTheme } from "@/hooks/useTheme"

interface EditorThemeSelectProps {
  currentThemeId: string
  onThemeChange: (themeId: string) => void
}

export function EditorThemeSelect({ currentThemeId, onThemeChange }: EditorThemeSelectProps) {
  const { isDark } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const currentTheme = getEditorTheme(currentThemeId)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border var(--border-subtle) rounded-md transition-colors"
        aria-label="选择编辑器主题"
      >
        <span>主题: {currentTheme.name}</span>
        <ChevronDown style={{ width: 14, height: 14 }} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-[var(--bg-primary)] border var(--border-light) rounded-lg shadow-lg overflow-hidden animate-fade-in">
            <div className="p-2 border-b border-[var(--border-subtle)]">
              <div className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wide">
                编辑器主题
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-1">
              {editorThemes.map((theme) => {
                const isActive = theme.id === currentThemeId
                const colors = isDark ? theme.dark : theme.light

                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onThemeChange(theme.id)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    {/* Color preview swatches */}
                    <div className="flex gap-0.5">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: colors.keyword }}
                        title="关键字"
                      />
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: colors.directive }}
                        title="指令"
                      />
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: colors.string }}
                        title="字符串"
                      />
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: colors.variable }}
                        title="变量"
                      />
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: colors.number }}
                        title="数字"
                      />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="font-medium">{theme.name}</div>
                      <div className="text-xs opacity-70">{theme.description}</div>
                    </div>

                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { useState } from "react"
