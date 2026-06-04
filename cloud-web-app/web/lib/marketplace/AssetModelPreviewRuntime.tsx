'use client'

// @aethel-heavy-async-boundary
import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html as DreiHtml, OrbitControls, Stage, useGLTF, useProgress } from '@react-three/drei'
import { Loader2, Pause, Play } from 'lucide-react'
import * as THREE from 'three'

import { Button } from '@/components/ui/Button'

function Loader() {
  const { progress } = useProgress()
  return (
    <DreiHtml center>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Loading {progress.toFixed(0)}%
        </span>
      </div>
    </DreiHtml>
  )
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 2 / maxDim
    scene.scale.setScalar(scale)

    const center = box.getCenter(new THREE.Vector3())
    scene.position.sub(center.multiplyScalar(scale))
  }, [scene])

  return <primitive ref={ref} object={scene} />
}

export default function AssetModelPreview({ modelUrl }: { modelUrl: string }) {
  const [autoRotate, setAutoRotate] = useState(true)

  return (
    <div className="relative min-h-[400px] h-full w-full overflow-hidden rounded-lg bg-gradient-to-b from-[var(--aethel-surface-primary)] to-[var(--aethel-surface-secondary)]">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} shadows>
        <Suspense fallback={<Loader />}>
          <Stage environment="city" intensity={0.5}>
            <Model url={modelUrl} />
          </Stage>
          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={2}
            enablePan={false}
            minDistance={2}
            maxDistance={10}
          />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-4 right-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setAutoRotate(!autoRotate)}
        >
          {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
