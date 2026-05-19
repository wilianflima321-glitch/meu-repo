import { BadgePercent, CheckCircle, XCircle } from 'lucide-react'
import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid'

export function PromotionsSummary({ summary }: { summary: { total: number; active: number; inactive: number } }) {
  return (
    <AdminSummaryGrid
      className="mb-6"
      columns={3}
      items={[
        { icon: BadgePercent, label: 'Total', value: summary.total },
        { icon: CheckCircle, label: 'Active', value: summary.active, tone: 'success' },
        { icon: XCircle, label: 'Inactive', value: summary.inactive, tone: 'warning' },
      ]}
    />
  )
}
