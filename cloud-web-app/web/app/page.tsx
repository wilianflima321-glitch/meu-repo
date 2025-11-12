import dynamic from 'next/dynamic'

const AethelDashboard = dynamic(() => import('../components/AethelDashboard'), { ssr: false })

export default function Page() {
  return <AethelDashboard />
}