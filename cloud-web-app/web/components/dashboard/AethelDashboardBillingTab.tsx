'use client'

type AethelDashboardBillingTabProps = {
  activeTab: string
  dashboard: any
  creditsUsedToday: number
  creditsUsedThisMonth: number
  creditsReceivedThisMonth: number
}

export function AethelDashboardBillingTab({
  activeTab,
  dashboard,
  creditsUsedToday,
  creditsUsedThisMonth,
  creditsReceivedThisMonth,
}: AethelDashboardBillingTabProps) {
  if (activeTab !== 'billing') return null

  const {
    Link,
    BillingTab,
    billingError,
    currentPlanError,
    creditsError,
    subscribeMessage,
    subscribeError,
    currentPlan,
    formatCurrency,
    walletData,
    formatCurrencyLabel,
    creditsInfo,
    receivableSummary,
    billingPlansForUI,
    billingData,
    handleSubscribe,
    handleManageSubscription,
    formatStatusLabel,
    lastWalletUpdate,
  } = dashboard

  return (
    <div className="aethel-p-6 aethel-space-y-6">
      <div className="aethel-flex aethel-flex-col md:aethel-flex-row md:aethel-items-end md:aethel-justify-between aethel-gap-4">
        <div className="aethel-space-y-2">
          <h2 className="aethel-text-3xl aethel-font-bold">Faturamento &amp; CrÃ©ditos</h2>
          <p className="aethel-text-slate-400 aethel-max-w-2xl">
            Acompanhe o plano ativo, crÃ©ditos disponÃ­veis e recebÃ­veis em tempo real. Todas as operaÃ§Ãµes refletem
            diretamente o que estÃ¡ registrado na carteira e nos endpoints de billing.
          </p>
        </div>
        <Link href="/terms" className="aethel-button aethel-button-secondary aethel-text-sm">
          Consultar Termos de Uso
        </Link>
      </div>

      {(billingError || currentPlanError || creditsError) && (
        <div className="aethel-card aethel-border aethel-border-amber-500/40 aethel-bg-amber-500/10 aethel-text-amber-200 aethel-text-sm aethel-p-4">
          <p>
            {billingError && 'Falha ao recuperar planos. '}
            {currentPlanError && 'NÃ£o foi possÃ­vel identificar o plano atual. '}
            {creditsError && 'NÃ£o foi possÃ­vel obter o saldo de crÃ©ditos faturÃ¡veis.'}
          </p>
        </div>
      )}

      {(subscribeMessage || subscribeError) && (
        <div className={`aethel-card aethel-text-sm aethel-p-4 ${subscribeError ? 'aethel-text-red-300 aethel-bg-red-500/10 aethel-border aethel-border-red-500/40' : 'aethel-text-emerald-300 aethel-bg-emerald-500/10 aethel-border aethel-border-emerald-500/40'}`}>
          {subscribeError || subscribeMessage}
        </div>
      )}

      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 xl:aethel-grid-cols-4 aethel-gap-4">
        <div className="aethel-card aethel-p-5 aethel-space-y-3">
          <p className="aethel-text-xs aethel-text-slate-500">Plano atual</p>
          <h3 className="aethel-text-xl aethel-font-semibold">
            {currentPlan?.name ?? 'Plano padrÃ£o'}
          </h3>
          <p className="aethel-text-sm aethel-text-slate-400">
            {currentPlan?.priceBRL !== undefined
              ? `${formatCurrency(currentPlan.priceBRL, 'BRL')}/mÃªs`
              : currentPlan?.price !== undefined
                ? `${formatCurrency(currentPlan.price, 'USD')}/mÃªs`
                : 'Valor conforme consumo'}
          </p>
          {currentPlan?.features && currentPlan.features.length > 0 && (
            <ul className="aethel-text-xs aethel-text-slate-400 aethel-space-y-1">
              {currentPlan.features.slice(0, 3).map((feature: string) => (
                <li key={feature}>â€¢ {feature}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="aethel-card aethel-p-5 aethel-space-y-3">
          <p className="aethel-text-xs aethel-text-slate-500">Saldo em crÃ©ditos</p>
          <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-blue-300">
            {walletData ? `${walletData.balance.toLocaleString()} ${formatCurrencyLabel(walletData.currency)}` : 'â€”'}
          </h3>
          <p className="aethel-text-xs aethel-text-slate-400">
            {creditsInfo
              ? `CrÃ©ditos faturÃ¡veis: ${creditsInfo.credits.toLocaleString()} ${formatCurrencyLabel(walletData?.currency)}`
              : 'Sincronize apÃ³s login para detalhar faturamento.'}
          </p>
        </div>

        <div className="aethel-card aethel-p-5 aethel-space-y-3">
          <p className="aethel-text-xs aethel-text-slate-500">Consumo mensal</p>
          <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-rose-300">
            {creditsUsedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
          </h3>
          <p className="aethel-text-xs aethel-text-slate-400">Inclui dÃ©bitos e transferÃªncias realizadas desde o inÃ­cio do mÃªs.</p>
        </div>

        <div className="aethel-card aethel-p-5 aethel-space-y-3">
          <p className="aethel-text-xs aethel-text-slate-500">RecebÃ­veis pendentes</p>
          <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-amber-300">
            {receivableSummary.pending.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
          </h3>
          <p className="aethel-text-xs aethel-text-slate-400">Baseado nos lanÃ§amentos com status pendente ou nÃ£o conciliado.</p>
        </div>
      </div>

      <div className="aethel-card aethel-p-6 aethel-space-y-4">
        <div className="aethel-flex aethel-justify-between aethel-items-center">
          <h3 className="aethel-text-lg aethel-font-semibold">Saldo &amp; RecebÃ­veis</h3>
          <span className="aethel-text-xs aethel-text-slate-500">Ãšltima atualizaÃ§Ã£o: {lastWalletUpdate ? new Date(lastWalletUpdate).toLocaleString() : 'â€”'}</span>
        </div>
        <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-4">
          <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
            <p className="aethel-text-xs aethel-text-slate-500">Recebido no mÃªs</p>
            <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
              {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
            </p>
          </div>
          <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
            <p className="aethel-text-xs aethel-text-slate-500">Gasto hoje</p>
            <p className="aethel-text-lg aethel-font-semibold aethel-text-rose-300">
              {creditsUsedToday.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
            </p>
          </div>
          <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
            <p className="aethel-text-xs aethel-text-slate-500">Total creditado</p>
            <p className="aethel-text-lg aethel-font-semibold aethel-text-blue-300">
              {receivableSummary.total.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
            </p>
          </div>
        </div>
        <div className="aethel-overflow-x-auto">
          <table className="aethel-min-w-full aethel-text-xs aethel-text-left">
            <thead>
              <tr className="aethel-text-slate-400">
                <th className="aethel-py-2 aethel-pr-4">ReferÃªncia</th>
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
                    Nenhum recebimento cadastrado neste perÃ­odo.
                  </td>
                </tr>
              )}
              {receivableSummary.recent.map((entry: any) => {
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
                      {entry.balance_after != null ? entry.balance_after.toLocaleString() : 'â€”'} {formatCurrencyLabel(entry.currency)}
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

      <div className="aethel-card aethel-p-6 aethel-space-y-4">
        <div className="aethel-flex aethel-items-center aethel-justify-between">
          <h3 className="aethel-text-lg aethel-font-semibold">Planos e assinatura</h3>
          <button
            type="button"
            onClick={handleManageSubscription}
            className="aethel-button aethel-button-ghost aethel-text-xs"
          >
            Gerenciar assinatura
          </button>
        </div>
        <BillingTab
          plans={billingPlansForUI}
          currentPlan={currentPlan?.id ?? ''}
          loading={!billingData && !billingError}
          onSelectPlan={handleSubscribe}
          onManageSubscription={handleManageSubscription}
          showHeader={false}
          showHighlights={false}
          showFaq={false}
          showCurrentPlanInfo={false}
        />
      </div>

      <div className="aethel-card aethel-p-6 aethel-space-y-3">
        <h3 className="aethel-text-lg aethel-font-semibold">GovernanÃ§a e conformidade</h3>
        <p className="aethel-text-sm aethel-text-slate-400">
          Todas as operaÃ§Ãµes de compra, transferÃªncia e recepÃ§Ã£o de crÃ©ditos seguem os Termos de Uso e polÃ­ticas de
          cobranÃ§a da plataforma Aethel. Certifique-se de compartilhar estes documentos com os times financeiro e
          jurÃ­dico antes de ativar automaÃ§Ãµes de faturamento.
        </p>
        <div className="aethel-flex aethel-flex-wrap aethel-gap-3">
          <Link href="/terms" className="aethel-button aethel-button-ghost aethel-text-xs">
            Termos de Uso
          </Link>
          <a href="mailto:billing@aethel.ai" className="aethel-button aethel-button-ghost aethel-text-xs">
            Contato financeiro
          </a>
        </div>
      </div>
    </div>
  )
}
