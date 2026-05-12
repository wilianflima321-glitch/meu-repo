import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const TerrainEditor = dynamic(() => import('@/components/terrain/TerrainSculptingEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Terrain Studio" />,
})

export default function TerrainEditorPage() {
  return (
    <CreativeStudioShell
      title="Terrain Studio"
      subtitle="Sculpt heightmaps, biomes, erosion passes, and terrain evidence."
      activeHref="/studio/terrain"
    >
      <TerrainEditor />
    </CreativeStudioShell>
  )
}
