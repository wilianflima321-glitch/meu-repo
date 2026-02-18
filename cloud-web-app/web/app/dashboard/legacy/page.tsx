import dynamic from 'next/dynamic'

const AethelDashboard = dynamic(() => import('@/components/AethelDashboardGateway'), { ssr: false })

export const metadata = {
  title: 'Aethel Legacy Dashboard',
  description: 'Legacy dashboard surface kept for phased transition to Studio Home.',
}

export default function LegacyDashboardPage() {
  return <AethelDashboard />
}
