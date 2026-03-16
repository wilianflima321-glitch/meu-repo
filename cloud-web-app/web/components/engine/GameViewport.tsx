'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { resolveCssVarColor } from '@/lib/style/resolve-css-var';

// Rapier physics é opcional - usar fallback quando não disponível
let Physics: React.ComponentType<any> | null = null;
let RigidBody: React.ComponentType<any> | null = null;
let rapierLoaded = false;

// Tenta carregar rapier dinamicamente
async function loadRapier() {
  if (rapierLoaded) return;
  rapierLoaded = true;
  
  if (typeof window !== 'undefined') {
    try {
      // Usa eval para evitar que webpack tente bundlar o módulo
      const mod = await eval('import("@react-three/rapier")');
      Physics = mod.Physics;
      RigidBody = mod.RigidBody;
    } catch {
      // Rapier não instalado - usar fallback sem física
      console.log('[GameViewport] @react-three/rapier not available, using fallback');
    }
  }
}

// Inicia o carregamento
loadRapier();

// --- Physics Components (with fallback) ---

function Ground({ color }: { color: string }) {
  if (RigidBody) {
    const RB = RigidBody;
    return (
      <RB type="fixed" colliders="cuboid">
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color={color} transparent opacity={0.5} />
        </mesh>
      </RB>
    );
  }
  // Fallback sem física
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

function PhysicsBox({ position, color }: { position: [number, number, number]; color: string }) {
  if (RigidBody) {
    const RB = RigidBody;
    return (
      <RB position={position} colliders="cuboid" restitution={0.7}>
        <mesh castShadow receiveShadow>
          <boxGeometry />
          <meshStandardMaterial color={color} />
        </mesh>
      </RB>
    );
  }
  // Fallback sem física
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry />
      <meshStandardMaterial color={color} />
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
  const groundColor = useMemo(() => resolveCssVarColor('--aethel-surface-tertiary', '#303030'), []);
  const boxColor = useMemo(() => resolveCssVarColor('--aethel-warning', '#f59e0b'), []);
  const gridCellColor = useMemo(() => resolveCssVarColor('--aethel-border-primary', '#303030'), []);
  const gridSectionColor = useMemo(() => resolveCssVarColor('--aethel-border-secondary', '#4f4f4f'), []);

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
          Mode: <span className="font-bold text-sky-400 uppercase">{mode}</span>
        </div>
        <div className="bg-slate-800/80 backdrop-blur p-2 rounded border border-slate-700 text-xs text-green-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> 
          {Physics ? 'Rapier Physics v3' : 'No Physics (Rapier not installed)'}
        </div>
        <button 
          onClick={() => setBoxes(prev => [...prev, [(Math.random() - 0.5) * 5, 10, (Math.random() - 0.5) * 5]])}
          className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded text-xs font-bold transition"
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
          {mode === 'edit' && <Grid infiniteGrid fadeDistance={50} sectionColor={gridSectionColor} cellColor={gridCellColor} />}
          <OrbitControls makeDefault />

          {/* Physics World (Rapier) - com fallback */}
          {Physics ? (
            <Physics gravity={[0, -9.81, 0]}>
              <Ground color={groundColor} />
              {boxes.map((pos, i) => (
                <PhysicsBox key={i} position={pos} color={boxColor} />
              ))}
            </Physics>
          ) : (
            <>
              <Ground color={groundColor} />
              {boxes.map((pos, i) => (
                <PhysicsBox key={i} position={pos} color={boxColor} />
              ))}
            </>
          )}

        </Suspense>
      </Canvas>
    </div>
  );
}
