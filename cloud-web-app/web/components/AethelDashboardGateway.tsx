'use client'

import AethelDashboard from './AethelDashboard'
import { GatewayProvider } from '@/hooks/useAethelGateway'

export default function AethelDashboardGateway() {
  return (
    <GatewayProvider>
      <AethelDashboard />
    </GatewayProvider>
  )
}