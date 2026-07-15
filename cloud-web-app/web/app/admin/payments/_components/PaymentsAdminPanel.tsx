'use client'

import { PaymentsFilters } from './PaymentsFilters'
import { PaymentsGatewayCard } from './PaymentsGatewayCard'
import { PaymentsHeader } from './PaymentsHeader'
import { PaymentsRuntimeCard } from './PaymentsRuntimeCard'
import { PaymentsSummary } from './PaymentsSummary'
import { PaymentsTable } from './PaymentsTable'
import { usePaymentsPageState } from './use-payments-page-state'

export function PaymentsAdminPanel() {
  const payments = usePaymentsPageState()

  return (
    <section className="space-y-4">
      <PaymentsHeader lastUpdated={payments.lastUpdated} onRefresh={payments.fetchPayments} />
      {payments.error && (
        <div className="rounded border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-3 py-2 text-sm text-[var(--aethel-error)]">
          {payments.error}
        </div>
      )}
      <PaymentsGatewayCard gateway={payments.gateway} onChange={payments.setGateway} onSave={payments.saveGateway} savingGateway={payments.savingGateway} />
      <PaymentsRuntimeCard runtime={payments.billingRuntime} />
      <PaymentsSummary totals={payments.totals} />
      <PaymentsFilters search={payments.search} statusFilter={payments.statusFilter} onSearchChange={payments.setSearch} onStatusChange={payments.setStatusFilter} />
      <PaymentsTable items={payments.filteredItems} loading={payments.loading} />
    </section>
  )
}
