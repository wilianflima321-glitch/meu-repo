import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const RigEditor = dynamic(() => import('@/components/character/ControlRigEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Rig Studio" />,
})

export default function RigEditorPage() {
  return (
    <CreativeStudioShell
      title="Control Rig Studio"
      subtitle="Build IK/FK chains, procedural controls, constraints, and rig review packets."
      activeHref="/studio/rig"
    >
      <Suspense fallback={<CreativeStudioLoading label="Rig Studio" />}>
        <RigEditor characterId="studio-character" />
      </Suspense>
    </CreativeStudioShell>
  )
}
