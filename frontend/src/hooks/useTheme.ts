import { useState, useEffect, useCallback } from "react"

export type ThemeMode = "light" | "dark" | "auto"

const THEME_STORAGE_KEY = "nginx-manager-theme"

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getEffectiveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") {
    return getSystemTheme()
  }
  return mode
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark")
    root.classList.remove("light")
  } else {
    root.setAttribute("data-theme", "light")
    root.classList.add("light")
  }
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "auto"
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return (stored === "light" || stored === "dark" || stored === "auto") ? stored : "auto"
  })

  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(() =>
    getEffectiveTheme(mode)
  )

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (mode !== "auto") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light"
      setEffectiveTheme(newTheme)
      applyTheme(newTheme)
    }

    // Safari doesn't support addEventListener on MediaQueryList
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [mode])

  // Apply theme whenever mode changes
  useEffect(() => {
    const theme = getEffectiveTheme(mode)
    setEffectiveTheme(theme)
    applyTheme(theme)
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  }, [mode])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
  }, [])

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      if (prev === "auto") return "light"
      if (prev === "light") return "dark"
      return "auto"
    })
  }, [])

  return {
    mode,
    effectiveTheme,
    setMode,
    toggleMode,
    isDark: effectiveTheme === "dark",
    isLight: effectiveTheme === "light",
  }
}
