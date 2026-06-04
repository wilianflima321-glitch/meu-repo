'use client';

// @aethel-heavy-async-boundary
/**
 * Landscape/Terrain Editor - professional terrain editor
 *
 * Unreal-style system for creating and editing procedural
 * terrain with sculpting, painting, and foliage.
 *
 * Production-oriented landscape surface with Three.js runtime.
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { resolveCssVarColor } from '@/lib/style/resolve-css-var';
import { BrushPanel, LayersPanel, Toolbar } from '@/components/engine/LandscapeEditorPanels';

// ============================================================================
// TIPOS
// ============================================================================

export type BrushMode = 'sculpt' | 'smooth' | 'flatten' | 'paint' | 'foliage' | 'erosion';
export type SculptOperation = 'raise' | 'lower' | 'level' | 'noise';

export interface BrushSettings {
  size: number;
  strength: number;
  falloff: number;
  mode: BrushMode;
  operation: SculptOperation;
  targetHeight?: number;
}

export interface TerrainLayer {
  id: string;
  name: string;
  texture: string;
  normalMap?: string;
  tiling: number;
  color: string;
  blendWeight: number;
  minSlope: number;
  maxSlope: number;
  minHeight: number;
  maxHeight: number;
}

export interface FoliageType {
  id: string;
  name: string;
  mesh: string;
  density: number;
  minScale: number;
  maxScale: number;
  alignToNormal: boolean;
  randomYaw: boolean;
  color: string;
}

export interface TerrainConfig {
  width: number;
  height: number;
  resolution: number;
  maxHeight: number;
  layers: TerrainLayer[];
  foliage: FoliageType[];
}

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
  const brushColor = useMemo(() => resolveCssVarColor('--aethel-success', 'rgb(34, 197, 94)'), []);

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
      color: layers[0]?.color || 'rgb(74, 124, 79)',
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
          <meshBasicMaterial color={brushColor} transparent opacity={0.5} side={THREE.DoubleSide} />
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

function LandscapeScene({
  heightmap,
  config,
  brushSettings,
  brushActive,
  onHeightmapChange,
}: LandscapeSceneProps) {
  const heightmapRef = useRef(heightmap);
  const skyColor = useMemo(() => resolveCssVarColor('--aethel-info-light', 'rgb(135, 206, 235)'), []);
  const groundColor = useMemo(() => resolveCssVarColor('--aethel-success-dark', 'rgb(85, 107, 47)'), []);
  const gridCellColor = useMemo(() => resolveCssVarColor('--aethel-border-primary', 'rgb(51, 51, 51)'), []);
  const gridSectionColor = useMemo(() => resolveCssVarColor('--aethel-border-secondary', 'rgb(85, 85, 85)'), []);
  const gizmoAxisColors = useMemo(
    () => [
      resolveCssVarColor('--aethel-error', 'rgb(231, 76, 60)'),
      resolveCssVarColor('--aethel-success', 'rgb(34, 197, 94)'),
      resolveCssVarColor('--aethel-info', 'rgb(6, 182, 212)'),
    ] as [string, string, string],
    []
  );
  const gizmoLabelColor = useMemo(() => resolveCssVarColor('--aethel-text-primary', 'rgb(255, 255, 255)'), []);

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
      <hemisphereLight args={[skyColor, groundColor, 0.3]} />

      {/* Sky */}
      <color attach="background" args={[skyColor]} />

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
        cellColor={gridCellColor}
        sectionSize={50}
        sectionThickness={1}
        sectionColor={gridSectionColor}
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
        <GizmoViewport axisColors={gizmoAxisColors} labelColor={gizmoLabelColor} />
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

// ============================================================================
// TOOLBAR
// ============================================================================

export interface LandscapeEditorProps {
  onSave?: (heightmap: Float32Array, config: TerrainConfig) => void;
}

