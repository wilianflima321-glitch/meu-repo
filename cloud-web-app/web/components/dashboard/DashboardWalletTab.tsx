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
  return (
    <div className="aethel-p-6 aethel-space-y-6">
      <div className="aethel-flex aethel-items-center aethel-justify-between">
        <h2 className="aethel-text-2xl aethel-font-bold">Carteira</h2>
        {authReady && hasToken && (
          <button type="button" onClick={onRefreshWallet} className="aethel-button aethel-button-secondary aethel-text-xs">
            Atualizar
          </button>
        )}
      </div>

      {!authReady && <p className="aethel-text-sm aethel-text-slate-400">Verificando autenticacao...</p>}

      {authReady && !hasToken && (
        <div className="aethel-card aethel-p-6 aethel-max-w-2xl">
          <p className="aethel-text-sm aethel-text-slate-300">
            Para visualizar o saldo e realizar operacoes, faca login no portal.
          </p>
        </div>
      )}

      {authReady && hasToken && (
        <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
          <div className="aethel-card aethel-p-6 aethel-space-y-4">
            <div>
              <h3 className="aethel-text-lg aethel-font-semibold">Saldo Atual</h3>
              {walletLoading && <p className="aethel-text-sm aethel-text-slate-400">Carregando carteira...</p>}
              {walletError && (
                <p className="aethel-text-sm aethel-text-red-400">
                  Falha ao carregar os dados. Tente novamente.
                </p>
              )}
              {!walletLoading && !walletError && walletData && (
                <>
                  <div className="aethel-text-4xl aethel-font-bold aethel-text-slate-100">
                    {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                  </div>
                  {creditsInfo && (
                    <p className="aethel-text-xs aethel-text-slate-400">
                      Creditos faturaveis: {creditsInfo.credits.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                    </p>
                  )}
                  <p className="aethel-text-xs aethel-text-slate-500">
                    {walletTransactions.length} transacoes
                  </p>
                  {lastWalletUpdate && (
                    <p className="aethel-text-xs aethel-text-slate-500">
                      Atualizado em {new Date(lastWalletUpdate).toLocaleString()}
                    </p>
                  )}
                  <div className="aethel-grid aethel-grid-cols-1 sm:aethel-grid-cols-3 aethel-gap-3 aethel-mt-4">
                    <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                      <p className="aethel-text-xs aethel-text-slate-500">Gasto hoje</p>
                      <p className="aethel-text-lg aethel-font-semibold aethel-text-rose-300">
                        {creditsUsedToday.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                      </p>
                    </div>
                    <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                      <p className="aethel-text-xs aethel-text-slate-500">Gasto no mes</p>
                      <p className="aethel-text-lg aethel-font-semibold aethel-text-amber-300">
                        {creditsUsedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                      </p>
                    </div>
                    <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                      <p className="aethel-text-xs aethel-text-slate-500">Recebido no mes</p>
                      <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
                        {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                      </p>
                    </div>
                  </div>
                  {lastPurchaseIntent && (
                    <p className="aethel-text-xs aethel-text-slate-400 aethel-mt-2">
                      Ultima intencao #{lastPurchaseIntent.intent_id} • +
                      {lastPurchaseIntent.entry.amount.toLocaleString()} {formatCurrencyLabel(lastPurchaseIntent.entry.currency)}{' '}
                      em {new Date(lastPurchaseIntent.entry.created_at).toLocaleString()}
                    </p>
                  )}
                  {lastTransferReceipt && (
                    <p className="aethel-text-xs aethel-text-slate-400">
                      Ultima transferencia #{lastTransferReceipt.transfer_id} • -
                      {lastTransferReceipt.sender_entry.amount.toLocaleString()} {formatCurrencyLabel(lastTransferReceipt.sender_entry.currency)}{' '}
                      em {new Date(lastTransferReceipt.sender_entry.created_at).toLocaleString()}
                    </p>
                  )}
                </>
              )}
            </div>

            {(walletActionMessage || walletActionError) && (
              <div className={`aethel-text-sm ${walletActionError ? 'aethel-text-red-400' : 'aethel-text-emerald-400'}`}>
                {walletActionError || walletActionMessage}
              </div>
            )}

            <form className="aethel-space-y-3" onSubmit={onPurchaseIntentSubmit}>
              <h4 className="aethel-text-sm aethel-font-semibold">Adicionar Creditos</h4>
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
                  className="aethel-input aethel-w-32"
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

          <div className="aethel-card aethel-p-6 aethel-space-y-4">
            <form className="aethel-space-y-3" onSubmit={onTransferSubmit}>
              <h3 className="aethel-text-lg aethel-font-semibold">Transferir Creditos</h3>
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
                  className="aethel-input aethel-w-32"
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
              <h4 className="aethel-text-sm aethel-font-semibold aethel-mb-2">Historico Recente</h4>
              <div className="aethel-space-y-2 aethel-max-h-64 aethel-overflow-y-auto">
                {walletTransactions.length === 0 && (
                  <p className="aethel-text-sm aethel-text-slate-500">Nenhuma transacao registrada.</p>
                )}
                {walletTransactions.slice().reverse().map((entry) => (
                  <div key={entry.id} className="aethel-border aethel-border-slate-800 aethel-rounded-lg aethel-p-3">
                    <div className="aethel-flex aethel-justify-between aethel-items-center">
                      <span className="aethel-text-sm aethel-font-medium">
                        {entry.reference || entry.entry_type.toUpperCase()}
                      </span>
                      <span className={`aethel-text-sm aethel-font-semibold ${entry.entry_type === 'credit' ? 'aethel-text-emerald-400' : entry.entry_type === 'transfer' ? 'aethel-text-amber-300' : 'aethel-text-red-400'}`}>
                        {entry.entry_type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                      </span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-items-center aethel-mt-1">
                      <span className="aethel-text-xs aethel-text-slate-400">
                        Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
                      </span>
                      <span className="aethel-text-xs aethel-text-slate-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6 lg:aethel-col-span-2 aethel-space-y-4">
            <div className="aethel-flex aethel-items-center aethel-justify-between">
              <h3 className="aethel-text-lg aethel-font-semibold">Recebiveis</h3>
              <span className="aethel-text-xs aethel-text-slate-500">
                {creditEntries.length} lancamentos de entrada
              </span>
            </div>
            <div className="aethel-grid aethel-grid-cols-1 sm:aethel-grid-cols-3 aethel-gap-4">
              <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                <p className="aethel-text-xs aethel-text-slate-500">Recebido no mes</p>
                <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
                  {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                </p>
              </div>
              <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                <p className="aethel-text-xs aethel-text-slate-500">Total creditado</p>
                <p className="aethel-text-lg aethel-font-semibold aethel-text-blue-300">
                  {receivableSummary.total.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                </p>
              </div>
              <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                <p className="aethel-text-xs aethel-text-slate-500">Pendente de conciliacao</p>
                <p className="aethel-text-lg aethel-font-semibold aethel-text-amber-300">
                  {receivableSummary.pending.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                </p>
              </div>
            </div>
            <div className="aethel-overflow-x-auto">
              <table className="aethel-min-w-full aethel-text-xs aethel-text-left">
                <thead>
                  <tr className="aethel-text-slate-400">
                    <th className="aethel-py-2 aethel-pr-4">Referencia</th>
                    <th className="aethel-py-2 aethel-pr-4">Valor</th>
                    <th className="aethel-py-2 aethel-pr-4">Status</th>
                    <th className="aethel-py-2 aethel-pr-4">Saldo</th>
                    <th className="aethel-py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {receivableSummary.recent.length === 0 && (
                    <tr>
                      <td className="aethel-py-3 aethel-text-slate-500" colSpan={5}>
                        Nenhum recebimento registrado.
                      </td>
                    </tr>
                  )}
                  {receivableSummary.recent.map((entry) => {
                    const rawStatus = entry.metadata?.['status'] as unknown
                    const statusLabel = formatStatusLabel(rawStatus)
                    const invoice = entry.metadata?.['invoice_id'] as unknown
                    const invoiceLabel = typeof invoice === 'string' ? invoice : entry.reference
                    const amountLabel = `+${entry.amount.toLocaleString()} ${formatCurrencyLabel(entry.currency)}`
                    return (
                      <tr key={entry.id} className="aethel-border-t aethel-border-slate-800">
                        <td className="aethel-py-2 aethel-pr-4 aethel-font-medium aethel-text-slate-200">
                          {invoiceLabel || 'Recebimento'}
                        </td>
                        <td className="aethel-py-2 aethel-pr-4 aethel-text-emerald-300">
                          {amountLabel}
                        </td>
                        <td className="aethel-py-2 aethel-pr-4 aethel-uppercase">
                          {statusLabel}
                        </td>
                        <td className="aethel-py-2 aethel-pr-4 aethel-text-slate-400">
                          {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
                        </td>
                        <td className="aethel-py-2 aethel-text-slate-400">
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
