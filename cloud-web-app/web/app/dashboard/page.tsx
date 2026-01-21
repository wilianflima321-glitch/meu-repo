import dynamic from 'next/dynamic'

const AethelDashboard = dynamic(() => import('../../components/AethelDashboardGateway'), { ssr: false })

export const metadata = {
  title: 'Aethel IDE Dashboard',
  description: 'Interface completa da IDE Aethel com chat, projetos, billing e conectividade.',
}

export default function DashboardPage() {
  return <AethelDashboard />
}
