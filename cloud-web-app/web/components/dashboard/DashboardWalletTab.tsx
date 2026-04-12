import type { FormEvent, Dispatch, SetStateAction } from 'react'

import type {
  PurchaseIntentResponse,
  TransferResponse,
  WalletSummary,
  WalletTransaction,
} from '@/lib/api'
import { CANONICAL_FOCUS, CANONICAL_MOTION, CANONICAL_SPACING, CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

import type { ReceivableSummary } from './aethel-dashboard-wallet-utils'

type PurchaseFormState = {
  amount: string
  currency: string
  reference: string
}

type TransferFormState = {
  targetUserId: string
  amount: string
  currency: string
  reference: string
}

type DashboardWalletTabProps = {
  authReady: boolean
  hasToken: boolean
  walletLoading: boolean
  walletError: unknown
  walletData: WalletSummary | undefined
  walletTransactions: WalletTransaction[]
  creditsInfo: { credits: number } | undefined
  creditsUsedToday: number
  creditsUsedThisMonth: number
  creditsReceivedThisMonth: number
  lastWalletUpdate: string | null
  lastPurchaseIntent: PurchaseIntentResponse | null
  lastTransferReceipt: TransferResponse | null
  walletActionMessage: string | null
  walletActionError: string | null
  purchaseForm: PurchaseFormState
  transferForm: TransferFormState
  walletSubmitting: boolean
  creditEntries: WalletTransaction[]
  receivableSummary: ReceivableSummary
  onRefreshWallet: () => void
  onPurchaseIntentSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTransferSubmit: (event: FormEvent<HTMLFormElement>) => void
  setPurchaseForm: Dispatch<SetStateAction<PurchaseFormState>>
  setTransferForm: Dispatch<SetStateAction<TransferFormState>>
  formatCurrencyLabel: (currency?: string | null) => string
  formatStatusLabel: (status: unknown) => string
}

export function DashboardWalletTab({
  authReady,
  hasToken,
  walletLoading,
  walletError,
  walletData,
  walletTransactions,
  creditsInfo,
  creditsUsedToday,
  creditsUsedThisMonth,
  creditsReceivedThisMonth,
  lastWalletUpdate,
  lastPurchaseIntent,
  lastTransferReceipt,
  walletActionMessage,
  walletActionError,
  purchaseForm,
  transferForm,
  walletSubmitting,
  creditEntries,
  receivableSummary,
  onRefreshWallet,
  onPurchaseIntentSubmit,
  onTransferSubmit,
  setPurchaseForm,
  setTransferForm,
  formatCurrencyLabel,
  formatStatusLabel,
}: DashboardWalletTabProps) {
  const hasWalletError = Boolean(walletError)
  const panelClass =
    'rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.16)]'
  const statCardClass =
    'rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4'
  const inputClass = `h-12 w-full rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 text-sm text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const primaryButtonClass = `inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_rgba(56,189,248,0.24)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const secondaryButtonClass = `inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)] disabled:cursor-not-allowed disabled:opacity-60 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  return (
    <div className={`${CANONICAL_SPACING.page.padding} space-y-6`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Wallet</p>
          <h2 className={CANONICAL_TYPOGRAPHY.h1}>Carteira</h2>
        </div>
        {authReady && hasToken && (
          <button type="button" onClick={onRefreshWallet} className={secondaryButtonClass} aria-label="Atualizar carteira">
            Atualizar
          </button>
        )}
      </div>

      {!authReady && <p className="text-sm text-[var(--aethel-text-secondary)]">Verificando autenticacao...</p>}

      {authReady && !hasToken && (
        <div className={`${panelClass} max-w-2xl`}>
          <p className="text-sm text-[var(--aethel-text-secondary)]">
            Para visualizar o saldo e realizar operacoes, faca login no portal.
          </p>
        </div>
      )}

      {authReady && hasToken && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={`${panelClass} space-y-4`}>
            <div>
              <h3 className="text-lg font-semibold">Saldo Atual</h3>
              {walletLoading && <p className="text-sm text-[var(--aethel-text-secondary)]">Carregando carteira...</p>}
              {hasWalletError && (
                <p className="text-sm text-[var(--aethel-error)]">
                  Falha ao carregar os dados. Tente novamente.
                </p>
              )}
              {!walletLoading && !hasWalletError && walletData && (
                <>
                  <div className="text-4xl font-bold text-[var(--aethel-text-primary)]">
                    {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                  </div>
                  {creditsInfo && (
                    <p className="text-xs text-[var(--aethel-text-secondary)]">
                      Creditos faturaveis: {creditsInfo.credits.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                    </p>
                  )}
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    {walletTransactions.length} transacoes
                  </p>
                  {lastWalletUpdate && (
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">
                      Atualizado em {new Date(lastWalletUpdate).toLocaleString()}
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className={statCardClass}>
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">Gasto hoje</p>
                      <p className="text-lg font-semibold text-[var(--aethel-error)]">
                        {creditsUsedToday.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                      </p>
                    </div>
                    <div className={statCardClass}>
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">Gasto no mes</p>
                      <p className="text-lg font-semibold text-[var(--aethel-warning)]">
                        {creditsUsedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                      </p>
                    </div>
                    <div className={statCardClass}>
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">Recebido no mes</p>
                      <p className="text-lg font-semibold text-[var(--aethel-success)]">
                        {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                      </p>
                    </div>
                  </div>
                  {lastPurchaseIntent && (
                    <p className="text-xs text-[var(--aethel-text-secondary)] mt-2">
                      Ultima intencao #{lastPurchaseIntent.intent_id} - +
                      {lastPurchaseIntent.entry.amount.toLocaleString()} {formatCurrencyLabel(lastPurchaseIntent.entry.currency)}{' '}
                      em {new Date(lastPurchaseIntent.entry.created_at).toLocaleString()}
                    </p>
                  )}
                  {lastTransferReceipt && (
                    <p className="text-xs text-[var(--aethel-text-secondary)]">
                      Ultima transferencia #{lastTransferReceipt.transfer_id} - -
                      {lastTransferReceipt.sender_entry.amount.toLocaleString()} {formatCurrencyLabel(lastTransferReceipt.sender_entry.currency)}{' '}
                      em {new Date(lastTransferReceipt.sender_entry.created_at).toLocaleString()}
                    </p>
                  )}
                </>
              )}
            </div>

            {(walletActionMessage || walletActionError) && (
              <div className={`text-sm ${walletActionError ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-success)]'}`}>
                {walletActionError || walletActionMessage}
              </div>
            )}

            <form className="space-y-3" onSubmit={onPurchaseIntentSubmit}>
              <h4 className="text-sm font-semibold">Adicionar Creditos</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={purchaseForm.amount}
                  onChange={(event) => setPurchaseForm((prev) => ({ ...prev, amount: event.target.value }))}
                  className={inputClass}
                  aria-label="Quantidade de creditos"
                  placeholder="Quantidade"
                  required
                />
                <select
                  value={purchaseForm.currency}
                  onChange={(event) => setPurchaseForm((prev) => ({ ...prev, currency: event.target.value }))}
                  className={`${inputClass} w-32`}
                  aria-label="Moeda da compra"
                >
                  <option value="credits">Creditos</option>
                </select>
              </div>
              <input
                type="text"
                value={purchaseForm.reference}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, reference: event.target.value }))}
                className={inputClass}
                aria-label="Referencia da compra"
                placeholder="Referencia (opcional)"
              />
              <button type="submit" className={primaryButtonClass} disabled={walletSubmitting} aria-label="Confirmar intencao de compra de creditos">
                {walletSubmitting ? 'Processando...' : 'Confirmar Intencao'}
              </button>
            </form>
          </div>

          <div className={`${panelClass} space-y-4`}>
            <form className="space-y-3" onSubmit={onTransferSubmit}>
              <h3 className="text-lg font-semibold">Transferir Creditos</h3>
              <input
                type="text"
                value={transferForm.targetUserId}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, targetUserId: event.target.value }))}
                className={inputClass}
                aria-label="Destinatario da transferencia"
                placeholder="ID do usuario ou e-mail do destinatario"
                required
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={transferForm.amount}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, amount: event.target.value }))}
                  className={inputClass}
                  aria-label="Quantidade para transferir"
                  placeholder="Quantidade"
                  required
                />
                <select
                  value={transferForm.currency}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, currency: event.target.value }))}
                  className={`${inputClass} w-32`}
                  aria-label="Moeda da transferencia"
                >
                  <option value="credits">Creditos</option>
                </select>
              </div>
              <input
                type="text"
                value={transferForm.reference}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, reference: event.target.value }))}
                className={inputClass}
                aria-label="Referencia da transferencia"
                placeholder="Referencia (opcional)"
              />
              <button type="submit" className={secondaryButtonClass} disabled={walletSubmitting} aria-label="Transferir creditos">
                {walletSubmitting ? 'Processando...' : 'Transferir'}
              </button>
            </form>

            <div>
              <h4 className="text-sm font-semibold mb-2">Historico Recente</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {walletTransactions.length === 0 && (
                  <p className="text-sm text-[var(--aethel-text-tertiary)]">Nenhuma transacao registrada.</p>
                )}
                {walletTransactions.slice().reverse().map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-[var(--aethel-border-primary)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">
                        {entry.reference || entry.entry_type.toUpperCase()}
                      </span>
                      <span className={`text-sm font-semibold ${entry.entry_type === 'credit' ? 'text-[var(--aethel-success)]' : entry.entry_type === 'transfer' ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-error)]'}`}>
                        {entry.entry_type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-xs text-[var(--aethel-text-secondary)]">
                        Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '-'} {formatCurrencyLabel(entry.currency)}
                      </span>
                      <span className="text-xs text-[var(--aethel-text-tertiary)]">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${panelClass} space-y-4 lg:col-span-2`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Recebiveis</h3>
              <span className="text-xs text-[var(--aethel-text-tertiary)]">
                {creditEntries.length} lancamentos de entrada
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className={statCardClass}>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Recebido no mes</p>
                <p className="text-lg font-semibold text-[var(--aethel-success)]">
                  {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                </p>
              </div>
              <div className={statCardClass}>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Total creditado</p>
                <p className="text-lg font-semibold text-[var(--aethel-primary-light)]">
                  {receivableSummary.total.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                </p>
              </div>
              <div className={statCardClass}>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Pendente de conciliacao</p>
                <p className="text-lg font-semibold text-[var(--aethel-warning)]">
                  {receivableSummary.pending.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="text-[var(--aethel-text-secondary)]">
                    <th className="py-2 pr-4">Referencia</th>
                    <th className="py-2 pr-4">Valor</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Saldo</th>
                    <th className="py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {receivableSummary.recent.length === 0 && (
                    <tr>
                      <td className="py-3 text-[var(--aethel-text-tertiary)]" colSpan={5}>
                        Nenhum recebimento registrado.
                      </td>
                    </tr>
                  )}
                  {receivableSummary.recent.map((entry) => {
                    const rawStatus = entry.metadata?.['status'] as unknown
                    const statusLabel = String(formatStatusLabel(rawStatus))
                    const invoice = entry.metadata?.['invoice_id'] as unknown
                    const referenceLabel = typeof entry.reference === 'string' ? entry.reference : ''
                    const invoiceLabel = typeof invoice === 'string' ? invoice : referenceLabel
                    const amountLabel = `+${entry.amount.toLocaleString()} ${formatCurrencyLabel(entry.currency)}`
                    return (
                      <tr key={entry.id} className="border-t border-[var(--aethel-border-primary)]">
                        <td className="py-2 pr-4 font-medium text-[var(--aethel-text-primary)]">
                          {invoiceLabel || 'Recebimento'}
                        </td>
                        <td className="py-2 pr-4 text-[var(--aethel-success)]">
                          {amountLabel}
                        </td>
                        <td className="py-2 pr-4 uppercase">
                          {statusLabel}
                        </td>
                        <td className="py-2 pr-4 text-[var(--aethel-text-secondary)]">
                          {entry.balance_after != null ? entry.balance_after.toLocaleString() : '-'} {formatCurrencyLabel(entry.currency)}
                        </td>
                        <td className="py-2 text-[var(--aethel-text-secondary)]">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

