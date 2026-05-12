import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const SpriteEditor = dynamic(() => import('@/components/editors/SpriteEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Sprite Studio" />,
})

export default function SpriteEditorPage() {
  return (
    <CreativeStudioShell
      title="Sprite Studio"
      subtitle="Edit 2D sprites, animation frames, pixel passes, and lightweight game assets."
      activeHref="/studio/sprite"
    >
      <SpriteEditor />
    </CreativeStudioShell>
  )
}
