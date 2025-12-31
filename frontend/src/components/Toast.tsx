import { useState } from "react"
import { CheckCircle, AlertCircle, X } from "lucide-react"

export function Toast({ message }: { message: { type: "success" | "error"; text: string } | null }) {
  const [dismissed, setDismissed] = useState(false)

  if (!message || dismissed) return null

  // 截断过长的错误信息
  const displayText = message.type === "error" && message.text.length > 200
    ? message.text.substring(0, 200) + "..."
    : message.text

  return (
    <div className="toast-container">
      <div className={`toast toast-${message.type}`}>
        {message.type === "success" ? (
          <CheckCircle style={{ width: 18, height: 18, color: "var(--accent-moss)" }} />
        ) : (
          <AlertCircle style={{ width: 18, height: 18, color: "#dc6b6b" }} />
        )}
        <span style={{ fontSize: "0.8125rem", flex: 1 }}>{displayText}</span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2,
            display: "flex",
            marginLeft: 8
          }}
        >
          <X style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
        </button>
      </div>
    </div>
  )
}
