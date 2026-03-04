import dynamic from 'next/dynamic'

const AethelDashboard = dynamic(() => import('../../components/AethelDashboardGateway'), {
  ssr: false,
  loading: () => (
    <div className="aethel-min-h-screen aethel-flex aethel-items-center aethel-justify-center aethel-bg-slate-950 aethel-text-slate-50">
      <div className="aethel-state aethel-state-loading aethel-text-sm" role="status" aria-live="polite">
        Carregando Studio Home...
      </div>
    </div>
  ),
})

export const metadata = {
  title: 'Aethel IDE Dashboard',
  description: 'Interface completa da IDE Aethel com chat, projetos, billing e conectividade.',
}

export default function DashboardPage() {
  return <AethelDashboard />
}
