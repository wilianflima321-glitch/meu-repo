import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const NiagaraVFX = dynamic(() => import('@/components/engine/NiagaraVFX'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="VFX Studio" />,
})

export default function VfxStudioPage() {
  return (
    <CreativeStudioShell
      title="VFX Studio"
      subtitle="Particles, combat readability, cinematic cues, and effect evidence."
      activeHref="/studio/vfx"
    >
      <Suspense fallback={<CreativeStudioLoading label="VFX Studio" />}>
        <NiagaraVFX />
      </Suspense>
    </CreativeStudioShell>
  )
}
