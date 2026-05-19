import type { Dispatch, SetStateAction } from 'react'
import type { PromotionFormState } from './promotions-types'

export function PromotionCreateForm({
  creating,
  formError,
  newPromotion,
  onCreate,
  onChange,
}: {
  creating: boolean
  formError: string | null
  newPromotion: PromotionFormState
  onCreate: () => void
  onChange: Dispatch<SetStateAction<PromotionFormState>>
}) {
  return (
    <div className="mb-6 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <input type="text" placeholder="Name" value={newPromotion.name} onChange={(event) => onChange((previous) => ({ ...previous, name: event.target.value }))} className="rounded border p-2" />
        <input type="text" placeholder="Code (example: BF2026)" value={newPromotion.code} onChange={(event) => onChange((previous) => ({ ...previous, code: event.target.value }))} className="rounded border p-2" />
        <select value={newPromotion.type} onChange={(event) => onChange((previous) => ({ ...previous, type: event.target.value as 'percentage' | 'fixed' }))} className="rounded border p-2">
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed amount (US$)</option>
        </select>
        <input type="number" placeholder="Discount" value={newPromotion.discount} onChange={(event) => onChange((previous) => ({ ...previous, discount: event.target.value }))} className="rounded border p-2" />
        <input type="number" placeholder="Max redemptions (optional)" value={newPromotion.maxRedemptions} onChange={(event) => onChange((previous) => ({ ...previous, maxRedemptions: event.target.value }))} className="rounded border p-2" />
        <input type="date" placeholder="Expiration" value={newPromotion.expiresAt} onChange={(event) => onChange((previous) => ({ ...previous, expiresAt: event.target.value }))} className="rounded border p-2" />
        {newPromotion.type === 'fixed' && <input type="text" placeholder="Currency (example: USD)" value={newPromotion.currency} onChange={(event) => onChange((previous) => ({ ...previous, currency: event.target.value }))} className="rounded border p-2" />}
      </div>
      {formError && <p className="mt-2 text-sm text-[var(--aethel-error)]">{formError}</p>}
      <button type="button" onClick={onCreate} disabled={creating} className="mt-4 rounded bg-[var(--aethel-primary-dark)] px-4 py-2 text-[var(--aethel-text-primary)] disabled:opacity-60">
        {creating ? 'Creating...' : 'Create promotion'}
      </button>
    </div>
  )
}
