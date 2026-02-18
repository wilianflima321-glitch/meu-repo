import dynamic from 'next/dynamic'

const AethelDashboard = dynamic(() => import('../../components/AethelDashboardGateway'), { ssr: false })
const StudioHome = dynamic(() => import('../../components/studio/StudioHome'), { ssr: false })

export const metadata = {
  title: 'Aethel Studio Home',
  description: 'Chat/preview-first mission control with deterministic execution and full IDE handoff.',
}

type DashboardPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const legacyFlag = searchParams?.legacy
  const legacyMode = Array.isArray(legacyFlag) ? legacyFlag.includes('1') : legacyFlag === '1'

  if (legacyMode) return <AethelDashboard />
  return <StudioHome />
}
