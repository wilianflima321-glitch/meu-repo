'use client'

import { PaymentsFilters } from './_components/PaymentsFilters'
import { PaymentsGatewayCard } from './_components/PaymentsGatewayCard'
import { PaymentsHeader } from './_components/PaymentsHeader'
import { PaymentsRuntimeCard } from './_components/PaymentsRuntimeCard'
import { PaymentsSummary } from './_components/PaymentsSummary'
import { PaymentsTable } from './_components/PaymentsTable'
import { usePaymentsPageState } from './_components/use-payments-page-state'

export default function Payments() {
  const payments = usePaymentsPageState()

  return (
    <div className="mx-auto max-w-6xl p-6">
      <PaymentsHeader lastUpdated={payments.lastUpdated} onRefresh={payments.fetchPayments} />
      {payments.error && <div className="mb-4 rounded border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-3 py-2 text-sm text-[var(--aethel-error)]">{payments.error}</div>}
      <PaymentsGatewayCard gateway={payments.gateway} onChange={payments.setGateway} onSave={payments.saveGateway} savingGateway={payments.savingGateway} />
      <PaymentsRuntimeCard runtime={payments.billingRuntime} />
      <PaymentsSummary totals={payments.totals} />
      <PaymentsFilters search={payments.search} statusFilter={payments.statusFilter} onSearchChange={payments.setSearch} onStatusChange={payments.setStatusFilter} />
      <PaymentsTable items={payments.filteredItems} loading={payments.loading} />
    </div>
  )
}
