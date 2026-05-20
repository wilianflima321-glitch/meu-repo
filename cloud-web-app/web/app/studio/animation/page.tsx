import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const AnimationBlueprint = dynamic(() => import('@/components/engine/AnimationBlueprint'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Animation Studio" />,
})

export default function AnimationStudioPage() {
  return (
    <CreativeStudioShell
      title="Animation Studio"
      subtitle="Animation blueprint planning, transition logic, and motion review packets."
      activeHref="/studio/animation"
    >
      <Suspense fallback={<CreativeStudioLoading label="Animation Studio" />}>
        <AnimationBlueprint />
      </Suspense>
    </CreativeStudioShell>
  )
}
