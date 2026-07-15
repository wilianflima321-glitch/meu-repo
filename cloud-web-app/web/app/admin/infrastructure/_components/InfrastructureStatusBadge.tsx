import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'

import type { ServiceHealth } from './infrastructure-types'

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle, label: 'Healthy', variant: 'success' as const },
  degraded: { icon: AlertTriangle, label: 'Degraded', variant: 'warning' as const },
  down: { icon: XCircle, label: 'Down', variant: 'error' as const },
} satisfies Record<ServiceHealth['status'], { icon: typeof CheckCircle; label: string; variant: 'success' | 'warning' | 'error' }>

export function InfrastructureStatusBadge({ status }: { status: ServiceHealth['status'] }) {
  const { icon: Icon, label, variant } = STATUS_CONFIG[status]

  return (
    <Badge variant={variant} size="sm" icon={<Icon className="h-3.5 w-3.5" />} className="px-2 py-1 text-xs capitalize">
      {label}
    </Badge>
  )
}
