'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Float } from '@react-three/drei'
import { useRef, Suspense } from 'react'
import * as THREE from 'three'

function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial 
          color="#4f46e5" 
          metalness={0.7}
          roughness={0.2}
          emissive="#3730a3"
          emissiveIntensity={0.2}
        />
      </mesh>
    </Float>
  )
}

function GridFloor() {
  return (
    <gridHelper 
      args={[20, 20, '#374151', '#1f2937']} 
      position={[0, -2, 0]} 
    />
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      <spotLight 
        position={[5, 5, 5]} 
        angle={0.3} 
        penumbra={1} 
        intensity={1}
        castShadow
      />
      
      <RotatingCube />
      <GridFloor />
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
      
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        minDistance={3}
        maxDistance={15}
      />
    </>
  )
}

export default function SimpleMini3DPreview() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 to-slate-900">
      <Canvas
        shadows
        camera={{ position: [4, 3, 4], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      
      {/* Overlay com informações */}
      <div className="absolute bottom-2 left-2 text-xs text-slate-500 pointer-events-none">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Preview Ativo
        </div>
      </div>
      
      <div className="absolute top-2 right-2 text-xs text-slate-600 pointer-events-none">
        Use o mouse para rotacionar
      </div>
    </div>
  )
}
