'use client'

import React, { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { generateHairStrands } from './hair-fur-core'
import type {
  BrushSettings,
  BrushTool,
  ClumpingSettings,
  CurlSettings,
  GradientStop,
  HairRegion,
  PhysicsSettings,
} from './hair-fur-core'

interface HairStrands3DProps {
  strandCount: number
  regions: HairRegion[]
  clumping: ClumpingSettings
  curl: CurlSettings
  gradient: GradientStop[]
  physics: PhysicsSettings
  animatePhysics: boolean
}

export function HairStrands3D({
  strandCount,
  regions,
  clumping,
  curl,
  gradient,
  physics,
  animatePhysics,
}: HairStrands3DProps) {
  const linesRef = useRef<THREE.LineSegments>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    if (animatePhysics) {
      timeRef.current += delta
    }

    if (geometryRef.current) {
      const { positions, colors } = generateHairStrands(
        Math.min(strandCount, 10000),
        regions,
        clumping,
        curl,
        gradient,
        physics,
        timeRef.current,
      )

      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometryRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometryRef.current.attributes.position.needsUpdate = true
      geometryRef.current.attributes.color.needsUpdate = true
    }
  })

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial vertexColors transparent opacity={0.9} linewidth={1} />
    </lineSegments>
  )
}

export function HeadMesh() {
  return (
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#e8d5c4" roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

interface BrushPreviewProps {
  brush: BrushSettings
  active: boolean
}

export function BrushPreview({ brush, active }: BrushPreviewProps) {
  const { raycaster, camera, mouse } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3())

  useFrame(() => {
    if (!active || !meshRef.current) return

    raycaster.setFromCamera(mouse, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const intersection = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, intersection)

    if (intersection) {
      setPosition(intersection)
      meshRef.current.position.copy(intersection)
    }
  })

  if (!active) return null

  const brushColors: Record<BrushTool, string> = {
    comb: '#3b82f6',
    cut: '#ef4444',
    add: '#22c55e',
    length: '#f59e0b',
  }

  return (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[brush.size * 0.08, brush.size * 0.1, 32]} />
      <meshBasicMaterial color={brushColors[brush.tool]} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  )
}
