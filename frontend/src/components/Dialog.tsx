import { useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"

interface DialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning"
  onConfirm: () => void
  onCancel: () => void
}

export function Dialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onCancel()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="dialog-icon" style={{ background: variant === "danger" ? "var(--danger-subtle)" : "var(--accent-amber-subtle)" }}>
            <AlertTriangle style={{ width: 20, height: 20, color: variant === "danger" ? "var(--danger)" : "var(--accent-amber)" }} />
          </div>
          <button
            onClick={onCancel}
            className="dialog-close"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div className="dialog-body">
          <h3 className="dialog-title">{title}</h3>
          <p className="dialog-message">{message}</p>
        </div>

        <div className="dialog-footer">
          <button onClick={onCancel} className="btn btn-secondary">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${variant === "danger" ? "btn-danger" : "btn-warning"}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
