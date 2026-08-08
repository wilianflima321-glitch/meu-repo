import { Terminal, ShieldAlert } from 'lucide-react'

/**
 * Former "Telepathic Architect Drone" was pure theater: fabricated CoVe logs,
 * fake shader recompile timings, PT-BR copy, and fake "0 placeholders" claims.
 * Replaced with fail-closed honesty — Law #48 agents never get host PTY;
 * creative Fusion lives on the web IDE after J.1/J.2 (desktop intent lane HELD).
 */
export function TelepathicArchitectDronePanel() {
  return (
    <div className="flex flex-col h-full p-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] text-[var(--aethel-text-primary)]">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--aethel-border-secondary)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-[var(--aethel-warning)]" />
          <h2 className="text-sm font-bold tracking-wide">Agent Intent Lane</h2>
        </div>
        <span className="text-[10px] px-2 py-1 rounded font-mono font-semibold text-[var(--aethel-warning)] border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]">
          HELD
        </span>
      </div>

      <div className="flex-1 mt-3 space-y-3 text-xs text-[var(--aethel-text-secondary)]">
        <p className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-[var(--aethel-warning)] mt-0.5" />
          <span>
            No telepathic drone, CoVe auditor, or live shader recompile is wired on this desktop shell.
            Prior UI fabricated success logs — that theater is removed.
          </span>
        </p>
        <ul className="list-disc pl-5 space-y-1.5 font-mono text-[11px] text-[var(--aethel-text-tertiary)]">
          <li>Human native PTY: Terminal panel (project-root confined)</li>
          <li>Agent tools: sandbox only after L.1 — never host PTY (Law #48)</li>
          <li>Creative Fusion / Nexus intent: web IDE after J.1 + J.2 (desktop lane HELD)</li>
          <li>AI-native IDE marketing: blocked until J.1 + J.2 + J.12</li>
        </ul>
      </div>
    </div>
  )
}
