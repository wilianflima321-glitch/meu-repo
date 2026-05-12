import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const HairEditor = dynamic(() => import('@/components/character/HairFurEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Hair Studio" />,
})

export default function HairEditorPage() {
  return (
    <CreativeStudioShell
      title="Hair & Fur Studio"
      subtitle="Design groom regions, strand physics, LODs, and character hair evidence."
      activeHref="/studio/hair"
    >
      <HairEditor characterId="studio-character" />
    </CreativeStudioShell>
  )
}
