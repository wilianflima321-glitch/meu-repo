'use client'

import React, { useCallback, useMemo, useRef } from 'react'
import { Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import type { ClothConfig, ClothCollider, ClothSimulation } from '@/lib/cloth-simulation'

import type { ClothEditorState } from './cloth-editor-controls'
import type { ClothToolType } from './cloth-simulation-editor.types'

interface ClothMesh3DProps {
  simulation: ClothSimulation | null
  config: ClothConfig
  editorState: ClothEditorState
  onVertexClick: (index: number, shiftKey: boolean) => void
  selectedTool: ClothToolType
}

export function ClothMesh3D({
  simulation,
  config,
  editorState,
  onVertexClick,
  selectedTool,
}: ClothMesh3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)

  const { geometry, pointsGeometry, constraintGeometry } = useMemo(() => {
    if (!simulation) return { geometry: null, pointsGeometry: null, constraintGeometry: null }

    const segmentsX = config.segmentsX
    const segmentsY = config.segmentsY
    const particles = simulation.particles

    const geo = new THREE.BufferGeometry()
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (const p of particles) {
      positions.push(p.position.x, p.position.y, p.position.z)
      uvs.push(
        (p.index % (segmentsX + 1)) / segmentsX,
        Math.floor(p.index / (segmentsX + 1)) / segmentsY,
      )
    }

    for (let j = 0; j < segmentsY; j += 1) {
      for (let i = 0; i < segmentsX; i += 1) {
        const a = j * (segmentsX + 1) + i
        const b = a + 1
        const c = a + (segmentsX + 1)
        const d = c + 1

        indices.push(a, b, c)
        indices.push(b, d, c)
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    const pointsGeo = new THREE.BufferGeometry()
    const pointPositions: number[] = []
    const pointColors: number[] = []

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i]
      pointPositions.push(particle.position.x, particle.position.y, particle.position.z)

      if (editorState.pinnedVertices.has(i)) {
        pointColors.push(1, 0.3, 0.3)
      } else if (editorState.selectedVertices.has(i)) {
        pointColors.push(0.3, 0.8, 1)
      } else {
        pointColors.push(0.5, 0.5, 0.5)
      }
    }

    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3))
    pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3))

    const constraintGeo = new THREE.BufferGeometry()
    const linePositions: number[] = []
    const lineColors: number[] = []

    if (editorState.showConstraints) {
      for (const constraint of simulation.constraints) {
        if (constraint.broken) continue

        const p1 = particles[constraint.p1]
        const p2 = particles[constraint.p2]

        linePositions.push(p1.position.x, p1.position.y, p1.position.z)
        linePositions.push(p2.position.x, p2.position.y, p2.position.z)

        let color: [number, number, number]
        switch (constraint.type) {
          case 'structural':
            color = [0.2, 0.8, 0.2]
            break
          case 'shear':
            color = [0.8, 0.8, 0.2]
            break
          case 'bend':
            color = [0.2, 0.2, 0.8]
            break
          default:
            color = [0.5, 0.5, 0.5]
        }

        lineColors.push(...color, ...color)
      }
    }

    constraintGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    constraintGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3))

    return { geometry: geo, pointsGeometry: pointsGeo, constraintGeometry: constraintGeo }
  }, [simulation, config, editorState.selectedVertices, editorState.pinnedVertices, editorState.showConstraints])

  useFrame((_, delta) => {
    if (!simulation || !editorState.isSimulating) return

    simulation.update(Math.min(delta, 0.033))

    if (meshRef.current && geometry) {
      const positions = geometry.attributes.position.array as Float32Array
      for (let i = 0; i < simulation.particles.length; i += 1) {
        const p = simulation.particles[i]
        positions[i * 3] = p.position.x
        positions[i * 3 + 1] = p.position.y
        positions[i * 3 + 2] = p.position.z
      }
      geometry.attributes.position.needsUpdate = true
      geometry.computeVertexNormals()
    }

    if (pointsRef.current && pointsGeometry) {
      const positions = pointsGeometry.attributes.position.array as Float32Array
      for (let i = 0; i < simulation.particles.length; i += 1) {
        const p = simulation.particles[i]
        positions[i * 3] = p.position.x
        positions[i * 3 + 1] = p.position.y
        positions[i * 3 + 2] = p.position.z
      }
      pointsGeometry.attributes.position.needsUpdate = true
    }
  })

  const handlePointClick = useCallback(
    (event: THREE.Event) => {
      if (!simulation) return

      const intersection = (event as { intersections?: Array<{ index?: number }> }).intersections?.[0]
      if (intersection && intersection.index !== undefined) {
        onVertexClick(intersection.index, (event as { shiftKey?: boolean }).shiftKey || false)
      }
    },
    [simulation, onVertexClick],
  )

  if (!geometry || !pointsGeometry) return null

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color="#4a90d9"
          side={THREE.DoubleSide}
          wireframe={editorState.showWireframe}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      <points ref={pointsRef} geometry={pointsGeometry} onClick={handlePointClick}>
        <pointsMaterial size={selectedTool === 'pin' || selectedTool === 'unpin' ? 12 : 6} vertexColors sizeAttenuation={false} />
      </points>

      {editorState.showConstraints && constraintGeometry && (
        <lineSegments ref={linesRef} geometry={constraintGeometry}>
          <lineBasicMaterial vertexColors transparent opacity={0.5} />
        </lineSegments>
      )}
    </group>
  )
}

interface ColliderVisualizerProps {
  colliders: ClothCollider[]
  showColliders: boolean
  onColliderSelect: (index: number) => void
  selectedCollider: number | null
}

export function ColliderVisualizer({
  colliders,
  showColliders,
  onColliderSelect,
  selectedCollider,
}: ColliderVisualizerProps) {
  if (!showColliders) return null

  return (
    <group>
      {colliders.map((collider, index) => {
        const isSelected = selectedCollider === index
        const color = isSelected ? '#ffaa00' : '#00aaff'

        switch (collider.type) {
          case 'sphere':
            return (
              <mesh key={index} position={collider.position} onClick={() => onColliderSelect(index)}>
                <sphereGeometry args={[collider.radius || 1, 16, 16]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
              </mesh>
            )

          case 'plane':
            return (
              <mesh
                key={index}
                position={collider.position}
                rotation={new THREE.Euler().setFromQuaternion(
                  new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    collider.normal || new THREE.Vector3(0, 1, 0),
                  ),
                )}
                onClick={() => onColliderSelect(index)}
              >
                <planeGeometry args={[10, 10]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.3} />
              </mesh>
            )

          case 'box':
            return (
              <mesh key={index} position={collider.position} onClick={() => onColliderSelect(index)}>
                <boxGeometry args={[collider.size?.x || 1, collider.size?.y || 1, collider.size?.z || 1]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
              </mesh>
            )

          default:
            return null
        }
      })}
    </group>
  )
}

interface WindArrowProps {
  direction: { x: number; y: number; z: number }
  strength: number
  visible: boolean
}

export function WindArrow({ direction, strength, visible }: WindArrowProps) {
  if (!visible || strength === 0) return null

  const length = strength * 2
  const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize()
  const end = dir.clone().multiplyScalar(length)

  return (
    <group position={[0, 3, 0]}>
      <Line points={[[0, 0, 0], end.toArray()]} color="#00ff88" lineWidth={3} />
      <mesh position={end}>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      <Html position={end.clone().add(new THREE.Vector3(0.3, 0.3, 0))}>
        <div className="text-xs text-green-400 whitespace-nowrap bg-slate-900/80 px-1 rounded">Wind: {strength.toFixed(1)}</div>
      </Html>
    </group>
  )
}
