import { tokenColor } from '@/lib/design-system/DesignTokenSync'
'use client'

// @aethel-heavy-async-boundary: mounted only through ViewportSceneObjectMesh when meshUrl is set.
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { USDZLoader } from 'three/examples/jsm/loaders/USDZLoader.js'

import type { ViewportAssetImportFormat } from '@/lib/viewport/viewport-asset-import'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('ViewportImportedAssetMesh')

type Props = {
  url: string
  format: ViewportAssetImportFormat
  isSelected: boolean
}

function clonePreservingHierarchy(root: THREE.Object3D): THREE.Object3D {
  // Clone keeps SkinnedMesh skeleton bindings and AnimationMixer-ready hierarchy.
  return root.clone(true)
}

function applySelectionEmissive(object: THREE.Object3D, isSelected: boolean) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    if (isSelected && mesh.material && !Array.isArray(mesh.material)) {
      const mat = mesh.material as THREE.MeshStandardMaterial
      if ('emissiveIntensity' in mat) {
        mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 0.25)
      }
    }
  })
}

function GltfHierarchyPrimitive({ url, isSelected }: { url: string; isSelected: boolean }) {
  const gltf = useGLTF(url)
  const object = useMemo(() => clonePreservingHierarchy(gltf.scene), [gltf.scene])

  useEffect(() => {
    applySelectionEmissive(object, isSelected)
  }, [object, isSelected])

  return <primitive object={object} />
}

function ExternalHierarchyPrimitive({
  url,
  format,
  isSelected,
}: {
  url: string
  format: 'fbx' | 'obj' | 'usdz'
  isSelected: boolean
}) {
  const [object, setObject] = useState<THREE.Object3D | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setObject(null)
    setFailed(false)
    const load = async () => {
      try {
        if (format === 'fbx') {
          const loader = new FBXLoader()
          const group = await loader.loadAsync(url)
          if (!cancelled) setObject(clonePreservingHierarchy(group))
          return
        }
        if (format === 'obj') {
          const loader = new OBJLoader()
          const group = await loader.loadAsync(url)
          if (!cancelled) setObject(clonePreservingHierarchy(group))
          return
        }
        // USDZ — real Three.js loader (USDA-in-ZIP). Crate/USDC inside zip fails closed.
        const loader = new USDZLoader()
        const group = await loader.loadAsync(url)
        if (!cancelled) setObject(clonePreservingHierarchy(group))
      } catch (error) {
        log.error('Failed to load imported viewport asset', { format, error })
        if (!cancelled) {
          setFailed(true)
          setObject(null)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [url, format])

  useEffect(() => {
    if (!object) return
    applySelectionEmissive(object, isSelected)
  }, [object, isSelected])

  if (!object) {
    return <HonestyWireframePlaceholder isSelected={isSelected} failed={failed} />
  }

  return <primitive object={object} />
}

function HonestyWireframePlaceholder({
  isSelected,
  failed = false,
}: {
  isSelected: boolean
  failed?: boolean
}) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[1.4, 1, 1]} />
      <meshStandardMaterial
        color={tokenColor("--aethel-info")}
        wireframe
        transparent={failed}
        opacity={failed ? 0.55 : 1}
        emissive={isSelected ? 0x2563eb : 0x000000}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
    </mesh>
  )
}

/**
 * Loads a dropped model into the viewport while preserving hierarchy.
 * USDZ = real Three.js USDZLoader preview. USDA / .usd never claim a live mesh here.
 */
export function ViewportImportedAssetMesh({ url, format, isSelected }: Props) {
  if (format === 'gltf' || format === 'glb') {
    return (
      <Suspense fallback={<HonestyWireframePlaceholder isSelected={isSelected} />}>
        <GltfHierarchyPrimitive url={url} isSelected={isSelected} />
      </Suspense>
    )
  }

  if (format === 'fbx' || format === 'obj' || format === 'usdz') {
    return <ExternalHierarchyPrimitive url={url} format={format} isSelected={isSelected} />
  }

  // USDA / .usd — no browser loader; honesty wireframe only (never solid capsule/sphere theater).
  return <HonestyWireframePlaceholder isSelected={isSelected} failed />
}
