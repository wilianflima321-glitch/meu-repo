'use client'

const cubeFaces = [
  { name: 'front', transform: 'translateZ(38px)' },
  { name: 'back', transform: 'rotateY(180deg) translateZ(38px)' },
  { name: 'right', transform: 'rotateY(90deg) translateZ(38px)' },
  { name: 'left', transform: 'rotateY(-90deg) translateZ(38px)' },
  { name: 'top', transform: 'rotateX(90deg) translateZ(38px)' },
  { name: 'bottom', transform: 'rotateX(-90deg) translateZ(38px)' },
]

export default function SimpleMini3DPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.22),transparent_32%),linear-gradient(180deg,var(--aethel-surface-primary),var(--aethel-surface-secondary))]">
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(15,23,42,0.86),transparent)]" />
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 [perspective:580px]">
        <div className="relative h-full w-full animate-[spin_9s_linear_infinite] [transform-style:preserve-3d]">
          {cubeFaces.map((face) => (
            <div
              key={face.name}
              className="absolute inset-7 rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_38%,transparent)] bg-[linear-gradient(135deg,rgba(59,130,246,0.34),rgba(20,184,166,0.12))] shadow-[0_0_28px_rgba(59,130,246,0.18)]"
              style={{ transform: face.transform }}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-2 left-2 text-xs text-[var(--aethel-text-quaternary)] pointer-events-none">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_80%,transparent)] animate-pulse" />
          Preview Active
        </div>
      </div>

      <div className="absolute top-2 right-2 text-xs text-[var(--aethel-text-quaternary)] pointer-events-none">
        Lightweight CSS preview
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotateX(-18deg) rotateY(0deg);
          }
          to {
            transform: rotateX(-18deg) rotateY(360deg);
          }
        }
      `}</style>
    </div>
  )
}
