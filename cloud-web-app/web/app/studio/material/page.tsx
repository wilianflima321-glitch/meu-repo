import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const MaterialEditor = dynamic(() => import('@/components/materials/MaterialEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Material Studio" />,
})

export default function MaterialStudioPage() {
  return (
    <CreativeStudioShell
      title="Material Studio"
      subtitle="PBR surfaces, texture decisions, and asset graph material evidence."
      activeHref="/studio/material"
    >
      <Suspense fallback={<CreativeStudioLoading label="Material Studio" />}>
        <MaterialEditor />
      </Suspense>
    </CreativeStudioShell>
  )
}
