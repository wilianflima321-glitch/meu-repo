'use client'

/**
 * MonacoAgentBadge — small neon pill injected next to file tabs or Explorer
 * tree items to show which AI agent has that file locked / in-progress.
 *
 * Usage:
 *   <MonacoAgentBadge kind="qa"  label="QA"  />   // cyan
 *   <MonacoAgentBadge kind="sys" label="SYS" />   // violet
 *   <MonacoAgentBadge kind="gen" label="GEN" />   // amber
 */

export type AgentBadgeKind = 'qa' | 'sys' | 'gen' | 'custom'

const KIND_STYLES: Record<AgentBadgeKind, { bg: string; border: string; text: string; glow: string }> = {
  qa: {
    bg: 'rgba(var(--aethel-neon-cyan-rgb), 0.10)',
    border: 'rgba(var(--aethel-neon-cyan-rgb), 0.32)',
    text: 'var(--aethel-neon-cyan)',
    glow: '0 0 8px rgba(var(--aethel-neon-cyan-rgb), 0.28)',
  },
  sys: {
    bg: 'rgba(var(--aethel-accent-rgb), 0.12)',
    border: 'rgba(var(--aethel-accent-rgb), 0.38)',
    text: 'var(--aethel-accent-light)',
    glow: '0 0 8px rgba(var(--aethel-accent-rgb), 0.28)',
  },
  gen: {
    bg: 'rgba(var(--aethel-warning-rgb), 0.10)',
    border: 'rgba(var(--aethel-warning-rgb), 0.30)',
    text: 'var(--aethel-neon-amber)',
    glow: '0 0 8px rgba(var(--aethel-warning-rgb), 0.22)',
  },
  custom: {
    bg: 'rgba(var(--aethel-neon-indigo-rgb), 0.10)',
    border: 'rgba(var(--aethel-neon-indigo-rgb), 0.30)',
    text: 'var(--aethel-neon-indigo)',
    glow: '0 0 8px rgba(var(--aethel-neon-indigo-rgb), 0.22)',
  },
}

export interface MonacoAgentBadgeProps {
  kind?: AgentBadgeKind
  label: string
  /** Show an animated pulse dot (indicates active locking) */
  pulse?: boolean
  /** Extra inline styles for positioning */
  style?: React.CSSProperties
  className?: string
}

export function MonacoAgentBadge({
  kind = 'custom',
  label,
  pulse = false,
  style,
  className,
}: MonacoAgentBadgeProps) {
  const s = KIND_STYLES[kind]

  return (
    <span
      role="status"
      aria-label={`Agent ${label} active`}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 5px',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        userSelect: 'none',
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        boxShadow: s.glow,
        // Notched corners via clip-path (top-right and bottom-left)
        clipPath: 'polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px)',
        ...style,
      }}
    >
      {pulse && (
        <span style={{ position: 'relative', display: 'inline-flex', width: 5, height: 5, flexShrink: 0 }}>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: s.text,
              opacity: 0.5,
              animation: 'agentBadgePing 1.2s cubic-bezier(0,0,0.2,1) infinite',
            }}
          />
          <span
            style={{
              position: 'relative',
              display: 'inline-flex',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: s.text,
            }}
          />
        </span>
      )}
      {label}
      <style>{`
        @keyframes agentBadgePing {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </span>
  )
}

// ─── Standalone DOM helper (for Monaco ContentWidget injection) ────────────────

/**
 * Creates a DOM element representing a MonacoAgentBadge without React.
 * Useful for injecting into Monaco's ContentWidget / ZoneWidget DOM.
 */
export function createMonacoAgentBadgeDOM(kind: AgentBadgeKind, label: string, pulse = false): HTMLElement {
  const s = KIND_STYLES[kind]
  const el = document.createElement('span')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-label', `Agent ${label} active`)
  el.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'gap:4px',
    'padding:1px 5px',
    'border-radius:4px',
    'font-family:monospace',
    'font-size:9px',
    'font-weight:700',
    'letter-spacing:0.16em',
    'text-transform:uppercase',
    'user-select:none',
    `background:${s.bg}`,
    `border:1px solid ${s.border}`,
    `color:${s.text}`,
    `box-shadow:${s.glow}`,
    'clip-path:polygon(4px 0%,100% 0%,100% calc(100% - 4px),calc(100% - 4px) 100%,0% 100%,0% 4px)',
    'cursor:default',
    'margin-left:4px',
    'vertical-align:middle',
  ].join(';')

  if (pulse) {
    const dot = document.createElement('span')
    dot.style.cssText = `position:relative;display:inline-flex;width:5px;height:5px;flex-shrink:0;`
    const ping = document.createElement('span')
    ping.style.cssText = `position:absolute;inset:0;border-radius:50%;background:${s.text};opacity:0.5;animation:agentBadgePing 1.2s cubic-bezier(0,0,0.2,1) infinite;`
    const solid = document.createElement('span')
    solid.style.cssText = `position:relative;display:inline-flex;width:5px;height:5px;border-radius:50%;background:${s.text};`
    dot.appendChild(ping)
    dot.appendChild(solid)
    el.appendChild(dot)
  }

  el.appendChild(document.createTextNode(label))
  return el
}
