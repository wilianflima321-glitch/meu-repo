import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const FluidEditor = dynamic(() => import('@/components/physics/FluidSimulationEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Fluid Studio" />,
})

export default function FluidEditorPage() {
  return (
    <CreativeStudioShell
      title="Fluid Studio"
      subtitle="Prototype liquids, SPH particles, volumes, and simulation evidence."
      activeHref="/studio/fluid"
    >
      <Suspense fallback={<CreativeStudioLoading label="Fluid Studio" />}>
        <FluidEditor volumeId="studio-fluid" />
      </Suspense>
    </CreativeStudioShell>
  )
}
