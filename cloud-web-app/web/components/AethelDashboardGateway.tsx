'use client'

import { useRouter } from 'next/navigation'
import AethelDashboard from './AethelDashboard'
import { GatewayProvider } from '@/hooks/useAethelGateway'

export default function AethelDashboardGateway() {
  const router = useRouter()

  return (
    <GatewayProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-[1600px] px-4 py-3">
          <div className="mb-3 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Legacy dashboard mode enabled for phased cutover. Studio Home is the primary entry surface.
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="ml-3 rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20"
            >
              Back to Studio Home
            </button>
          </div>
        </div>
        <AethelDashboard />
      </div>
    </GatewayProvider>
  )
}
