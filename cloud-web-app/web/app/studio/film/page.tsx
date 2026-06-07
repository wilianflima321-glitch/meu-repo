import { Suspense } from 'react'
import FilmStudioClient from './FilmStudioClient'

export default function FilmStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[420px] items-center justify-center bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-tertiary)]">
          Loading Film Studio...
        </div>
      }
    >
      <FilmStudioClient />
    </Suspense>
  )
}
