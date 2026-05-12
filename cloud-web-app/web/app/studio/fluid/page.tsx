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
      <FluidEditor volumeId="studio-fluid" />
    </CreativeStudioShell>
  )
}
