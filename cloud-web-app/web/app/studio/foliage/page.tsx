import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const FoliageEditor = dynamic(() => import('@/components/environment/FoliagePainter'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Foliage Studio" />,
})

export default function FoliageEditorPage() {
  return (
    <CreativeStudioShell
      title="Foliage Studio"
      subtitle="Paint procedural vegetation, instancing rules, density, and world-detail evidence."
      activeHref="/studio/foliage"
    >
      <FoliageEditor sceneId="studio-scene" />
    </CreativeStudioShell>
  )
}
