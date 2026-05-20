import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const ClothEditor = dynamic(() => import('@/components/physics/ClothSimulationEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Cloth Studio" />,
})

export default function ClothEditorPage() {
  return (
    <CreativeStudioShell
      title="Cloth Studio"
      subtitle="Simulate garments, cloth constraints, wind, collisions, and export evidence."
      activeHref="/studio/cloth"
    >
      <Suspense fallback={<CreativeStudioLoading label="Cloth Studio" />}>
        <ClothEditor meshId="studio-cloth" />
      </Suspense>
    </CreativeStudioShell>
  )
}
