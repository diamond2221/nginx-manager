export function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="kbd">{children}</span>
}

export function KbdGroup({ keys }: { keys: React.ReactNode[] }) {
  return (
    <span className="kbd-group">
      {keys.map((key, i) => (
        <span key={i} className="kbd">{key}</span>
      ))}
    </span>
  )
}
