'use client'

// Phase 4 (AAA Studio Deepening Sweep) — Director Mode previously showed only
// numeric camera/light readouts driven by an internal mock target that was
// never rendered anywhere (Anti-Mock: "engine sequencer shoot" copy with no
// visible shoot). This mounts a real R3F Canvas with a real PerspectiveCamera
// and DirectionalLight and hands those live Three.js objects up so the
// Sequencer transport (`SequencerIdePanel`) can drive them directly via
// `applySequencerSnapshotToViewport` — the same duck-typed contract the
// canonical viewport camera/lights already satisfy, just proven visually here
// instead of only through numbers.

import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type * as THREE from 'three'
import type { SequencerCameraTarget, SequencerLightTarget } from '@/lib/sequencer/sequencer-viewport-wire'

function DirectorCameraLightBridge({
  onReady,
}: {
  onReady: (targets: { camera: SequencerCameraTarget; light: SequencerLightTarget }) => void
}) {
  const { camera } = useThree()
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const reportedRef = useRef(false)

  useEffect(() => {
    if (reportedRef.current || !lightRef.current) return
    reportedRef.current = true
    lightRef.current.userData.sequencerLightId = 'trk-light'
    onReady({
      camera: camera as THREE.PerspectiveCamera,
      light: lightRef.current,
    })
  }, [camera, onReady])

  return <directionalLight ref={lightRef} position={[3, 4, 2]} intensity={1} castShadow />
}

export function DirectorModePreviewStage({
  onTargetsReady,
}: {
  onTargetsReady: (targets: { camera: SequencerCameraTarget; light: SequencerLightTarget }) => void
}) {
  return (
    <div className="relative h-full w-full bg-[var(--aethel-bg-base)]" data-director-preview-stage="true">
      <Canvas camera={{ position: [0, 1.6, 6], fov: 50 }} dpr={[1, 1.5]} shadows>
        <color attach="background" args={[0x05070c]} />
        <ambientLight intensity={0.35} />
        <DirectorCameraLightBridge onReady={onTargetsReady} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color={0x11182a} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[1, 1.2, 1]} />
          <meshStandardMaterial color={0x7dd3fc} metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[-1.8, 0.5, -1]} castShadow>
          <coneGeometry args={[0.5, 1, 24]} />
          <meshStandardMaterial color={0xf59e0b} metalness={0.2} roughness={0.5} />
        </mesh>
      </Canvas>
      <span className="pointer-events-none absolute left-2 top-2 rounded bg-[var(--aethel-editor-diff-pill-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
        Previz — engine shoot (final footage held)
      </span>
    </div>
  )
}
