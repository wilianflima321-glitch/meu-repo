import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'

const AethelDashboard = dynamic(() => import('@/components/AethelDashboardGateway'), { ssr: false })

export const metadata = {
  title: 'Aethel Legacy Dashboard',
  description: 'Legacy dashboard surface kept for phased transition to Studio Home.',
}

export default function LegacyDashboardPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_LEGACY_DASHBOARD !== 'true') {
    redirect('/dashboard')
  }
  return <AethelDashboard />
}
