'use client'

import AethelDashboardRuntime from './AethelDashboardRuntime'
import { GatewayProvider } from '@/hooks/useAethelGateway'

export default function DashboardPageClient() {
  return (
    <GatewayProvider>
      <AethelDashboardRuntime />
    </GatewayProvider>
  )
}
