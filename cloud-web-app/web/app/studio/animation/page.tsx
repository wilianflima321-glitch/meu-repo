import { Suspense } from 'react'
import CharacterStudioClient from './CharacterStudioClient'

export default function CharacterStudioPage() {
  return (
    <Suspense fallback={null}>
      <CharacterStudioClient />
    </Suspense>
  )
}
