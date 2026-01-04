'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, useGLTF, TransformControls } from '@react-three/drei';
import { Physics, useBox, usePlane } from '@react-three/cannon';

// --- Physics Components ---

function Ground() {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, -0.5, 0] }));
  return (
    <mesh ref={ref as any} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#303030" transparent opacity={0.5} />
    </mesh>
  );
}

function PhysicsBox({ position }: { position: [number, number, number] }) {
  const [ref] = useBox(() => ({ mass: 1, position }));
  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color="orange" />
    </mesh>
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

          {/* Physics World */}
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
