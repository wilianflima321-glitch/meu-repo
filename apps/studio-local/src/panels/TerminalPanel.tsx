import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

import type { NativeIDEBackend } from '../ide/NativeIDEBackend'
import { openPanelWindow } from '../ide/panelWindows'

/**
 * Tarefa 2 (O Terminal Real) — a real xterm.js surface bound to the actual
 * OS shell process Rust spawns via `portable-pty` (`terminal_create` /
 * `terminal_write` / `terminal_close` in `desktop_commands.rs`), not a
 * simulated command runner. Keystrokes go straight to the PTY's stdin;
 * whatever the shell prints comes back byte-for-byte over the
 * `terminal_data_<id>` event and is fed to xterm.js's parser, so `npm
 * install` progress bars, `git status` colors, and interactive prompts all
 * render exactly like a real terminal because they are one.
 */
interface TerminalPanelProps {
  backend: NativeIDEBackend
}

export function TerminalPanel({ backend }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false
    let unlistenData: (() => void) | null = null
    let createdSessionId: string | null = null

    const terminal = new Terminal({
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      fontSize: 13,
      theme: {
        // xterm requires concrete CSS colors; resolve design tokens when available.
        background:
          getComputedStyle(document.documentElement).getPropertyValue('--aethel-surface-primary').trim() ||
          'rgb(11, 18, 32)',
        foreground:
          getComputedStyle(document.documentElement).getPropertyValue('--aethel-text-primary').trim() ||
          'rgb(214, 224, 245)',
      },
      cursorBlink: true,
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)
    fitAddon.fit()

    const resizeObserver = new ResizeObserver(() => fitAddon.fit())
    resizeObserver.observe(containerRef.current)

    async function bootstrap() {
      try {
        const session = await backend.terminal.create()
        if (disposed) return
        createdSessionId = session.id
        setSessionId(session.id)

        unlistenData = await backend.terminal.onData(session.id, (bytes) => {
          terminal.write(bytes)
        })

        terminal.onData((data) => {
          void backend.terminal.write(session.id, data)
        })

        terminal.onResize(({ rows, cols }) => {
          void backend.terminal.resize(session.id, rows, cols)
        })
        void backend.terminal.resize(session.id, terminal.rows, terminal.cols)
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : 'Failed to spawn the native terminal.')
        }
      }
    }

    void bootstrap()

    return () => {
      disposed = true
      resizeObserver.disconnect()
      unlistenData?.()
      if (createdSessionId) {
        void backend.terminal.close(createdSessionId)
      }
      terminal.dispose()
    }
  }, [backend])

  return (
    <div className="panel terminal-panel" style={{ display: 'flex', flexDirection: 'column', height: 280 }}>
      <div className="panel-heading">
        <span>Terminal (Human Native PTY)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong
            style={{
              color: sessionId ? 'var(--aethel-text-tertiary)' : 'var(--aethel-error-light)',
              fontSize: 11,
            }}
            title="Law #48: terminal_* IPC ACL refuses agent callers with AGENT_HOST_PTY_DENIED evidence"
          >
            {sessionId ? `${sessionId} · human-only · ACL` : error ?? 'connecting…'}
          </strong>
          <button type="button" onClick={() => void openPanelWindow('terminal')} title="Open this panel in its own window">
            Undock ↗
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          padding: 4,
          background: 'var(--aethel-surface-primary)',
        }}
      />
    </div>
  )
}
