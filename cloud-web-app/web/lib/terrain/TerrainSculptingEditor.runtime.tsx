"use client";

// @aethel-heavy-async-boundary: loaded only through the /studio/level?tool=terrain route dynamic import.

import React, { useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { createComponentLogger } from "@/lib/observability/logger";
import { BrushSettingsPanel } from "@/components/terrain/TerrainBrushSettingsPanel";
import {
  ErosionPanel,
  LayersPanel,
  Toolbar,
  ViewportScene,
} from "@/components/terrain/TerrainSculptingEditor.parts";
import type {
  BrushFalloff,
  BrushSettings,
  ErosionSettings,
  FoliageInstance,
  TerrainData,
  TerrainLayer,
  TerrainSettings,
  TerrainToolType,
} from "@/components/terrain/terrain-sculpting-models";

export type {
  BrushFalloff,
  BrushSettings,
  BrushShape,
  ErosionSettings,
  FoliageInstance,
  FoliageType,
  TerrainData,
  TerrainLayer,
  TerrainSettings,
  TerrainToolType,
} from "@/components/terrain/terrain-sculpting-models";

const log = createComponentLogger("TerrainSculptingEditor");

export interface TerrainSculptingEditorProps {
  initialData?: TerrainData;
  initialSettings?: TerrainSettings;
  onChange?: (data: TerrainData) => void;
}
export function TerrainSculptingEditor({
  initialData,
  initialSettings,
  onChange,
}: TerrainSculptingEditorProps) {
  const [terrainSettings] = useState<TerrainSettings>(
    initialSettings || {
      resolution: 257,
      size: { x: 100, y: 100, z: 50 },
      maxHeight: 50,
      lodLevels: 4,
      streamingEnabled: true,
      tessellation: true,
      castShadows: true,
      receiveShadows: true,
    },
  );
  const [terrainData, setTerrainData] = useState<TerrainData>(() => {
    if (initialData) return initialData;
    const resolution = terrainSettings.resolution;
    const heightmap = new Float32Array(resolution * resolution);
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const nx = x / resolution - 0.5;
        const nz = z / resolution - 0.5;
        const height =
          Math.sin(nx * 10) * Math.cos(nz * 10) * 0.1 +
          Math.sin(nx * 5 + nz * 3) * 0.15 +
          0.2;
        heightmap[z * resolution + x] = Math.max(0, Math.min(1, height));
      }
    }
    return {
      heightmap,
      splatmaps: [new Float32Array(resolution * resolution * 4)],
      holemask: new Uint8Array(resolution * resolution),
      foliageInstances: [],
      resolution,
    };
  });
  const [selectedTool, setSelectedTool] =
    useState<TerrainToolType>("sculpt_raise");
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 5,
    strength: 0.3,
    falloff: "smooth",
    shape: "circle",
    rotation: 0,
    spacing: 0.25,
    jitter: 0,
  });
  const [layers, setLayers] = useState<TerrainLayer[]>([
    {
      id: "grass",
      name: "Grass",
      diffuseTexture: "/textures/grass_diffuse.jpg",
      normalTexture: "/textures/grass_normal.jpg",
      tiling: { x: 10, y: 10 },
      heightBlend: 0.5,
      metallic: 0,
      roughness: 0.8,
    },
    {
      id: "dirt",
      name: "Dirt",
      diffuseTexture: "/textures/dirt_diffuse.jpg",
      normalTexture: "/textures/dirt_normal.jpg",
      tiling: { x: 8, y: 8 },
      heightBlend: 0.3,
      metallic: 0,
      roughness: 0.9,
    },
    {
      id: "rock",
      name: "Rock",
      diffuseTexture: "/textures/rock_diffuse.jpg",
      normalTexture: "/textures/rock_normal.jpg",
      tiling: { x: 4, y: 4 },
      heightBlend: 0.7,
      metallic: 0.1,
      roughness: 0.7,
    },
  ]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>("grass");
  const [erosionSettings, setErosionSettings] = useState<ErosionSettings>({
    type: "hydraulic",
    iterations: 50,
    strength: 0.5,
    rainAmount: 0.5,
    evaporation: 0.1,
    sedimentCapacity: 0.5,
    talusAngle: 45,
  });
  const [showErosion, setShowErosion] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const applyBrush = useCallback(
    (worldX: number, worldZ: number) => {
      const resolution = terrainData.resolution;
      const { size } = terrainSettings;
      const hx = (worldX / size.x + 0.5) * (resolution - 1);
      const hz = (worldZ / size.y + 0.5) * (resolution - 1);
      const brushRadius = (brushSettings.size / size.x) * resolution;
      let effect: (height: number, distance: number) => number;
      switch (selectedTool) {
        case "sculpt_raise":
          effect = (h, d) =>
            h +
            brushSettings.strength *
              getFalloff(d, brushRadius, brushSettings.falloff) *
              0.01;
          break;
        case "sculpt_lower":
          effect = (h, d) =>
            h -
            brushSettings.strength *
              getFalloff(d, brushRadius, brushSettings.falloff) *
              0.01;
          break;
        case "sculpt_flatten":
          effect = (h, d) => {
            const centerHeight =
              terrainData.heightmap[
                Math.floor(hz) * resolution + Math.floor(hx)
              ];
            const t =
              getFalloff(d, brushRadius, brushSettings.falloff) *
              brushSettings.strength;
            return h + (centerHeight - h) * t;
          };
          break;
        case "sculpt_smooth":
          // Handled in the heightmap pass with neighborhood read (source buffer)
          effect = (h) => h;
          break;
        default:
          effect = (h) => h;
      }
      setTerrainData((prev) => {
        const source = prev.heightmap;
        const newHeightmap = new Float32Array(source);
        const minX = Math.max(0, Math.floor(hx - brushRadius));
        const maxX = Math.min(resolution - 1, Math.ceil(hx + brushRadius));
        const minZ = Math.max(0, Math.floor(hz - brushRadius));
        const maxZ = Math.min(resolution - 1, Math.ceil(hz + brushRadius));
        for (let z = minZ; z <= maxZ; z++) {
          for (let x = minX; x <= maxX; x++) {
            const dx = x - hx;
            const dz = z - hz;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance <= brushRadius) {
              const idx = z * resolution + x;
              const currentHeight = source[idx];
              if (selectedTool === "sculpt_smooth") {
                let sum = 0;
                let count = 0;
                for (let oz = -1; oz <= 1; oz++) {
                  for (let ox = -1; ox <= 1; ox++) {
                    const nx = x + ox;
                    const nz = z + oz;
                    if (nx < 0 || nz < 0 || nx >= resolution || nz >= resolution) continue;
                    sum += source[nz * resolution + nx];
                    count++;
                  }
                }
                const mean = count > 0 ? sum / count : currentHeight;
                const t =
                  getFalloff(distance, brushRadius, brushSettings.falloff) *
                  brushSettings.strength;
                newHeightmap[idx] = Math.max(
                  0,
                  Math.min(1, currentHeight + (mean - currentHeight) * t),
                );
              } else {
                newHeightmap[idx] = Math.max(
                  0,
                  Math.min(1, effect(currentHeight, distance)),
                );
              }
            }
          }
        }
        return { ...prev, heightmap: newHeightmap };
      });
    },
    [terrainData, terrainSettings, brushSettings, selectedTool],
  );
  const getFalloff = (
    distance: number,
    radius: number,
    type: BrushFalloff,
  ): number => {
    const t = Math.max(0, 1 - distance / radius);
    switch (type) {
      case "linear":
        return t;
      case "smooth":
        return t * t * (3 - 2 * t); // Smoothstep
      case "spherical":
        return Math.sqrt(1 - (1 - t) * (1 - t));
      case "tip":
        return t * t * t * t;
      case "constant":
        return 1;
      default:
        return t;
    }
  };
  const applyErosion = useCallback(() => {
    log.info("Applying erosion:", erosionSettings);
  }, [erosionSettings]);
  const addLayer = () => {
    const newLayer: TerrainLayer = {
      id: crypto.randomUUID(),
      name: `Layer ${layers.length + 1}`,
      diffuseTexture: "",
      tiling: { x: 10, y: 10 },
      heightBlend: 0.5,
      metallic: 0,
      roughness: 0.8,
    };
    setLayers((prev) => [...prev, newLayer]);
  };
  useEffect(() => {
    onChange?.(terrainData);
  }, [terrainData, onChange]);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "var(--aethel-surface-primary)",
      }}
    >
      {/* Left sidebar - Tools */}
      <div
        style={{
          width: "200px",
          borderRight: "1px solid var(--aethel-border-primary)",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          overflowY: "auto",
        }}
      >
        <Toolbar selectedTool={selectedTool} onToolChange={setSelectedTool} />
        <BrushSettingsPanel
          settings={brushSettings}
          onChange={setBrushSettings}
        />
        {selectedTool === "sculpt_erosion" && (
          <ErosionPanel
            settings={erosionSettings}
            onChange={setErosionSettings}
            onApply={applyErosion}
          />
        )}
      </div>
      {/* Main viewport */}
      <div style={{ flex: 1, position: "relative" }}>
        <Canvas
          shadows
          camera={{ position: [50, 50, 50], fov: 50 }}
          style={{ background: "var(--aethel-surface-tertiary)" }}
        >
          <ViewportScene
            terrainData={terrainData}
            terrainSettings={terrainSettings}
            layers={layers}
            selectedTool={selectedTool}
            brushSettings={brushSettings}
            onApplyBrush={applyBrush}
          />
          {showStats && <Stats />}
        </Canvas>
        {/* Top toolbar */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => setShowStats((s) => !s)}
            style={{
              background: showStats
                ? "var(--aethel-primary)"
                : "var(--aethel-surface-tertiary)",
              border: "1px solid var(--aethel-border-primary)",
              borderRadius: "4px",
              padding: "6px 12px",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            📊 Stats
          </button>
          <button
            type="button"
            onClick={() => setShowErosion((s) => !s)}
            style={{
              background: showErosion
                ? "var(--aethel-primary)"
                : "var(--aethel-surface-tertiary)",
              border: "1px solid var(--aethel-border-primary)",
              borderRadius: "4px",
              padding: "6px 12px",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            💧 Erosion Panel
          </button>
        </div>
        {/* Status bar */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            background: "var(--aethel-surface-tertiary)",
            padding: "8px 12px",
            borderRadius: "6px",
            color: "var(--aethel-text-tertiary)",
            fontSize: "11px",
            display: "flex",
            gap: "16px",
          }}
        >
          <span>
            Resolution: {terrainData.resolution}x{terrainData.resolution}
          </span>
          <span>
            Size: {terrainSettings.size.x}m x {terrainSettings.size.y}m
          </span>
          <span>Max Height: {terrainSettings.maxHeight}m</span>
          <span>Layers: {layers.length}</span>
        </div>
      </div>
      {/* Right sidebar - Layers */}
      <div
        style={{
          width: "260px",
          borderLeft: "1px solid var(--aethel-border-primary)",
          padding: "12px",
          overflowY: "auto",
        }}
      >
        <LayersPanel
          layers={layers}
          selectedLayer={selectedLayer}
          onSelect={setSelectedLayer}
          onAdd={addLayer}
          onRemove={(id) =>
            setLayers((prev) => prev.filter((l) => l.id !== id))
          }
          onUpdate={(layer) =>
            setLayers((prev) =>
              prev.map((l) => (l.id === layer.id ? layer : l)),
            )
          }
        />
        {/* Terrain info */}
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "var(--aethel-surface-primary)",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{ color: "white", fontSize: "14px", marginBottom: "12px" }}
          >
            Terrain Settings
          </h3>
          <div
            style={{ fontSize: "12px", color: "var(--aethel-text-tertiary)" }}
          >
            <div style={{ marginBottom: "8px" }}>
              <span style={{ color: "var(--aethel-text-quaternary)" }}>
                Resolution:
              </span>{" "}
              {terrainData.resolution}²
            </div>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ color: "var(--aethel-text-quaternary)" }}>
                Vertices:
              </span>{" "}
              {(
                terrainData.resolution * terrainData.resolution
              ).toLocaleString()}
            </div>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ color: "var(--aethel-text-quaternary)" }}>
                LOD Levels:
              </span>{" "}
              {terrainSettings.lodLevels}
            </div>
            <div>
              <span style={{ color: "var(--aethel-text-quaternary)" }}>
                Streaming:
              </span>{" "}
              <span
                style={{
                  color: terrainSettings.streamingEnabled
                    ? "var(--aethel-success)"
                    : "var(--aethel-error)",
                }}
              >
                {terrainSettings.streamingEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
        {/* Import/Export */}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              background: "var(--aethel-surface-tertiary)",
              border: "1px solid var(--aethel-border-primary)",
              borderRadius: "6px",
              padding: "10px",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            📥 Import
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              background: "var(--aethel-surface-tertiary)",
              border: "1px solid var(--aethel-border-primary)",
              borderRadius: "6px",
              padding: "10px",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            📤 Export
          </button>
        </div>
      </div>
    </div>
  );
}
export default TerrainSculptingEditor;
