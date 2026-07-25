'use client';

// @aethel-heavy-async-boundary
/**
 * FOLIAGE PAINTER - Aethel Engine
 * Brush painting UI + R3F viewport. Placement math lives in foliage-brush-* modules.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
} from '@react-three/drei';
import * as THREE from 'three';
import { resolveCssVarColor } from '@/lib/style/resolve-css-var';
import { DEFAULT_FOLIAGE_TYPES } from '@/components/environment/FoliagePainter.defaults';
import type { FoliagePintarerProps } from '@/components/environment/FoliagePainter.defaults';
import { CamadaItem, CollapsibleSection, FoliageInstances3D, FoliageStats, FoliageTypeCard, Slider, TerrainMesh } from '@/lib/environment/FoliagePainterPanels.runtime';
import {
  applyFoliageEraseStroke,
  applyFoliagePaintStroke,
} from '@/lib/environment/foliage-brush-actions';
import type {
  FoliageBrushSettings,
  FoliageCamada,
  FoliageType,
} from '@/lib/environment/foliage-painter-types';
import {
  TreeDeciduous,
  Brush,
  Trash2,
  Settings,
  Download,
  Wind,
  Mountain,
  Plus,
  RotateCcw,
  Move,
} from 'lucide-react';

export type {
  FoliageBrushSettings,
  FoliageCamada,
  FoliageInstance,
  FoliageToolType,
  FoliageType,
} from '@/lib/environment/foliage-painter-types';

export default function FoliagePintarer({
  sceneId,
  onFoliageUpdate,
  onExport,
}: FoliagePintarerProps) {
  void sceneId;
  void onFoliageUpdate;

  const backgroundColor = useMemo(
    () => resolveCssVarColor('--aethel-surface-primary', 'rgb(15, 23, 42)'),
    []
  );
  const [foliageTypes, setFoliageTypes] = useState<FoliageType[]>(DEFAULT_FOLIAGE_TYPES);
  const [selectedTypes, setSelecionaredTypes] = useState<string[]>(['grass_tall']);
  const [layers, setLayers] = useState<FoliageCamada[]>([
    { id: 'default', name: 'Default layer', visible: true, locked: false, types: [], instancias: [] },
  ]);
  const [activeCamadaId, setActiveCamadaId] = useState('default');
  const [brushSettings, setBrushSettings] = useState<FoliageBrushSettings>({
    tool: 'paint',
    radius: 3,
    density: 0.5,
    falloff: 0.5,
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [windTime, setWindTime] = useState(0);
  const [windTurbulence, setWindTurbulence] = useState(0.3);
  const [brushPosition] = useState<THREE.Vector3 | null>(null);

  const updateFoliageType = useCallback((typeId: string, patch: Partial<FoliageType>) => {
    setFoliageTypes((prev) =>
      prev.map((type) => (type.id === typeId ? { ...type, ...patch } : type)),
    );
  }, []);

  const updateSelectedTypes = useCallback(
    (patch: Partial<FoliageType>) => {
      if (selectedTypes.length === 0) return;
      setFoliageTypes((prev) =>
        prev.map((type) => (selectedTypes.includes(type.id) ? { ...type, ...patch } : type)),
      );
    },
    [selectedTypes],
  );

  const activeCamada = useMemo(() =>
    layers.find((l) => l.id === activeCamadaId),
    [layers, activeCamadaId]
  );

  const instanceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    layers.forEach((layer) => {
      layer.instancias.forEach((inst) => {
        counts[inst.typeId] = (counts[inst.typeId] || 0) + 1;
      });
    });
    return counts;
  }, [layers]);

  const visibleInstances = useMemo(() =>
    layers.filter((l) => l.visible).flatMap((l) => l.instancias),
    [layers]
  );

  const handlePintar = useCallback((point: THREE.Vector3) => {
    if (!activeCamada || activeCamada.locked || selectedTypes.length === 0) return;

    if (brushSettings.tool === 'paint') {
      setLayers((prev) =>
        applyFoliagePaintStroke({
          point,
          layers: prev,
          activeCamadaId,
          selectedTypes,
          foliageTypes,
          brush: brushSettings,
        }),
      );
    } else if (brushSettings.tool === 'erase') {
      setLayers((prev) =>
        applyFoliageEraseStroke({
          point,
          layers: prev,
          activeCamadaId,
          radius: brushSettings.radius,
        }),
      );
    }
  }, [activeCamada, activeCamadaId, selectedTypes, brushSettings, foliageTypes]);

  const toggleTypeSelecionarion = useCallback((typeId: string) => {
    setSelecionaredTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  }, []);

  const addCamada = useCallback(() => {
    const newCamada: FoliageCamada = {
      id: `layer_${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      types: [],
      instancias: [],
    };
    setLayers((prev) => [...prev, newCamada]);
    setActiveCamadaId(newCamada.id);
  }, [layers.length]);

  const deleteCamada = useCallback((layerId: string) => {
    if (layers.length <= 1) return;
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (activeCamadaId === layerId) {
      setActiveCamadaId(layers[0].id);
    }
  }, [layers, activeCamadaId]);

  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setWindTime((t) => t + 0.05 * (1 + windTurbulence));
    }, 16);
    return () => clearInterval(interval);
  }, [isSimulating, windTurbulence]);

  const clearAll = useCallback(() => {
    setLayers((prev) => prev.map((l) => ({ ...l, instancias: [] })));
  }, []);

  return (
    <div className="flex h-full w-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)]">
      <div className="w-64 border-r border-[var(--aethel-border-primary)] flex flex-col">
        <div className="p-3 border-b border-[var(--aethel-border-primary)]">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TreeDeciduous className="w-4 h-4 text-[var(--aethel-success)]" />
            Foliage types
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {foliageTypes.map((type) => (
            <FoliageTypeCard
              key={type.id}
              type={type}
              isSelecionared={selectedTypes.includes(type.id)}
              onSelecionar={() => toggleTypeSelecionarion(type.id)}
              instanceCount={instanceCounts[type.id] || 0}
            />
          ))}
        </div>

        <div className="border-t border-[var(--aethel-border-primary)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--aethel-text-tertiary)]">Layers</span>
            <button type="button" aria-label="Add foliage layer"
              onClick={addCamada}
              className="p-1 rounded bg-[var(--aethel-success)]/30 hover:bg-[var(--aethel-success)]/50"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {layers.map((layer) => (
              <CamadaItem
                key={layer.id}
                layer={layer}
                isSelecionared={activeCamadaId === layer.id}
                onSelecionar={() => setActiveCamadaId(layer.id)}
                onToggleVisibility={() => {
                  setLayers((prev) => prev.map((l) =>
                    l.id === layer.id ? { ...l, visible: !l.visible } : l
                  ));
                }}
                onToggleLock={() => {
                  setLayers((prev) => prev.map((l) =>
                    l.id === layer.id ? { ...l, locked: !l.locked } : l
                  ));
                }}
                onDelete={() => deleteCamada(layer.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <Canvas camera={{ position: [20, 20, 20], fov: 50 }} shadows>
          <color attach="background" args={[backgroundColor]} />
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[20, 30, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <TerrainMesh
            onPintar={handlePintar}
            brushPosition={brushPosition}
            brushRaio={brushSettings.radius}
            showBrush={brushSettings.tool === 'paint' || brushSettings.tool === 'erase'}
          />
          <FoliageInstances3D
            instancias={visibleInstances}
            types={foliageTypes}
            windTime={windTime}
          />
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
        </Canvas>

        <div className="absolute top-4 left-4 flex gap-2">
          <div className="flex bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] rounded overflow-hidden">
            <button type="button" aria-label="Activate paint foliage tool"
              onClick={() => setBrushSettings((s) => ({ ...s, tool: 'paint' }))}
              className={`p-2 ${brushSettings.tool === 'paint' ? 'bg-[var(--aethel-success)]' : 'hover:bg-[var(--aethel-surface-quaternary)]'}`}
              title="Paint"
            >
              <Brush className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Activate erase foliage tool"
              onClick={() => setBrushSettings((s) => ({ ...s, tool: 'erase' }))}
              className={`p-2 ${brushSettings.tool === 'erase' ? 'bg-[var(--aethel-error)]' : 'hover:bg-[var(--aethel-surface-quaternary)]'}`}
              title="Erase"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Activate select foliage tool"
              onClick={() => setBrushSettings((s) => ({ ...s, tool: 'select' }))}
              className={`p-2 ${brushSettings.tool === 'select' ? 'bg-[var(--aethel-primary)]' : 'hover:bg-[var(--aethel-surface-quaternary)]'}`}
              title="Select"
            >
              <Move className="w-4 h-4" />
            </button>
          </div>
          <button type="button" aria-label={isSimulating ? 'Stop foliage wind simulation' : 'Start foliage wind simulation'}
            onClick={() => setIsSimulating(!isSimulating)}
            className={`p-2 rounded ${isSimulating ? 'bg-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)]'}`}
            title={isSimulating ? 'Stop Wind' : 'Simulate Wind'}
          >
            <Wind className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Clear all foliage instances"
            onClick={clearAll}
            className="p-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] hover:bg-[var(--aethel-error)]/50"
            title="Clear all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Export foliage data"
            onClick={() => onExport?.({ layers, types: foliageTypes })}
            className="p-2 rounded bg-[var(--aethel-success)] hover:bg-[var(--aethel-success)]"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute bottom-4 left-4">
          <FoliageStats layers={layers} types={foliageTypes} />
        </div>
      </div>

      <div className="w-72 border-l border-[var(--aethel-border-primary)] overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[var(--aethel-success)]" />
            Brush settings
          </h2>

          <CollapsibleSection title="Brush" icon={<Brush className="w-4 h-4 text-[var(--aethel-info)]" />}>
            <Slider
              label="Radius"
              value={brushSettings.radius}
              min={0.5}
              max={10}
              step={0.5}
              unit="m"
              onChange={(v) => setBrushSettings((s) => ({ ...s, radius: v }))}
            />
            <Slider
              label="Density"
              value={brushSettings.density}
              min={0.1}
              max={1}
              onChange={(v) => setBrushSettings((s) => ({ ...s, density: v }))}
            />
            <Slider
              label="Falloff"
              value={brushSettings.falloff}
              min={0}
              max={1}
              onChange={(v) => setBrushSettings((s) => ({ ...s, falloff: v }))}
            />
          </CollapsibleSection>

          {selectedTypes.length === 1 && (
            <CollapsibleSection
              title="Type settings"
              icon={<TreeDeciduous className="w-4 h-4 text-[var(--aethel-success)]" />}
            >
              {(() => {
                const type = foliageTypes.find((t) => t.id === selectedTypes[0]);
                if (!type) return null;
                return (
                  <>
                    <div className="text-sm font-medium mb-3">{type.name}</div>
                    <Slider
                      label="Min scale"
                      value={type.scaleMin}
                      min={0.1}
                      max={2}
                      onChange={(value) =>
                        updateFoliageType(type.id, {
                          scaleMin: Math.min(value, type.scaleMax),
                        })
                      }
                    />
                    <Slider
                      label="Max scale"
                      value={type.scaleMax}
                      min={0.5}
                      max={3}
                      onChange={(value) =>
                        updateFoliageType(type.id, {
                          scaleMax: Math.max(value, type.scaleMin),
                        })
                      }
                    />
                    <label className="flex items-center gap-2 mb-2 text-xs">
                      <input
                        type="checkbox"
                        checked={type.rotationYRandom}
                        className="rounded"
                        onChange={(event) =>
                          updateFoliageType(type.id, { rotationYRandom: event.target.checked })
                        }
                      />
                      Random Y rotation
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={type.alignToNormal}
                        className="rounded"
                        onChange={(event) =>
                          updateFoliageType(type.id, { alignToNormal: event.target.checked })
                        }
                      />
                      Align to normal
                    </label>
                  </>
                );
              })()}
            </CollapsibleSection>
          )}

          <CollapsibleSection
            title="Constraints"
            icon={<Mountain className="w-4 h-4 text-[var(--aethel-warning)]" />}
            defaultOpen={false}
          >
            {(() => {
              const type = foliageTypes.find((t) => t.id === selectedTypes[0]) ?? foliageTypes[0];
              if (!type) return null;
              return (
                <>
                  <Slider
                    label="Minimum slope"
                    value={type.minSlope}
                    min={0}
                    max={90}
                    step={1}
                    unit="°"
                    onChange={(value) =>
                      updateSelectedTypes({ minSlope: Math.min(value, type.maxSlope) })
                    }
                  />
                  <Slider
                    label="Maximum slope"
                    value={type.maxSlope}
                    min={0}
                    max={90}
                    step={1}
                    unit="°"
                    onChange={(value) =>
                      updateSelectedTypes({ maxSlope: Math.max(value, type.minSlope) })
                    }
                  />
                  <Slider
                    label="Minimum height"
                    value={type.minHeight}
                    min={-500}
                    max={500}
                    step={10}
                    unit="m"
                    onChange={(value) =>
                      updateSelectedTypes({ minHeight: Math.min(value, type.maxHeight) })
                    }
                  />
                  <Slider
                    label="Maximum height"
                    value={type.maxHeight}
                    min={0}
                    max={1000}
                    step={10}
                    unit="m"
                    onChange={(value) =>
                      updateSelectedTypes({ maxHeight: Math.max(value, type.minHeight) })
                    }
                  />
                </>
              );
            })()}
          </CollapsibleSection>

          <CollapsibleSection
            title="Wind"
            icon={<Wind className="w-4 h-4 text-[var(--aethel-primary)]" />}
            defaultOpen={false}
          >
            {(() => {
              const type = foliageTypes.find((t) => t.id === selectedTypes[0]) ?? foliageTypes[0];
              if (!type) return null;
              return (
                <>
                  <label className="mb-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={type.windEnabled}
                      className="rounded"
                      onChange={(event) =>
                        updateSelectedTypes({ windEnabled: event.target.checked })
                      }
                    />
                    Enable wind
                  </label>
                  <Slider
                    label="Global strength"
                    value={type.windStrength}
                    min={0}
                    max={2}
                    onChange={(value) => updateSelectedTypes({ windStrength: value })}
                  />
                  <Slider
                    label="Turbulence"
                    value={windTurbulence}
                    min={0}
                    max={1}
                    onChange={setWindTurbulence}
                  />
                  <Slider
                    label="Frequency"
                    value={type.windFrequencia}
                    min={0.5}
                    max={5}
                    onChange={(value) => updateSelectedTypes({ windFrequencia: value })}
                  />
                </>
              );
            })()}
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
