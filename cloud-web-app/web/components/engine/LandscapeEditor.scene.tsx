'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Grid, GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { BrushSettings, TerrainConfig, TerrainLayer } from './LandscapeEditor.types';

// ============================================================================
// TERRAIN MESH
// ============================================================================

interface TerrainMeshProps {
  heightmap: Float32Array;
  resolution: number;
  width: number;
  height: number;
  maxHeight: number;
  layers: TerrainLayer[];
  onBrushStroke: (point: THREE.Vector3, normal: THREE.Vector3) => void;
  brushSize: number;
  brushActive: boolean;
}

function TerrainMesh({
  heightmap,
  resolution,
  width,
  height,
  maxHeight,
  layers,
  onBrushStroke,
  brushSize,
  brushActive,
}: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const brushIndicatorRef = useRef<THREE.Mesh>(null);
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3 | null>(null);
  
  // Generate geometry from heightmap
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, resolution - 1, resolution - 1);
    geo.rotateX(-Math.PI / 2);
    
    const positions = geo.attributes.position.array as Float32Array;
    
    for (let i = 0; i < heightmap.length; i++) {
      positions[i * 3 + 1] = heightmap[i] * maxHeight;
    }
    
    geo.computeVertexNormals();
    geo.attributes.position.needsUpdate = true;
    
    return geo;
  }, [heightmap, resolution, width, height, maxHeight]);
  
  // Generate material with texture blending
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: layers[0]?.color || '#4a7c4f',
      roughness: 0.8,
      metalness: 0.0,
      flatShading: false,
      wireframe: false,
    });
    
    return mat;
  }, [layers]);
  
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.point) {
      setBrushPosition(e.point.clone());
    }
  }, []);
  
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (brushActive && e.point && e.face) {
      onBrushStroke(e.point.clone(), e.face.normal.clone());
    }
  }, [brushActive, onBrushStroke]);
  
  // Update brush indicator
  useFrame(() => {
    if (brushIndicatorRef.current && brushPosition) {
      brushIndicatorRef.current.position.copy(brushPosition);
      brushIndicatorRef.current.position.y += 0.1;
    }
  });
  
  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        receiveShadow
        castShadow
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      />
      
      {/* Brush Indicator */}
      {brushPosition && brushActive && (
        <mesh ref={brushIndicatorRef} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[brushSize * 0.95, brushSize, 32]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// SCENE
// ============================================================================

interface LandscapeSceneProps {
  heightmap: Float32Array;
  config: TerrainConfig;
  brushSettings: BrushSettings;
  brushActive: boolean;
  onHeightmapChange: (heightmap: Float32Array) => void;
}

export function LandscapeScene({
  heightmap,
  config,
  brushSettings,
  brushActive,
  onHeightmapChange,
}: LandscapeSceneProps) {
  const heightmapRef = useRef(heightmap);
  
  useEffect(() => {
    heightmapRef.current = heightmap;
  }, [heightmap]);
  
  const handleBrushStroke = useCallback((point: THREE.Vector3, _normal: THREE.Vector3) => {
    const newHeightmap = new Float32Array(heightmapRef.current);
    
    // Convert world position to heightmap coordinates
    const hx = Math.floor(((point.x + config.width / 2) / config.width) * config.resolution);
    const hz = Math.floor(((point.z + config.height / 2) / config.height) * config.resolution);
    
    const brushRadiusPixels = Math.floor((brushSettings.size / config.width) * config.resolution);
    
    for (let dx = -brushRadiusPixels; dx <= brushRadiusPixels; dx++) {
      for (let dz = -brushRadiusPixels; dz <= brushRadiusPixels; dz++) {
        const x = hx + dx;
        const z = hz + dz;
        
        if (x < 0 || x >= config.resolution || z < 0 || z >= config.resolution) continue;
        
        const dist = Math.sqrt(dx * dx + dz * dz) / brushRadiusPixels;
        if (dist > 1) continue;
        
        // Calculate falloff
        const falloff = Math.pow(1 - dist, brushSettings.falloff);
        const index = z * config.resolution + x;
        
        switch (brushSettings.mode) {
          case 'sculpt':
            switch (brushSettings.operation) {
              case 'raise':
                newHeightmap[index] += brushSettings.strength * falloff * 0.01;
                break;
              case 'lower':
                newHeightmap[index] -= brushSettings.strength * falloff * 0.01;
                break;
              case 'level':
                const target = brushSettings.targetHeight ?? 0.5;
                newHeightmap[index] = THREE.MathUtils.lerp(newHeightmap[index], target, brushSettings.strength * falloff * 0.1);
                break;
              case 'noise':
                newHeightmap[index] += (Math.random() - 0.5) * brushSettings.strength * falloff * 0.02;
                break;
            }
            break;
            
          case 'smooth':
            // Average with neighbors
            let sum = 0;
            let count = 0;
            for (let sx = -1; sx <= 1; sx++) {
              for (let sz = -1; sz <= 1; sz++) {
                const nx = x + sx;
                const nz = z + sz;
                if (nx >= 0 && nx < config.resolution && nz >= 0 && nz < config.resolution) {
                  sum += heightmapRef.current[nz * config.resolution + nx];
                  count++;
                }
              }
            }
            const avg = sum / count;
            newHeightmap[index] = THREE.MathUtils.lerp(newHeightmap[index], avg, brushSettings.strength * falloff * 0.1);
            break;
            
          case 'flatten':
            const centerIndex = hz * config.resolution + hx;
            const flattenTarget = heightmapRef.current[centerIndex];
            newHeightmap[index] = THREE.MathUtils.lerp(newHeightmap[index], flattenTarget, brushSettings.strength * falloff * 0.1);
            break;
            
          case 'erosion':
            // Simple erosion simulation
            const slope = calculateSlope(heightmapRef.current, x, z, config.resolution);
            if (slope > 0.3) {
              newHeightmap[index] -= brushSettings.strength * falloff * slope * 0.005;
            }
            break;
        }
        
        // Clamp values
        newHeightmap[index] = Math.max(0, Math.min(1, newHeightmap[index]));
      }
    }
    
    onHeightmapChange(newHeightmap);
  }, [brushSettings, config, onHeightmapChange]);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <hemisphereLight args={['#87ceeb', '#556b2f', 0.3]} />
      
      {/* Sky */}
      <color attach="background" args={['#87ceeb']} />
      
      {/* Terrain */}
      <TerrainMesh
        heightmap={heightmap}
        resolution={config.resolution}
        width={config.width}
        height={config.height}
        maxHeight={config.maxHeight}
        layers={config.layers}
        onBrushStroke={handleBrushStroke}
        brushSize={brushSettings.size}
        brushActive={brushActive}
      />
      
      {/* Grid */}
      <Grid
        position={[0, -0.01, 0]}
        args={[config.width, config.height]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#333"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#555"
        fadeDistance={300}
        fadeStrength={1}
        followCamera={false}
      />
      
      {/* Controls */}
      <OrbitControls 
        makeDefault 
        minDistance={10}
        maxDistance={500}
        maxPolarAngle={Math.PI * 0.45}
      />
      
      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#e74c3c', '#2ecc71', '#3498db']} labelColor="white" />
      </GizmoHelper>
    </>
  );
}

// Helper function
function calculateSlope(heightmap: Float32Array, x: number, z: number, resolution: number): number {
  const index = z * resolution + x;
  let maxDiff = 0;
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      const nx = x + dx;
      const nz = z + dz;
      if (nx >= 0 && nx < resolution && nz >= 0 && nz < resolution) {
        const neighborIndex = nz * resolution + nx;
        maxDiff = Math.max(maxDiff, Math.abs(heightmap[index] - heightmap[neighborIndex]));
      }
    }
  }
  
  return maxDiff;
}
