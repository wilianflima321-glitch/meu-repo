import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const FacialEditor = dynamic(() => import('@/components/character/FacialAnimationEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Facial Studio" />,
})

export default function FacialEditorPage() {
  return (
    <CreativeStudioShell
      title="Facial Studio"
      subtitle="Author FACS poses, visemes, emotion presets, and character review packets."
      activeHref="/studio/facial"
    >
      <Suspense fallback={<CreativeStudioLoading label="Facial Studio" />}>
        <FacialEditor characterId="studio-character" />
      </Suspense>
    </CreativeStudioShell>
  )
}
