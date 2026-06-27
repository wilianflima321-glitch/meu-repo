import { Suspense } from 'react'
import WorldStudioClient from './WorldStudioClient'

export default function WorldStudioPage() {
  return (
    <Suspense fallback={null}>
      <WorldStudioClient />
    </Suspense>
  )
}
