'use client'

// @aethel-heavy-async-boundary
import { AnimatePresence, motion } from 'framer-motion'

interface ViewportDropGhostProps {
  /** Whether a drag is currently in progress over the viewport */
  active: boolean
  /** Screen-space X of the cursor */
  cursorX?: number
  /** Screen-space Y of the cursor */
  cursorY?: number
  /** Label shown inside the ghost (e.g. filename) */
  label?: string
}

/**
 * Semi-transparent holographic drop ghost that follows the cursor
 * when an asset is dragged over the 3D viewport.
 * Shows where the object will be spawned on the ground plane.
 */
export function ViewportDropGhost({
  active,
  cursorX = 0,
  cursorY = 0,
  label,
}: ViewportDropGhostProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="drop-ghost"
          className="pointer-events-none fixed z-30"
          style={{ left: cursorX - 40, top: cursorY - 40 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.15 }}
          aria-hidden
        >
          {/* Outer ring — hologram cyan */}
          <svg width={80} height={80} viewBox="0 0 80 80" fill="none" aria-hidden>
            {/* Animated outer ring */}
            <circle
              cx={40} cy={40} r={36}
              stroke="var(--aethel-neon-cyan)"
              strokeWidth={1.5}
              strokeDasharray="12 6"
              style={{ animation: 'spin 3s linear infinite' }}
              opacity={0.7}
            />
            {/* Inner solid ring */}
            <circle cx={40} cy={40} r={22} stroke="var(--aethel-neon-cyan)" strokeWidth={1} opacity={0.4} />
            {/* Centre cross */}
            <line x1={40} y1={28} x2={40} y2={52} stroke="var(--aethel-neon-cyan)" strokeWidth={1} opacity={0.6} />
            <line x1={28} y1={40} x2={52} y2={40} stroke="var(--aethel-neon-cyan)" strokeWidth={1} opacity={0.6} />
            {/* Corner ticks */}
            {[[6,6],[74,6],[6,74],[74,74]].map(([tx,ty], i) => (
              <circle key={i} cx={tx} cy={ty} r={2} fill="var(--aethel-neon-cyan)" opacity={0.5} />
            ))}
            {/* Radial fill */}
            <circle cx={40} cy={40} r={22} fill="var(--aethel-neon-cyan)" fillOpacity={0.04} />
          </svg>

          {/* Label below the ghost */}
          {label && (
            <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_28%,transparent)] bg-[rgba(2,6,23,0.85)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-neon-cyan)] [backdrop-filter:blur(8px)]">
              {label}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
