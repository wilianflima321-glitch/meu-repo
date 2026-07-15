'use client';

// @aethel-heavy-async-boundary: loaded only through explicit Studio/Labs dynamic imports.

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { resolveCssVarColor } from '../../web/lib/style/resolve-css-var';
import { createComponentLogger } from '../../web/lib/observability/logger'

const log = createComponentLogger('GameViewport')


// Rapier is optional; this runtime keeps an honest no-physics fallback.
let Physics: React.ComponentType<any> | null = null;
let RigidBody: React.ComponentType<any> | null = null;
let rapierLoaded = false;

async function loadRapier(onLoad?: () => void) {
  if (rapierLoaded) {
    onLoad?.();
    return;
  }

  if (typeof window !== 'undefined') {
    try {
      // Keep Rapier out of the default bundle; it is only used when installed.
      const mod = await eval('import("@react-three/rapier")');
      Physics = mod.Physics;
      RigidBody = mod.RigidBody;
      rapierLoaded = true;
      onLoad?.();
    } catch {
      log.info('[GameViewport] @react-three/rapier not available, using fallback');
    }
  }
}

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
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// --- Scene Manager ---

export interface GameViewportProps {
  mode?: 'edit' | 'play';
}

export default function GameViewport({ mode = 'edit' }: GameViewportProps) {
  const [boxes, setBoxes] = useState<[number, number, number][]>([
    [0, 5, 0],
    [2, 8, 0],
    [-2, 10, 0]
  ]);
  const [isPhysicsLoading, setIsPhysicsLoading] = useState(false);
  const groundColor = useMemo(() => resolveCssVarColor('--aethel-surface-tertiary', 'rgb(48 48 48)'), []);
  const boxColor = useMemo(() => resolveCssVarColor('--aethel-warning', 'rgb(245 158 11)'), []);
  const gridCellColor = useMemo(() => resolveCssVarColor('--aethel-border-primary', 'rgb(48 48 48)'), []);
  const gridSectionColor = useMemo(() => resolveCssVarColor('--aethel-border-secondary', 'rgb(79 79 79)'), []);

  // Reset physics when switching modes (simple way: remount)
  const [key, setKey] = useState(0);
  useEffect(() => {
    setKey(k => k + 1);
  }, [mode]);

  useEffect(() => {
    if (!rapierLoaded) {
      setIsPhysicsLoading(true);
      loadRapier(() => setIsPhysicsLoading(false));
    }
  }, []);

  return (
    <div className="w-full h-full bg-[var(--aethel-surface-primary)] relative">
      {/* Toolbar Overlay */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] backdrop-blur p-2 rounded border border-[var(--aethel-border-primary)] text-xs text-[var(--aethel-text-primary)]">
          Mode: <span className="font-bold text-[var(--aethel-info-light)] uppercase">{mode}</span>
        </div>
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] backdrop-blur p-2 rounded border border-[var(--aethel-border-primary)] text-xs text-[var(--aethel-success)] flex items-center gap-1">
          {isPhysicsLoading ? (
            <>
              <span className="w-2 h-2 rounded-full border border-[var(--aethel-warning)] border-t-transparent animate-spin"/>
              <span className="text-[var(--aethel-warning)]">Carregando Física (WASM)...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] animate-pulse"/>
              {Physics ? 'Rapier Physics v3' : 'No Physics (Rapier not installed)'}
            </>
          )}
        </div>
        <button type="button" aria-label="Spawn cube into game viewport"
          onClick={() => setBoxes(prev => [...prev, [(Math.random() - 0.5) * 5, 10, (Math.random() - 0.5) * 5]])}
          className="bg-[var(--aethel-info)] hover:brightness-110 text-[var(--aethel-text-primary)] px-3 py-1 rounded text-xs font-bold transition"
        >
          Spawn Cube
        </button>
      </div>

      {/* 
        * DOM Isolation (Wave 12.0) 
        * O Canvas agora roda com frameloop em modo demand/worker-ready, 
        * impedindo que o React rerender derrube o FPS do 3D. 
        */}
      <Canvas 
        key={key} 
        shadows 
        camera={{ position: [5, 5, 5], fov: 50 }}
        dpr={[1, 2]} 
        frameloop="demand" 
        performance={{ min: 0.5 }}
      >
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
