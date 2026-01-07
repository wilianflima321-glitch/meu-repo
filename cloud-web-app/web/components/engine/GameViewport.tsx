'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';

// --- Physics Components (Updated to Rapier AAA) ---

function Ground() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#303030" transparent opacity={0.5} />
      </mesh>
    </RigidBody>
  );
}

function PhysicsBox({ position }: { position: [number, number, number] }) {
  // Rapier physics box
  return (
    <RigidBody position={position} colliders="cuboid" restitution={0.7}>
      <mesh castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="orange" />
      </mesh>
    </RigidBody>
  );
}

// --- Scene Manager ---

interface GameViewportProps {
  mode?: 'edit' | 'play';
}

export default function GameViewport({ mode = 'edit' }: GameViewportProps) {
  const [boxes, setBoxes] = useState<[number, number, number][]>([
    [0, 5, 0],
    [2, 8, 0],
    [-2, 10, 0]
  ]);

  // Reset physics when switching modes (simple way: remount)
  const [key, setKey] = useState(0);
  useEffect(() => {
    setKey(k => k + 1);
  }, [mode]);

  return (
    <div className="w-full h-full bg-slate-900 relative">
      {/* Toolbar Overlay */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="bg-slate-800/80 backdrop-blur p-2 rounded border border-slate-700 text-xs text-white">
          Mode: <span className="font-bold text-indigo-400 uppercase">{mode}</span>
        </div>
        <div className="bg-slate-800/80 backdrop-blur p-2 rounded border border-slate-700 text-xs text-green-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> 
          Rapier Physics v3
        </div>
        <button 
          onClick={() => setBoxes(prev => [...prev, [(Math.random() - 0.5) * 5, 10, (Math.random() - 0.5) * 5]])}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-bold transition"
        >
          Spawn Cube
        </button>
      </div>

      <Canvas key={key} shadows camera={{ position: [5, 5, 5], fov: 50 }}>
        <Suspense fallback={null}>
          {/* Environment */}
          <ambientLight intensity={0.5} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={1} 
            castShadow 
            shadow-mapSize={[1024, 1024]} 
          />
          <Environment preset="city" />
          
          {/* Editor Helpers */}
          {mode === 'edit' && <Grid infiniteGrid fadeDistance={50} sectionColor="#4f4f4f" cellColor="#303030" />}
          <OrbitControls makeDefault />

          {/* Physics World (Rapier) */}
          <Physics gravity={[0, -9.81, 0]}>
            <Ground />
            {boxes.map((pos, i) => (
              <PhysicsBox key={i} position={pos} />
            ))}
          </Physics>

        </Suspense>
      </Canvas>
    </div>
  );
}
