import { useState, useRef, useCallback } from "react"

interface TooltipProps {
  content: string
  children: React.ReactElement
  side?: "top" | "bottom" | "left" | "right"
  delay?: number
}

export function Tooltip({ content, children, side = "bottom", delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [adjustedSide, setAdjustedSide] = useState<"top" | "bottom" | "left" | "right">(side)

  const calculatePosition = useCallback((targetRect: DOMRect, preferredSide: "top" | "bottom" | "left" | "right") => {
    const tooltipWidth = 120 // 估算宽度
    const tooltipHeight = 32 // 估算高度
    const padding = 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let finalSide: "top" | "bottom" | "left" | "right" = preferredSide
    let top = 0
    let left = 0

    // 根据首选项计算位置
    switch (preferredSide) {
      case "top":
        top = targetRect.top - padding - tooltipHeight
        left = targetRect.left + targetRect.width / 2
        break
      case "bottom":
        top = targetRect.bottom + padding
        left = targetRect.left + targetRect.width / 2
        break
      case "left":
        top = targetRect.top + targetRect.height / 2
        left = targetRect.left - padding - tooltipWidth
        break
      case "right":
        top = targetRect.top + targetRect.height / 2
        left = targetRect.right + padding
        break
    }

    // 检测边界并调整方向
    if (preferredSide === "top" && top < 0) {
      finalSide = "bottom"
      top = targetRect.bottom + padding
    } else if (preferredSide === "bottom" && top + tooltipHeight > viewportHeight) {
      finalSide = "top"
      top = targetRect.top - padding - tooltipHeight
    } else if (preferredSide === "left" && left < 0) {
      finalSide = "right"
      left = targetRect.right + padding
    } else if (preferredSide === "right" && left + tooltipWidth > viewportWidth) {
      finalSide = "left"
      left = targetRect.left - padding - tooltipWidth
    }

    // 水平方向边界检查（针对 top/bottom）
    if (finalSide === "top" || finalSide === "bottom") {
      const halfWidth = tooltipWidth / 2
      if (left - halfWidth < 0) {
        left = halfWidth + padding
      } else if (left + halfWidth > viewportWidth) {
        left = viewportWidth - halfWidth - padding
      }
    }

    // 垂直方向边界检查（针对 left/right）
    if (finalSide === "left" || finalSide === "right") {
      const halfHeight = tooltipHeight / 2
      if (top - halfHeight < 0) {
        top = halfHeight + padding
      } else if (top + halfHeight > viewportHeight) {
        top = viewportHeight - halfHeight - padding
      }
    }

    return { top, left, finalSide }
  }, [])

  const handleMouseEnter = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const rect = target.getBoundingClientRect()
    const { top, left, finalSide } = calculatePosition(rect, side)

    setPosition({ top, left })
    setAdjustedSide(finalSide)

    timeoutRef.current = setTimeout(() => {
      setVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setVisible(false)
  }

  const getTransform = () => {
    switch (adjustedSide) {
      case "top":
        return "translate(-50%, -100%)"
      case "bottom":
        return "translate(-50%, 0)"
      case "left":
        return "translate(-100%, -50%)"
      case "right":
        return "translate(0, -50%)"
    }
  }

  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: "relative", display: "inline-flex" }}
    >
      {children}
      {visible && (
        <span
          className="tooltip"
          style={{
            position: "fixed",
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: getTransform(),
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          {content}
          <style>{`
            .tooltip {
              background: var(--bg-tooltip, #1a1a1a);
              color: var(--text-tooltip, #ffffff);
              padding: 6px 10px;
              border-radius: 6px;
              font-size: 12px;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
              animation: tooltip-fade-in 0.15s ease-out;
              font-weight: 400;
            }
            @keyframes tooltip-fade-in {
              from {
                opacity: 0;
                transform: ${getTransform()} translateY(4px);
              }
              to {
                opacity: 1;
                transform: ${getTransform()} translateY(0);
              }
            }
          `}</style>
        </span>
      )}
    </span>
  )
}