export default function LandscapeEditor({ onSave }: LandscapeEditorProps) {
  // Terrain config
  const [config, setConfig] = useState<TerrainConfig>({
    width: 200,
    height: 200,
    resolution: 129,
    maxHeight: 50,
    layers: [
      { id: '1', name: 'Grass', texture: '', tiling: 10, color: 'rgb(74 124 79)', blendWeight: 1, minSlope: 0, maxSlope: 0.3, minHeight: 0, maxHeight: 0.3 },
      { id: '2', name: 'Rock', texture: '', tiling: 5, color: 'rgb(107 107 107)', blendWeight: 1, minSlope: 0.3, maxSlope: 1, minHeight: 0.3, maxHeight: 0.7 },
      { id: '3', name: 'Snow', texture: '', tiling: 8, color: 'rgb(232 232 232)', blendWeight: 1, minSlope: 0, maxSlope: 0.5, minHeight: 0.7, maxHeight: 1 },
    ],
    foliage: [],
  });

  // Heightmap
  const [heightmap, setHeightmap] = useState<Float32Array>(() => {
    const data = new Float32Array(config.resolution * config.resolution);
    // Initialize with gentle hills
    for (let z = 0; z < config.resolution; z++) {
      for (let x = 0; x < config.resolution; x++) {
        const nx = x / config.resolution;
        const nz = z / config.resolution;
        data[z * config.resolution + x] =
          0.3 +
          Math.sin(nx * Math.PI * 2) * 0.1 +
          Math.cos(nz * Math.PI * 3) * 0.1;
      }
    }
    return data;
  });

  // Brush settings
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 10,
    strength: 0.5,
    falloff: 1.5,
    mode: 'sculpt',
    operation: 'raise',
  });

  const [brushActive, setBrushActive] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<string | null>('1');
  const [activePanel, setActivePanel] = useState<'brush' | 'layers'>('brush');
  const canvasBackground = useMemo(() => resolveCssVarColor('--aethel-info-light', 'rgb(135, 206, 235)'), []);

  // Generate terrain
  const handleGenerateTerrain = useCallback((type: string) => {
    const newHeightmap = new Float32Array(config.resolution * config.resolution);

    for (let z = 0; z < config.resolution; z++) {
      for (let x = 0; x < config.resolution; x++) {
        const nx = x / config.resolution - 0.5;
        const nz = z / config.resolution - 0.5;
        const dist = Math.sqrt(nx * nx + nz * nz);

        let height = 0;

        switch (type) {
          case 'flat':
            height = 0.3;
            break;
          case 'hills':
            height = 0.3 +
              Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.2 +
              Math.sin(x * 0.05 + 1) * Math.cos(z * 0.07 + 2) * 0.15;
            break;
          case 'mountains':
            height = Math.pow(Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5 + 0.5, 2) * 0.8 +
              Math.random() * 0.05;
            break;
          case 'valley':
            height = 0.8 - Math.pow(Math.abs(nx) * 2, 0.5) * 0.6;
            break;
          case 'island':
            height = Math.max(0, 0.6 - dist * 1.5) +
              Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.1;
            break;
          case 'canyon':
            const canyonDist = Math.abs(nx);
            height = canyonDist < 0.1 ? 0.1 : 0.5 + Math.sin(z * 0.1) * 0.1;
            break;
        }

        newHeightmap[z * config.resolution + x] = Math.max(0, Math.min(1, height));
      }
    }

    setHeightmap(newHeightmap);
  }, [config.resolution]);

  // Export
  const handleExport = useCallback(() => {
    const data = {
      config,
      heightmap: Array.from(heightmap),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'terrain.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [config, heightmap]);

  // Import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const data = JSON.parse(text);
        setConfig(data.config);
        setHeightmap(new Float32Array(data.heightmap));
      }
    };
    input.click();
  }, []);

  // Layer management
  const handleAddLayer = useCallback(() => {
    const newLayer: TerrainLayer = {
      id: Date.now().toString(),
      name: `Layer ${config.layers.length + 1}`,
      texture: '',
      tiling: 10,
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      blendWeight: 1,
      minSlope: 0,
      maxSlope: 1,
      minHeight: 0,
      maxHeight: 1,
    };
    setConfig({ ...config, layers: [...config.layers, newLayer] });
  }, [config]);

  const handleUpdateLayer = useCallback((id: string, updates: Partial<TerrainLayer>) => {
    setConfig({
      ...config,
      layers: config.layers.map(l => l.id === id ? { ...l, ...updates } : l),
    });
  }, [config]);

  const handleRemoveLayer = useCallback((id: string) => {
    setConfig({
      ...config,
      layers: config.layers.filter(l => l.id !== id),
    });
    if (selectedLayer === id) {
      setSelectedLayer(config.layers[0]?.id || null);
    }
  }, [config, selectedLayer]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--aethel-surface-primary)',
    }}>
      {/* Toolbar */}
      <Toolbar
        brushSettings={brushSettings}
        onBrushSettingsChange={setBrushSettings}
        brushActive={brushActive}
        onBrushActiveChange={setBrushActive}
        onGenerateTerrain={handleGenerateTerrain}
        onExport={handleExport}
        onImport={handleImport}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 3D Viewport */}
        <div style={{ flex: 1 }}>
          <Canvas
            shadows
            camera={{ position: [100, 80, 100], fov: 50 }}
            style={{ background: canvasBackground }}
          >
            <LandscapeScene
              heightmap={heightmap}
              config={config}
              brushSettings={brushSettings}
              brushActive={brushActive}
              onHeightmapChange={setHeightmap}
            />
          </Canvas>
        </div>

        {/* Side Panel */}
        <div style={{
          width: '280px',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--aethel-border-primary)',
        }}>
          {/* Panel Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--aethel-border-primary)',
          }}>
            {(['brush', 'layers'] as const).map((panel) => (
              <button type="button" aria-label={`Open terrain ${panel} panel`}
                key={panel}
                onClick={() => setActivePanel(panel)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: activePanel === panel ? 'var(--aethel-surface-tertiary)' : 'var(--aethel-surface-primary)',
                  border: 'none',
                  borderBottom: activePanel === panel ? '2px solid var(--aethel-primary)' : '2px solid transparent',
                  color: activePanel === panel ? 'var(--aethel-text-primary)' : 'var(--aethel-text-quaternary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textTransform: 'capitalize',
                }}
              >
                {panel === 'brush' ? '🖌️' : '🎨'} {panel}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {activePanel === 'brush' ? (
              <BrushPanel
                brushSettings={brushSettings}
                onBrushSettingsChange={setBrushSettings}
              />
            ) : (
              <LayersPanel
                layers={config.layers}
                selectedLayer={selectedLayer}
                onSelectLayer={setSelectedLayer}
                onUpdateLayer={handleUpdateLayer}
                onAddLayer={handleAddLayer}
                onRemoveLayer={handleRemoveLayer}
              />
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '6px 12px',
        background: 'var(--aethel-surface-tertiary)',
        borderTop: '1px solid var(--aethel-border-primary)',
        fontSize: '11px',
        color: 'var(--aethel-text-muted)',
        display: 'flex',
        gap: '24px',
      }}>
        <span>Resolution: {config.resolution}x{config.resolution}</span>
        <span>Size: {config.width}m x {config.height}m</span>
        <span>Max Height: {config.maxHeight}m</span>
        <span>Layers: {config.layers.length}</span>
        <span>Mode: {brushSettings.mode}</span>
      </div>
    </div>
  );
}
