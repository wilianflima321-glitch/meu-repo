import { Film } from 'lucide-react'

/**
 * Former Cinema Compositor claimed ProRes 4444, fake FPS/buffer, fabricated
 * storyboard tracks, and alert() "Zero-Loss Master" export — all unwired theater.
 * Desktop timeline authoring lives on the web Sequencer / Timeline3D path;
 * this shell surfaces honesty only until a real native timeline IPC exists.
 */
export function CinemaCompositorTimelinePanel() {
  return (
    <div className="flex flex-col h-full p-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] text-[var(--aethel-text-primary)]">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--aethel-border-secondary)]">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-[var(--aethel-primary-light)]" />
          <h2 className="text-sm font-bold tracking-wide">Cinema Timeline</h2>
        </div>
        <span className="text-[10px] px-2 py-1 rounded font-mono font-semibold text-[var(--aethel-warning)] border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]">
          HELD — NO NATIVE EXPORT
        </span>
      </div>

      <div className="flex-1 mt-3 space-y-3 text-xs text-[var(--aethel-text-secondary)]">
        <p>
          Desktop cinema compositor UI previously advertised ProRes / OpenEXR masters, live FPS,
          and multi-track storyboards with no export worker or timeline IPC. Those claims are removed.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 font-mono text-[11px] text-[var(--aethel-text-tertiary)]">
          <li>Ship path today: web Timeline3D + Sequencer (authoring PARTIAL)</li>
          <li>UE Sequencer parity / curve editor / clip trim: OPEN</li>
          <li>Zero-loss ProRes / EXR master export: HELD (no cooker wire)</li>
          <li>Fabricated tracks / fake 82.4 FPS / alert() export: deleted</li>
        </ul>
      </div>
    </div>
  )
}
