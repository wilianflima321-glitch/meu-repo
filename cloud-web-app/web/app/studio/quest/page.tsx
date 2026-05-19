import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const QuestEditor = dynamic(() => import('@/components/narrative/QuestEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Quest Studio" />,
})

export default function QuestStudioPage() {
  return (
    <CreativeStudioShell
      title="Quest Studio"
      subtitle="Branching missions, objectives, rewards, prerequisites, and narrative evidence."
      activeHref="/studio/quest"
    >
      <QuestEditor />
    </CreativeStudioShell>
  )
}
