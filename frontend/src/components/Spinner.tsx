export function Spinner() {
  return <div style={{
    width: 14, height: 14, border: "2px solid var(--border-light)",
    borderTopColor: "var(--accent-moss)", borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  }} />
}
