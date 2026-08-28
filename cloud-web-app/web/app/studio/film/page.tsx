import { Suspense } from 'react'
import FilmStudioClient from './FilmStudioClient'

export default function FilmStudioPage() {
  return (
    <Suspense fallback={null}>
      <FilmStudioClient />
    </Suspense>
  )
}
