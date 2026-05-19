import type { BiasPriority } from './bias-types'

type BiasAuditFormProps = {
  newOutput: string
  newScore: string
  newFlags: string
  newReason: string
  newPriority: BiasPriority
  submitting: boolean
  error: string | null
  onOutputChange: (value: string) => void
  onScoreChange: (value: string) => void
  onFlagsChange: (value: string) => void
  onReasonChange: (value: string) => void
  onPriorityChange: (value: BiasPriority) => void
  onAnalyze: () => void
}

export function BiasAuditForm(props: BiasAuditFormProps) {
  return (
    <div className="mb-6 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow">
      <h2 className="mb-4 text-lg font-semibold">Audit AI output</h2>
      <div className="space-y-4">
        <textarea placeholder="Paste AI output here for audit" value={props.newOutput} onChange={(event) => props.onOutputChange(event.target.value)} className="w-full border p-2" rows={5} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input type="number" step="0.01" min="0" max="1" placeholder="Bias score (0-1, optional)" value={props.newScore} onChange={(event) => props.onScoreChange(event.target.value)} className="w-full border p-2" />
          <input type="text" placeholder="Flags (comma-separated)" value={props.newFlags} onChange={(event) => props.onFlagsChange(event.target.value)} className="w-full border p-2" />
          <input type="text" placeholder="Reason (optional)" value={props.newReason} onChange={(event) => props.onReasonChange(event.target.value)} className="w-full border p-2" />
          <select value={props.newPriority} onChange={(event) => props.onPriorityChange(event.target.value as BiasPriority)} className="w-full border p-2">
            <option value="low">Low priority</option>
            <option value="normal">Normal priority</option>
            <option value="high">High priority</option>
            <option value="urgent">Urgent priority</option>
          </select>
        </div>
        <button type="button" onClick={props.onAnalyze} disabled={props.submitting || !props.newOutput.trim()} className="rounded bg-[var(--aethel-primary)] px-4 py-2 text-[var(--aethel-text-primary)] disabled:opacity-60">
          {props.submitting ? 'Recording...' : 'Record audit'}
        </button>
        {props.error ? <p className="text-sm text-[var(--aethel-error)]">{props.error}</p> : null}
      </div>
    </div>
  )
}
