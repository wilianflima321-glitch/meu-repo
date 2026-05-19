import { AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid'
import type { PaymentTotals } from './payments-types'

export function PaymentsSummary({ totals }: { totals: PaymentTotals }) {
  return (
    <AdminSummaryGrid
      className="mb-6"
      columns={4}
      items={[
        { icon: DollarSign, label: 'Total', value: totals.total.toFixed(2), valuePrefix: 'US$', tone: 'info' },
        { icon: CheckCircle, label: 'Succeeded', value: totals.succeeded.toFixed(2), valuePrefix: 'US$', tone: 'success' },
        { icon: Clock, label: 'Pending', value: totals.pending.toFixed(2), valuePrefix: 'US$', tone: 'warning' },
        { icon: AlertTriangle, label: 'Failed', value: totals.failed.toFixed(2), valuePrefix: 'US$', tone: 'error' },
      ]}
    />
  )
}
