import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const SceneEditor = dynamic(() => import('@/components/scene-editor/SceneEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Scene Studio" />,
})

export default function SceneStudioPage() {
  return (
    <CreativeStudioShell
      title="Scene Studio"
      subtitle="Hierarchy, transform, lighting, camera, and scene graph review."
      activeHref="/studio/scene"
    >
      <SceneEditor />
    </CreativeStudioShell>
  )
}
