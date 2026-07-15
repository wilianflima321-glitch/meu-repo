import type { Dispatch, SetStateAction } from 'react'
import type { GatewayConfig } from './payments-types'

export function PaymentsGatewayCard({
  gateway,
  onChange,
  onSave,
  savingGateway,
}: {
  gateway: GatewayConfig
  onChange: Dispatch<SetStateAction<GatewayConfig>>
  onSave: () => void
  savingGateway: boolean
}) {
  return (
    <div className="mb-6 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow">
      <h2 className="mb-4 text-lg font-semibold">Payment gateway</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-[var(--aethel-text-secondary)]">Active gateway</span>
          <select value={gateway.activeGateway} onChange={(event) => onChange((previous) => ({ ...previous, activeGateway: event.target.value as 'stripe' | 'disabled' }))} className="w-full rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] p-2">
            <option value="stripe">Stripe</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[var(--aethel-text-secondary)]">Checkout web origin</span>
          <input value={gateway.checkoutOrigin || ''} onChange={(event) => onChange((previous) => ({ ...previous, checkoutOrigin: event.target.value.trim() || null }))} placeholder="https://your-domain.com" className="w-full rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] p-2" />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={gateway.checkoutEnabled} onChange={(event) => onChange((previous) => ({ ...previous, checkoutEnabled: event.target.checked }))} />
          Checkout enabled
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={gateway.allowLocalIdeRedirect} onChange={(event) => onChange((previous) => ({ ...previous, allowLocalIdeRedirect: event.target.checked }))} />
          Allow local IDE redirect to web checkout
        </label>
        <button type="button" onClick={onSave} disabled={savingGateway} className="rounded bg-[var(--aethel-primary-dark)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] disabled:opacity-60">
          {savingGateway ? 'Saving...' : 'Save settings'}
        </button>
      </div>

      <div className="mt-4 rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
        Operational state: gateway <span>{gateway.activeGateway}</span>, checkout <span>{gateway.checkoutEnabled ? 'enabled' : 'disabled'}</span>, local IDE redirect <span>{gateway.allowLocalIdeRedirect ? 'enabled' : 'disabled'}</span>.
      </div>
    </div>
  )
}
