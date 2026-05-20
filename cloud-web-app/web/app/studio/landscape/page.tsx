import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const LandscapeEditor = dynamic(() => import('@/components/engine/LandscapeEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Landscape Studio" />,
})

export default function LandscapeEditorPage() {
  return (
    <CreativeStudioShell
      title="Landscape Studio"
      subtitle="Shape open-world terrain, paint layers, and coordinate foliage systems."
      activeHref="/studio/landscape"
    >
      <Suspense fallback={<CreativeStudioLoading label="Landscape Studio" />}>
        <LandscapeEditor />
      </Suspense>
    </CreativeStudioShell>
  )
}
