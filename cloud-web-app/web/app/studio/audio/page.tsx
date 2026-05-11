import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const SoundCueEditor = dynamic(() => import('@/components/audio/SoundCueEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Audio Studio" />,
})

export default function AudioStudioPage() {
  return (
    <CreativeStudioShell
      title="Audio Studio"
      subtitle="Sound cues, audio layers, parameter automation, and review evidence."
      activeHref="/studio/audio"
    >
      <SoundCueEditor />
    </CreativeStudioShell>
  )
}
