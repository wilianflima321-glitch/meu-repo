'use client'

/**
 * Letter bf — InstancedMesh viewport for durable terrain foliage (shared by live layer).
 * Empty-honest: renders nothing when instances.length === 0.
 */

import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { FoliageCategory, FoliageInstanceRecord, FoliageTypeMeta } from '@/lib/production/terrain-foliage-math'

function geometryForCategory(category: FoliageCategory): THREE.BufferGeometry {
  switch (category) {
    case 'tree':
      return new THREE.ConeGeometry(0.5, 2, 8)
    case 'bush':
      return new THREE.SphereGeometry(0.4, 8, 8)
    case 'grass':
      return new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4)
    case 'flower':
      return new THREE.SphereGeometry(0.1, 8, 8)
    case 'rock':
      return new THREE.DodecahedronGeometry(0.3)
    default:
      return new THREE.ConeGeometry(0.5, 2, 8)
  }
}

function TypeMesh({
  type,
  instances,
}: {
  type: FoliageTypeMeta
  instances: FoliageInstanceRecord[]
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => geometryForCategory(type.category), [type.category])
  const yLift = type.category === 'tree' ? 1 : type.category === 'grass' ? 0.15 : 0.2

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]!
      dummy.position.set(inst.x, inst.y + yLift, inst.z)
      dummy.rotation.set(0, inst.rotY, 0)
      dummy.scale.set(inst.scale, inst.scale, inst.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.count = instances.length
    mesh.instanceMatrix.needsUpdate = true
  }, [instances, yLift])

  if (!instances.length) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, Math.max(instances.length, 1)]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <meshStandardMaterial color={type.color} />
    </instancedMesh>
  )
}

export function TerrainFoliageLiveInstances({
  instances,
  types,
}: {
  instances: FoliageInstanceRecord[]
  types: FoliageTypeMeta[]
}) {
  const byType = useMemo(() => {
    const grouped: Record<string, FoliageInstanceRecord[]> = {}
    for (const inst of instances) {
      if (!grouped[inst.typeId]) grouped[inst.typeId] = []
      grouped[inst.typeId]!.push(inst)
    }
    return grouped
  }, [instances])

  if (!instances.length) return null

  return (
    <group name="aethel-terrain-foliage-live">
      {Object.entries(byType).map(([typeId, typeInstances]) => {
        const foliageType = types.find((t) => t.id === typeId)
        if (!foliageType || !typeInstances.length) return null
        return <TypeMesh key={typeId} type={foliageType} instances={typeInstances} />
      })}
    </group>
  )
}
