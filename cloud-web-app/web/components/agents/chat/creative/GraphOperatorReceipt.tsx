'use client'

/**
 * AI-v1-e / J.5 — GraphOperator receipt strip for Nexus / Agents UI.
 */

interface GraphOperatorReceiptProps {
  graphId?: string | null
  target?: string | null
  nodeCount?: number
  fusionTransactionId?: string | null
  requiresUserWiring?: boolean
  blockedReason?: string | null
  className?: string
}

export function GraphOperatorReceipt({
  graphId,
  target,
  nodeCount,
  fusionTransactionId,
  requiresUserWiring,
  blockedReason,
  className,
}: GraphOperatorReceiptProps) {
  if (!graphId && !blockedReason) return null

  const tone = blockedReason
    ? 'border-[var(--aethel-error)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]'
    : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]'

  return (
    <div
      className={className ?? `mx-4 mb-2 rounded-lg border px-3 py-2 ${tone}`}
      role="status"
      data-aethel-j5="graph-operator-receipt"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-info-light)]">
        GraphOperator {blockedReason ? 'blocked' : 'committed'}
      </div>
      {blockedReason ? (
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">{blockedReason}</p>
      ) : (
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">
          {target ?? 'graph'} · {nodeCount ?? 0} nodes · physicsAutoWired=false
          {requiresUserWiring ? ' · USER_WIRE stubs present' : ''}
        </p>
      )}
      {(graphId || fusionTransactionId) && (
        <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
          {graphId ? `graph:${graphId}` : null}
          {graphId && fusionTransactionId ? ' · ' : null}
          {fusionTransactionId ? `tx:${fusionTransactionId}` : null}
        </p>
      )}
    </div>
  )
}
