import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import { Code2 } from 'lucide-react'

type LspFarmHonestyReport = {
  cloudRelayCore: boolean
  tauriSidecarSpawn: string
  monacoDesktopHoverDefinition: string
  marketingAllowed: boolean
  message: string
}

type LspBinaryProbe = {
  language: string
  command: string
  resolvedPath: string | null
  available: boolean
  message: string
}

/**
 * L.13 honesty surface for Studio Local — probes real `lsp_farm` IPC.
 * Never claims Universal IDE / live marketing. Monaco is mounted in the shell
 * (`MonacoCodeEditorPanel`); hover/definition stay fail-closed when farm HELD.
 */
export function LspFarmStatusPanel() {
  const [honesty, setHonesty] = useState<LspFarmHonestyReport | null>(null)
  const [probes, setProbes] = useState<LspBinaryProbe[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [report, binaryProbes] = await Promise.all([
          invoke<LspFarmHonestyReport>('lsp_farm_honesty'),
          invoke<LspBinaryProbe[]>('lsp_farm_probe'),
        ])
        if (cancelled) return
        setHonesty(report)
        setProbes(binaryProbes)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'lsp_farm IPC unavailable outside Tauri.')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="panel">
      <div className="panel-heading">
        <span className="inline-flex items-center gap-1.5">
          <Code2 className="h-3.5 w-3.5" />
          L.13 LSP Farm
        </span>
        <strong>
          {honesty?.marketingAllowed
            ? 'MARKETING (illegal)'
            : honesty
              ? String(honesty.tauriSidecarSpawn).toUpperCase()
              : error
                ? 'UNAVAILABLE'
                : '…'}
        </strong>
      </div>

      {error && <p className="error-note">{error}</p>}

      {honesty && (
        <>
          <p className="text-xs text-[var(--aethel-text-secondary)] mb-2">{honesty.message}</p>
          <dl className="metric-list">
            <div>
              <dt>Tauri sidecar spawn</dt>
              <dd>{honesty.tauriSidecarSpawn}</dd>
            </div>
            <div>
              <dt>Monaco hover/definition</dt>
              <dd>{honesty.monacoDesktopHoverDefinition}</dd>
            </div>
            <div>
              <dt>Marketing allowed</dt>
              <dd>{honesty.marketingAllowed ? 'true (bug)' : 'false'}</dd>
            </div>
            <div>
              <dt>Desktop shell Monaco mount</dt>
              <dd>mounted — LSP wire fail-closed when farm HELD</dd>
            </div>
          </dl>
        </>
      )}

      {probes.length > 0 && (
        <ul className="capability-list mt-2" aria-label="Language server binary probes">
          {probes.map((probe) => (
            <li key={probe.language} data-state={probe.available ? 'available' : 'held'}>
              <span>
                {probe.language} ({probe.command})
              </span>
              <em>{probe.available ? 'resolvable' : 'HELD'}</em>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
