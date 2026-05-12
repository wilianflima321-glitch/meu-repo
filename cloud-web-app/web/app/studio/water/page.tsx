import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const WaterEditor = dynamic(() => import('@/components/environment/WaterEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Water Studio" />,
})

export default function WaterEditorPage() {
  return (
    <CreativeStudioShell
      title="Water Studio"
      subtitle="Create oceans, rivers, foam, flow maps, buoyancy, and water-system evidence."
      activeHref="/studio/water"
    >
      <WaterEditor sceneId="studio-scene" />
    </CreativeStudioShell>
  )
}
