import { invoke } from '@tauri-apps/api/core'
import { useEffect, useMemo } from 'react'

import { NativeIDEBackend } from './ide/NativeIDEBackend'
import { HardwareProfilerPanel } from './panels/HardwareProfilerPanel'
import { ScenePanel } from './panels/ScenePanel'
import { TerminalPanel } from './panels/TerminalPanel'

/**
 * Missão Suprema 1 (Multi-Monitor & Undocking): rendered instead of the full
 * `StudioLocalApp` shell whenever this window was spawned by
 * `open_panel_window` (Rust opens `index.html?panel=<id>`, see `main.tsx`).
 * Stays in sync with the main window for free — both are just independent
 * subscribers to the same global Tauri events.
 */
export function UndockedPanelWindow({ panel }: { panel: string }) {
  const backend = useMemo(() => new NativeIDEBackend(invoke), [])
  useEffect(() => () => backend.dispose(), [backend])

  return (
    <div className="studio-local-app" style={{ padding: 12 }}>
      {panel === 'scene' && <ScenePanel backend={backend} />}
      {panel === 'hardware' && <HardwareProfilerPanel />}
      {panel === 'terminal' && <TerminalPanel backend={backend} />}
      {panel !== 'scene' && panel !== 'hardware' && panel !== 'terminal' && (
        <p style={{ color: 'var(--muted)' }}>Unknown undocked panel: "{panel}"</p>
      )}
    </div>
  )
}
