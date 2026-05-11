import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const LevelEditor = dynamic(() => import('@/components/engine/LevelEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Level Studio" />,
})

export default function LevelStudioPage() {
  return (
    <CreativeStudioShell
      title="Level Studio"
      subtitle="Playable worlds, spatial layout, mission structure, and world evidence."
      activeHref="/studio/level"
    >
      <LevelEditor />
    </CreativeStudioShell>
  )
}
