import { Suspense } from 'react'
import VfxStudioClient from './VfxStudioClient'

export default function FxStudioPage() {
  return (
    <Suspense fallback={null}>
      <VfxStudioClient />
    </Suspense>
  )
}
