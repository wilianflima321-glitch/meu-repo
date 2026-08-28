import { Suspense } from 'react'
import QuestStudioClient from './QuestStudioClient'

export default function QuestStudioPage() {
  return (
    <Suspense fallback={null}>
      <QuestStudioClient />
    </Suspense>
  )
}
