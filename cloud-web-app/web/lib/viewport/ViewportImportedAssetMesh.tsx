'use client'

// @aethel-heavy-async-boundary: mounted only through ViewportSceneObjectMesh when meshUrl is set.
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

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

function GltfHierarchyPrimitive({ url, isSelected }: { url: string; isSelected: boolean }) {
  const gltf = useGLTF(url)
  const object = useMemo(() => clonePreservingHierarchy(gltf.scene), [gltf.scene])

  useEffect(() => {
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
  }, [object, isSelected])

  return <primitive object={object} />
}

function ExternalHierarchyPrimitive({
  url,
  format,
  isSelected,
}: {
  url: string
  format: 'fbx' | 'obj'
  isSelected: boolean
}) {
  const [object, setObject] = useState<THREE.Object3D | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (format === 'fbx') {
          const loader = new FBXLoader()
          const group = await loader.loadAsync(url)
          if (!cancelled) setObject(clonePreservingHierarchy(group))
          return
        }
        const loader = new OBJLoader()
        const group = await loader.loadAsync(url)
        if (!cancelled) setObject(clonePreservingHierarchy(group))
      } catch (error) {
        log.error('Failed to load imported viewport asset', { format, error })
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [url, format])

  useEffect(() => {
    if (!object) return
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
  }, [object, isSelected])

  if (!object) {
    return (
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.4, 1, 1]} />
        <meshStandardMaterial color="rgb(56, 189, 248)" wireframe />
      </mesh>
    )
  }

  return <primitive object={object} />
}

function PlaceholderWhileLoading({ isSelected }: { isSelected: boolean }) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[1.4, 1, 1]} />
      <meshStandardMaterial
        color="rgb(56, 189, 248)"
        wireframe
        emissive={isSelected ? 0x2563eb : 0x000000}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
    </mesh>
  )
}

/**
 * Loads a dropped model into the viewport while preserving GLTF/FBX hierarchy
 * (meshes, materials, SkinnedMesh skeletons). USD/USDZ stay HELD — no fake mesh.
 */
export function ViewportImportedAssetMesh({ url, format, isSelected }: Props) {
  if (format === 'gltf' || format === 'glb') {
    return (
      <Suspense fallback={<PlaceholderWhileLoading isSelected={isSelected} />}>
        <GltfHierarchyPrimitive url={url} isSelected={isSelected} />
      </Suspense>
    )
  }

  if (format === 'fbx' || format === 'obj') {
    return <ExternalHierarchyPrimitive url={url} format={format} isSelected={isSelected} />
  }

  // USD / USDZ — no browser loader in this ship; honesty placeholder only.
  return <PlaceholderWhileLoading isSelected={isSelected} />
}
