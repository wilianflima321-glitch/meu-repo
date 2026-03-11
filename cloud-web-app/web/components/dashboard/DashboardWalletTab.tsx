import type { FormEvent, Dispatch, SetStateAction } from 'react'

import type {
  PurchaseIntentResponse,
  TransferResponse,
  WalletSummary,
  WalletTransaction,
} from '@/lib/api'

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

  return (
    <div className="aethel-p-6 space-y-6">
      <div className="aethel-flex aethel-items-center aethel-justify-between">
        <h2 className="text-2xl font-bold">Carteira</h2>
        {authReady && hasToken && (
          <button type="button" onClick={onRefreshWallet} className="aethel-button aethel-button-secondary text-xs">
            Atualizar
          </button>
        )}
      </div>

      {!authReady && <p className="text-sm text-slate-400">Verificando autenticacao...</p>}

      {authReady && !hasToken && (
        <div className="aethel-card aethel-p-6 max-w-2xl">
          <p className="text-sm text-slate-300">
            Para visualizar o saldo e realizar operacoes, faca login no portal.
          </p>
        </div>
      )}

      {authReady && hasToken && (
        <div className="grid grid-cols-1 lg:grid-cols-2 aethel-gap-6">
          <div className="aethel-card aethel-p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Saldo Atual</h3>
              {walletLoading && <p className="text-sm text-slate-400">Carregando carteira...</p>}
              {hasWalletError && (
                <p className="text-sm text-red-400">
                  Falha ao carregar os dados. Tente novamente.
                </p>
              )}
              {!walletLoading && !hasWalletError && walletData && (
                <>
                  <div className="text-4xl font-bold text-slate-100">
                    {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                  </div>
                  {creditsInfo && (
                    <p className="text-xs text-slate-400">
                      Creditos faturaveis: {creditsInfo.credits.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {walletTransactions.length} transacoes
                  </p>
                  {lastWalletUpdate && (
                    <p className="text-xs text-slate-500">
                      Atualizado em {new Date(lastWalletUpdate).toLocaleString()}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 aethel-gap-3 mt-4">
                    <div className="bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                      <p className="text-xs text-slate-500">Gasto hoje</p>
                      <p className="text-lg font-semibold text-rose-300">
                        {creditsUsedToday.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                      </p>
                    </div>
                    <div className="bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                      <p className="text-xs text-slate-500">Gasto no mes</p>
                      <p className="text-lg font-semibold text-amber-300">
                        {creditsUsedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                      </p>
                    </div>
                    <div className="bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                      <p className="text-xs text-slate-500">Recebido no mes</p>
                      <p className="text-lg font-semibold text-emerald-300">
                        {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                      </p>
                    </div>
                  </div>
                  {lastPurchaseIntent && (
                    <p className="text-xs text-slate-400 mt-2">
                      Ultima intencao #{lastPurchaseIntent.intent_id} • +
                      {lastPurchaseIntent.entry.amount.toLocaleString()} {formatCurrencyLabel(lastPurchaseIntent.entry.currency)}{' '}
                      em {new Date(lastPurchaseIntent.entry.created_at).toLocaleString()}
                    </p>
                  )}
                  {lastTransferReceipt && (
                    <p className="text-xs text-slate-400">
                      Ultima transferencia #{lastTransferReceipt.transfer_id} • -
                      {lastTransferReceipt.sender_entry.amount.toLocaleString()} {formatCurrencyLabel(lastTransferReceipt.sender_entry.currency)}{' '}
                      em {new Date(lastTransferReceipt.sender_entry.created_at).toLocaleString()}
                    </p>
                  )}
                </>
              )}
            </div>

            {(walletActionMessage || walletActionError) && (
              <div className={`text-sm ${walletActionError ? 'text-red-400' : 'text-emerald-400'}`}>
                {walletActionError || walletActionMessage}
              </div>
            )}

            <form className="space-y-3" onSubmit={onPurchaseIntentSubmit}>
              <h4 className="text-sm font-semibold">Adicionar Creditos</h4>
              <div className="aethel-flex aethel-gap-2">
                <input
                  type="number"
                  min={1}
                  value={purchaseForm.amount}
                  onChange={(event) => setPurchaseForm((prev) => ({ ...prev, amount: event.target.value }))}
                  className="aethel-input"
                  placeholder="Quantidade"
                  required
                />
                <select
                  value={purchaseForm.currency}
                  onChange={(event) => setPurchaseForm((prev) => ({ ...prev, currency: event.target.value }))}
                  className="aethel-input w-32"
                >
                  <option value="credits">Creditos</option>
                </select>
              </div>
              <input
                type="text"
                value={purchaseForm.reference}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, reference: event.target.value }))}
                className="aethel-input"
                placeholder="Referencia (opcional)"
              />
              <button type="submit" className="aethel-button aethel-button-primary" disabled={walletSubmitting}>
                {walletSubmitting ? 'Processando...' : 'Confirmar Intencao'}
              </button>
            </form>
          </div>

          <div className="aethel-card aethel-p-6 space-y-4">
            <form className="space-y-3" onSubmit={onTransferSubmit}>
              <h3 className="text-lg font-semibold">Transferir Creditos</h3>
              <input
                type="text"
                value={transferForm.targetUserId}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, targetUserId: event.target.value }))}
                className="aethel-input"
                placeholder="ID do usuario ou e-mail do destinatario"
                required
              />
              <div className="aethel-flex aethel-gap-2">
                <input
                  type="number"
                  min={1}
                  value={transferForm.amount}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, amount: event.target.value }))}
                  className="aethel-input"
                  placeholder="Quantidade"
                  required
                />
                <select
                  value={transferForm.currency}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, currency: event.target.value }))}
                  className="aethel-input w-32"
                >
                  <option value="credits">Creditos</option>
                </select>
              </div>
              <input
                type="text"
                value={transferForm.reference}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, reference: event.target.value }))}
                className="aethel-input"
                placeholder="Referencia (opcional)"
              />
              <button type="submit" className="aethel-button aethel-button-secondary" disabled={walletSubmitting}>
                {walletSubmitting ? 'Processando...' : 'Transferir'}
              </button>
            </form>

            <div>
              <h4 className="text-sm font-semibold mb-2">Historico Recente</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {walletTransactions.length === 0 && (
                  <p className="text-sm text-slate-500">Nenhuma transacao registrada.</p>
                )}
                {walletTransactions.slice().reverse().map((entry) => (
                  <div key={entry.id} className="border border-slate-800 aethel-rounded-lg aethel-p-3">
                    <div className="aethel-flex aethel-justify-between aethel-items-center">
                      <span className="text-sm font-medium">
                        {entry.reference || entry.entry_type.toUpperCase()}
                      </span>
                      <span className={`text-sm font-semibold ${entry.entry_type === 'credit' ? 'text-emerald-400' : entry.entry_type === 'transfer' ? 'text-amber-300' : 'text-red-400'}`}>
                        {entry.entry_type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                      </span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-items-center mt-1">
                      <span className="text-xs text-slate-400">
                        Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6 lg:col-span-2 space-y-4">
            <div className="aethel-flex aethel-items-center aethel-justify-between">
              <h3 className="text-lg font-semibold">Recebiveis</h3>
              <span className="text-xs text-slate-500">
                {creditEntries.length} lancamentos de entrada
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 aethel-gap-4">
              <div className="bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                <p className="text-xs text-slate-500">Recebido no mes</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                </p>
              </div>
              <div className="bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                <p className="text-xs text-slate-500">Total creditado</p>
                <p className="text-lg font-semibold text-blue-300">
                  {receivableSummary.total.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                </p>
              </div>
              <div className="bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                <p className="text-xs text-slate-500">Pendente de conciliacao</p>
                <p className="text-lg font-semibold text-amber-300">
                  {receivableSummary.pending.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400">
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
                      <td className="py-3 text-slate-500" colSpan={5}>
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
                      <tr key={entry.id} className="border-t border-slate-800">
                        <td className="py-2 pr-4 font-medium text-slate-200">
                          {invoiceLabel || 'Recebimento'}
                        </td>
                        <td className="py-2 pr-4 text-emerald-300">
                          {amountLabel}
                        </td>
                        <td className="py-2 pr-4 uppercase">
                          {statusLabel}
                        </td>
                        <td className="py-2 pr-4 text-slate-400">
                          {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
                        </td>
                        <td className="py-2 text-slate-400">
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
