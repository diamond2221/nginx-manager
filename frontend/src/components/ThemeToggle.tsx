import { Moon, Sun, Monitor } from "lucide-react"
import { Tooltip } from "./Tooltip"
import { useTheme } from "@/hooks/useTheme"

const themes = [
  { mode: "light" as const, icon: Sun, label: "浅色模式" },
  { mode: "dark" as const, icon: Moon, label: "深色模式" },
  { mode: "auto" as const, icon: Monitor, label: "跟随系统" },
]

export function ThemeToggle() {
  const { mode, toggleMode } = useTheme()

  const currentIndex = themes.findIndex((t) => t.mode === mode)
  const nextTheme = themes[(currentIndex + 1) % themes.length]
  const NextIcon = nextTheme.icon

  return (
    <Tooltip content={nextTheme.label}>
      <button
        onClick={toggleMode}
        className="btn btn-ghost btn-sm"
        aria-label={`切换到${nextTheme.label}`}
      >
        <NextIcon style={{ width: 18, height: 18 }} />
      </button>
    </Tooltip>
  )
}
