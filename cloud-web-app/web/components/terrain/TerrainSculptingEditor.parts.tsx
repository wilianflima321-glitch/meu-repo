"use client";

// @aethel-heavy-async-boundary: transitive runtime chunk loaded through TerrainSculptingEditor.

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
} from "@react-three/drei";
import * as THREE from "three";
import { resolveCssVarColor } from "@/lib/style/resolve-css-var";
import { toolCategories } from "./terrain-sculpting-models";
import type {
  BrushFalloff,
  BrushSettings,
  ErosionSettings,
  TerrainData,
  TerrainLayer,
  TerrainSettings,
  TerrainToolType,
} from "./terrain-sculpting-models";

interface BrushPreviewProps {
  position: THREE.Vector3 | null;
  settings: BrushSettings;
  color: string;
}
function BrushPreview({ position, settings, color }: BrushPreviewProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current && position) {
      meshRef.current.position.copy(position);
      meshRef.current.position.y += 0.1; // Slight offset
    }
  });
  if (!position) return null;
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, THREE.MathUtils.degToRad(settings.rotation)]}
    >
      {settings.shape === "circle" ? (
        <ringGeometry args={[settings.size * 0.95, settings.size, 64]} />
      ) : (
        <planeGeometry args={[settings.size * 2, settings.size * 2]} />
      )}
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
interface TerrainMeshProps {
  data: TerrainData;
  settings: TerrainSettings;
  layers: TerrainLayer[];
  onBrushStart: (position: THREE.Vector3, uv: THREE.Vector2) => void;
  onBrushMove: (position: THREE.Vector3, uv: THREE.Vector2) => void;
  onBrushEnd: () => void;
  brushPosition: THREE.Vector3 | null;
  setBrushPosition: (pos: THREE.Vector3 | null) => void;
}
function TerrainMesh({
  data,
  settings,
  layers,
  onBrushStart,
  onBrushMove,
  onBrushEnd,
  brushPosition,
  setBrushPosition,
}: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const terrainColor = useMemo(
    () => resolveCssVarColor("--aethel-success", "rgb(74, 124, 89)"),
    [],
  );
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      settings.size.x,
      settings.size.y,
      data.resolution - 1,
      data.resolution - 1,
    );
    geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const height = data.heightmap[i] * settings.maxHeight;
      positions.setY(i, height);
    }
    positions.needsUpdate = true;
    geo.computeVertexNormals();
    geometryRef.current = geo;
    return geo;
  }, [data.heightmap, data.resolution, settings]);
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: terrainColor,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: false,
    });
  }, [terrainColor]);
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.point && e.uv) {
        setIsPainting(true);
        onBrushStart(e.point, e.uv);
      }
    },
    [onBrushStart],
  );
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.point) {
        setBrushPosition(e.point.clone());
        if (isPainting && e.uv) {
          onBrushMove(e.point, e.uv);
        }
      }
    },
    [isPainting, onBrushMove, setBrushPosition],
  );
  const handlePointerUp = useCallback(() => {
    setIsPainting(false);
    onBrushEnd();
  }, [onBrushEnd]);
  const handlePointerLeave = useCallback(() => {
    setBrushPosition(null);
    if (isPainting) {
      setIsPainting(false);
      onBrushEnd();
    }
  }, [isPainting, onBrushEnd, setBrushPosition]);
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onPointerDown={handlePointerDown as never}
      onPointerMove={handlePointerMove as never}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      castShadow={settings.castShadows}
      receiveShadow={settings.receiveShadows}
    />
  );
}
interface ToolbarProps {
  selectedTool: TerrainToolType;
  onToolChange: (tool: TerrainToolType) => void;
}
export function Toolbar({ selectedTool, onToolChange }: ToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "12px",
        background: "var(--aethel-surface-primary)",
        borderRadius: "8px",
      }}
    >
      {toolCategories.map((category) => (
        <div key={category.name}>
          <h4
            style={{
              color: "var(--aethel-text-quaternary)",
              fontSize: "11px",
              marginBottom: "8px",
              textTransform: "uppercase",
            }}
          >
            {category.name}
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {category.tools.map((tool) => (
              <button
                type="button"
                key={tool.id}
                onClick={() => onToolChange(tool.id as TerrainToolType)}
                title={tool.label}
                style={{
                  width: "36px",
                  height: "36px",
                  background:
                    selectedTool === tool.id
                      ? "var(--aethel-primary)"
                      : "var(--aethel-surface-tertiary)",
                  border:
                    selectedTool === tool.id
                      ? "2px solid var(--aethel-primary-light)"
                      : "1px solid var(--aethel-border-primary)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
interface LayersPanelProps {
  layers: TerrainLayer[];
  selectedLayer: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (layer: TerrainLayer) => void;
}
export function LayersPanel({
  layers,
  selectedLayer,
  onSelect,
  onAdd,
  onRemove,
  onUpdate,
}: LayersPanelProps) {
  return (
    <div
      style={{
        padding: "12px",
        background: "var(--aethel-surface-primary)",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ color: "white", fontSize: "14px" }}>Terrain Layers</h3>
        <button
          type="button"
          onClick={onAdd}
          style={{
            background: "var(--aethel-primary)",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            color: "white",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          + Add
        </button>
      </div>
      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            onClick={() => onSelect(layer.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px",
              background:
                selectedLayer === layer.id
                  ? "color-mix(in_srgb,var(--aethel-primary)_20%,var(--aethel-surface-tertiary))"
                  : "var(--aethel-surface-tertiary)",
              border:
                selectedLayer === layer.id
                  ? "1px solid var(--aethel-primary)"
                  : "1px solid transparent",
              borderRadius: "4px",
              marginBottom: "4px",
              cursor: "pointer",
            }}
          >
            {/* Layer preview */}
            <div
              style={{
                width: "32px",
                height: "32px",
                background: `linear-gradient(135deg, var(--aethel-success), color-mix(in_srgb,var(--aethel-success)_60%,var(--aethel-surface-primary)))`,
                borderRadius: "4px",
                flexShrink: 0,
              }}
            />
            {/* Layer info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ color: "white", fontSize: "12px", fontWeight: 500 }}
              >
                {layer.name}
              </div>
              <div
                style={{
                  color: "var(--aethel-text-quaternary)",
                  fontSize: "10px",
                }}
              >
                Tiling: {layer.tiling.x}x{layer.tiling.y}
              </div>
            </div>
            {/* Index */}
            <div
              style={{
                width: "20px",
                height: "20px",
                background: "var(--aethel-border-primary)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--aethel-text-tertiary)",
                fontSize: "10px",
              }}
            >
              {index + 1}
            </div>
            {/* Delete */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(layer.id);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--aethel-error)",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {/* Layer settings for selected */}
      {selectedLayer &&
        (() => {
          const layer = layers.find((l) => l.id === selectedLayer);
          if (!layer) return null;
          return (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                background: "var(--aethel-surface-tertiary)",
                borderRadius: "4px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <label
                  style={{
                    color: "var(--aethel-text-tertiary)",
                    fontSize: "11px",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Height Blend
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={layer.heightBlend}
                  onChange={(e) =>
                    onUpdate({
                      ...layer,
                      heightBlend: parseFloat(e.target.value),
                    })
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      color: "var(--aethel-text-tertiary)",
                      fontSize: "11px",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Tiling X
                  </label>
                  <input
                    type="number"
                    value={layer.tiling.x}
                    onChange={(e) =>
                      onUpdate({
                        ...layer,
                        tiling: {
                          ...layer.tiling,
                          x: parseFloat(e.target.value),
                        },
                      })
                    }
                    style={{
                      width: "100%",
                      background: "var(--aethel-surface-primary)",
                      border: "1px solid var(--aethel-border-primary)",
                      borderRadius: "4px",
                      padding: "4px",
                      color: "white",
                      fontSize: "11px",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      color: "var(--aethel-text-tertiary)",
                      fontSize: "11px",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Tiling Y
                  </label>
                  <input
                    type="number"
                    value={layer.tiling.y}
                    onChange={(e) =>
                      onUpdate({
                        ...layer,
                        tiling: {
                          ...layer.tiling,
                          y: parseFloat(e.target.value),
                        },
                      })
                    }
                    style={{
                      width: "100%",
                      background: "var(--aethel-surface-primary)",
                      border: "1px solid var(--aethel-border-primary)",
                      borderRadius: "4px",
                      padding: "4px",
                      color: "white",
                      fontSize: "11px",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
interface ErosionPanelProps {
  settings: ErosionSettings;
  onChange: (settings: ErosionSettings) => void;
  onApply: () => void;
}
export function ErosionPanel({
  settings,
  onChange,
  onApply,
}: ErosionPanelProps) {
  const update = <K extends keyof ErosionSettings>(
    key: K,
    value: ErosionSettings[K],
  ) => {
    onChange({ ...settings, [key]: value });
  };
  return (
    <div
      style={{
        padding: "12px",
        background: "var(--aethel-surface-primary)",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ color: "white", fontSize: "14px", marginBottom: "12px" }}>
        Erosion Settings
      </h3>
      {/* Type */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            color: "var(--aethel-text-tertiary)",
            fontSize: "12px",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Type
        </label>
        <select
          value={settings.type}
          onChange={(e) =>
            update("type", e.target.value as ErosionSettings["type"])
          }
          style={{
            width: "100%",
            background: "var(--aethel-surface-tertiary)",
            border: "1px solid var(--aethel-border-primary)",
            borderRadius: "4px",
            padding: "6px",
            color: "white",
            fontSize: "12px",
          }}
        >
          <option value="hydraulic">Hydraulic (Water)</option>
          <option value="thermal">Thermal (Gravity)</option>
          <option value="wind">Wind</option>
        </select>
      </div>
      {/* Iterations */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <label
            style={{ color: "var(--aethel-text-tertiary)", fontSize: "12px" }}
          >
            Iterations
          </label>
          <span
            style={{ color: "var(--aethel-text-quaternary)", fontSize: "11px" }}
          >
            {settings.iterations}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={500}
          step={1}
          value={settings.iterations}
          onChange={(e) => update("iterations", parseInt(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
      {/* Strength */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <label
            style={{ color: "var(--aethel-text-tertiary)", fontSize: "12px" }}
          >
            Strength
          </label>
          <span
            style={{ color: "var(--aethel-text-quaternary)", fontSize: "11px" }}
          >
            {(settings.strength * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.strength}
          onChange={(e) => update("strength", parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
      {/* Type-specific settings */}
      {settings.type === "hydraulic" && (
        <>
          <div style={{ marginBottom: "8px" }}>
            <label
              style={{
                color: "var(--aethel-text-tertiary)",
                fontSize: "11px",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Rain Amount
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.rainAmount ?? 0.5}
              onChange={(e) => update("rainAmount", parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label
              style={{
                color: "var(--aethel-text-tertiary)",
                fontSize: "11px",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Sediment Capacity
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.sedimentCapacity ?? 0.5}
              onChange={(e) =>
                update("sedimentCapacity", parseFloat(e.target.value))
              }
              style={{ width: "100%" }}
            />
          </div>
        </>
      )}
      {settings.type === "thermal" && (
        <div style={{ marginBottom: "8px" }}>
          <label
            style={{
              color: "var(--aethel-text-tertiary)",
              fontSize: "11px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Talus Angle: {settings.talusAngle ?? 45}°
          </label>
          <input
            type="range"
            min={0}
            max={90}
            step={1}
            value={settings.talusAngle ?? 45}
            onChange={(e) => update("talusAngle", parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      )}
      <button
        type="button"
        onClick={onApply}
        style={{
          width: "100%",
          background: "var(--aethel-primary)",
          border: "none",
          borderRadius: "6px",
          padding: "10px",
          color: "white",
          cursor: "pointer",
          fontSize: "13px",
          marginTop: "8px",
        }}
      >
        Apply Erosion
      </button>
    </div>
  );
}
interface ViewportSceneProps {
  terrainData: TerrainData;
  terrainSettings: TerrainSettings;
  layers: TerrainLayer[];
  selectedTool: TerrainToolType;
  brushSettings: BrushSettings;
  onApplyBrush: (x: number, z: number) => void;
}
export function ViewportScene({
  terrainData,
  terrainSettings,
  layers,
  selectedTool,
  brushSettings,
  onApplyBrush,
}: ViewportSceneProps) {
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3 | null>(
    null,
  );
  const gridCellColor = useMemo(
    () => resolveCssVarColor("--aethel-border-primary", "rgb(55, 65, 81)"),
    [],
  );
  const gridSectionColor = useMemo(
    () => resolveCssVarColor("--aethel-border-secondary", "rgb(71, 85, 105)"),
    [],
  );
  const brushPalette = useMemo(
    () => ({
      success: resolveCssVarColor("--aethel-success", "rgb(34, 197, 94)"),
      error: resolveCssVarColor("--aethel-error", "rgb(239, 68, 68)"),
      primary: resolveCssVarColor("--aethel-primary", "rgb(59, 130, 246)"),
      warning: resolveCssVarColor("--aethel-warning", "rgb(245, 158, 11)"),
      muted: resolveCssVarColor(
        "--aethel-text-quaternary",
        "rgb(100, 116, 139)",
      ),
    }),
    [],
  );
  const getBrushColor = () => {
    if (selectedTool.startsWith("sculpt_raise")) return brushPalette.success;
    if (selectedTool.startsWith("sculpt_lower")) return brushPalette.error;
    if (selectedTool.startsWith("sculpt_smooth")) return brushPalette.primary;
    if (selectedTool.startsWith("paint")) return brushPalette.warning;
    if (selectedTool.startsWith("foliage")) return brushPalette.success;
    return brushPalette.muted;
  };
  const handleBrushStart = useCallback(
    (position: THREE.Vector3, _uv: THREE.Vector2) => {
      onApplyBrush(position.x, position.z);
    },
    [onApplyBrush],
  );
  const handleBrushMove = useCallback(
    (position: THREE.Vector3, _uv: THREE.Vector2) => {
      onApplyBrush(position.x, position.z);
    },
    [onApplyBrush],
  );
  const handleBrushEnd = useCallback(() => {}, []);
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {/* Environment */}
      <Environment preset="sunset" />
      {/* Grid */}
      <Grid
        args={[100, 100]}
        position={[0, 0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={gridCellColor}
        sectionSize={10}
        sectionThickness={1}
        sectionColor={gridSectionColor}
        fadeDistance={100}
        fadeStrength={1}
      />
      {/* Terrain */}
      <TerrainMesh
        data={terrainData}
        settings={terrainSettings}
        layers={layers}
        onBrushStart={handleBrushStart}
        onBrushMove={handleBrushMove}
        onBrushEnd={handleBrushEnd}
        brushPosition={brushPosition}
        setBrushPosition={setBrushPosition}
      />
      {/* Brush preview */}
      <BrushPreview
        position={brushPosition}
        settings={brushSettings}
        color={getBrushColor()}
      />
      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.1}
      />
      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport labelColor="white" />
      </GizmoHelper>
    </>
  );
}
