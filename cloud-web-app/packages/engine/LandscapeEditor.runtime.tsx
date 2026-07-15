'use client';

// @aethel-heavy-async-boundary
/**
 * Landscape/Terrain Editor — durable heightfield + splat paint + foliage + erosion + seeded noise (an/be/bf/bg/bh).
 * Brush → heightfield/splatmap/foliage authority API → refresh event → viewport sync.
 * Zero-MVP: no sin-wave mock / fake forests as shipped surface; empty/error paths honest.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import type * as THREE from 'three';
import { resolveCssVarColor } from '../../web/lib/style/resolve-css-var';
import { LandscapeScene } from './LandscapeEditor.scene-runtime';
import type { BrushSettings, TerrainConfig, TerrainLayer } from './LandscapeEditor.types';
import { BrushPanel, LayersPanel, Toolbar } from '../../web/components/engine/LandscapeEditorPanels';
import { resolveProjectIdFromClient } from '../../web/components/engine/level-editor-core';
import {
  ensureLandscapeHeightfield,
  landscapeAuthorityStatus,
  landscapeBrushToTerrainStroke,
  persistLandscapeStroke,
  replaceLandscapeHeightfield,
} from '../../web/lib/production/landscape-heightfield-bridge';
import {
  ensureLandscapeSplatmap,
  landscapeBrushToSplatStroke,
  landscapeSplatAuthorityStatus,
  persistLandscapeSplatStroke,
  replaceLandscapeSplatmap,
} from '../../web/lib/production/landscape-splatmap-bridge';
import {
  ensureLandscapeFoliage,
  landscapeBrushToFoliageStroke,
  landscapeFoliageAuthorityStatus,
  persistLandscapeFoliageStroke,
} from '../../web/lib/production/landscape-foliage-bridge';
import {
  createFlatHeightfield,
  type HeightfieldDocument,
} from '../../web/lib/production/terrain-heightfield-math';
import type { SplatmapDocument } from '../../web/lib/production/terrain-splatmap-math';
import {
  defaultFoliageTypes,
  type FoliageDocument,
  type FoliageInstanceRecord,
  type FoliageTypeMeta,
} from '../../web/lib/production/terrain-foliage-math';
import { createComponentLogger } from '../../web/lib/observability/logger';
import type { FoliageType } from './LandscapeEditor.types';

const log = createComponentLogger('LandscapeEditor');

export type {
  BrushMode,
  BrushSettings,
  FoliageType,
  SculptOperation,
  TerrainConfig,
  TerrainLayer,
} from './LandscapeEditor.types';

export interface LandscapeEditorProps {
  onSave?: (heightmap: Float32Array, config: TerrainConfig) => void;
  projectId?: string | null;
  terrainId?: string;
}

function docToConfig(doc: HeightfieldDocument, layers: TerrainLayer[], foliage: TerrainConfig['foliage']): TerrainConfig {
  return {
    width: doc.meta.widthMeters,
    height: doc.meta.depthMeters,
    resolution: doc.meta.resolution,
    maxHeight: doc.meta.maxHeight,
    layers,
    foliage,
  };
}

function layersToSplatMeta(layers: TerrainLayer[]) {
  return layers.slice(0, 8).map((l) => ({ id: l.id, name: l.name, color: l.color }));
}

function foliageMetaToConfig(types: FoliageTypeMeta[]): FoliageType[] {
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    mesh: '',
    density: 0.5,
    minScale: t.minScale,
    maxScale: t.maxScale,
    alignToNormal: false,
    randomYaw: true,
    color: t.color,
    category: t.category,
  }));
}

const DEFAULT_LAYERS: TerrainLayer[] = [
  { id: '1', name: 'Grass', texture: '', tiling: 10, color: 'rgb(74 124 79)', blendWeight: 1, minSlope: 0, maxSlope: 0.3, minHeight: 0, maxHeight: 0.3 },
  { id: '2', name: 'Rock', texture: '', tiling: 5, color: 'rgb(107 107 107)', blendWeight: 1, minSlope: 0.3, maxSlope: 1, minHeight: 0.3, maxHeight: 0.7 },
  { id: '3', name: 'Snow', texture: '', tiling: 8, color: 'rgb(232 232 232)', blendWeight: 1, minSlope: 0, maxSlope: 0.5, minHeight: 0.7, maxHeight: 1 },
];

const DEFAULT_FOLIAGE: FoliageType[] = foliageMetaToConfig(defaultFoliageTypes());

export default function LandscapeEditor({ onSave, projectId: projectIdProp, terrainId = 'default' }: LandscapeEditorProps) {
  const projectId = useMemo(
    () => (projectIdProp?.trim() ? projectIdProp.trim() : resolveProjectIdFromClient()),
    [projectIdProp],
  );

  const [config, setConfig] = useState<TerrainConfig>({
    width: 256,
    height: 256,
    resolution: 129,
    maxHeight: 64,
    layers: DEFAULT_LAYERS,
    foliage: DEFAULT_FOLIAGE,
  });

  const [heightmap, setHeightmap] = useState<Float32Array>(() => new Float32Array(129 * 129));
  const [splatWeights, setSplatWeights] = useState<Float32Array | null>(null);
  const [splatLayerCount, setSplatLayerCount] = useState(0);
  const [foliageInstances, setFoliageInstances] = useState<FoliageInstanceRecord[]>([]);
  const docRef = useRef<HeightfieldDocument | null>(null);
  const splatRef = useRef<SplatmapDocument | null>(null);
  const foliageRef = useRef<FoliageDocument | null>(null);

  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 10,
    strength: 0.5,
    falloff: 1.5,
    mode: 'sculpt',
    operation: 'raise',
  });

  const [brushActive, setBrushActive] = useState(false);
  const [brushBusy, setBrushBusy] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<string | null>('1');
  const [selectedFoliageTypeId, setSelectedFoliageTypeId] = useState<string | null>('tree-1');
  const [activePanel, setActivePanel] = useState<'brush' | 'layers'>('brush');
  const [authorityLabel, setAuthorityLabel] = useState('Loading heightfield…');
  const [authorityError, setAuthorityError] = useState<string | null>(null);
  const [heldHint, setHeldHint] = useState<string | null>(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [paintStrokeCount, setPaintStrokeCount] = useState(0);
  const [foliageStrokeCount, setFoliageStrokeCount] = useState(0);
  const canvasBackground = useMemo(() => resolveCssVarColor('--aethel-info-light', 'rgb(135, 206, 235)'), []);

  const applyDoc = useCallback((doc: HeightfieldDocument) => {
    docRef.current = doc;
    setHeightmap(new Float32Array(doc.heights));
    setConfig((prev) => docToConfig(doc, prev.layers, prev.foliage));
    setStrokeCount(doc.meta.strokeCount);
    setAuthorityLabel(landscapeAuthorityStatus(doc).label);
    setAuthorityError(null);
  }, []);

  const applySplatDoc = useCallback((doc: SplatmapDocument) => {
    splatRef.current = doc;
    setSplatWeights(new Float32Array(doc.weights));
    setSplatLayerCount(doc.meta.layerCount);
    setPaintStrokeCount(doc.meta.strokeCount);
    setConfig((prev) => {
      const byId = new Map(doc.meta.layers.map((l) => [l.id, l]));
      const nextLayers = prev.layers.map((layer) => {
        const meta = byId.get(layer.id);
        return meta ? { ...layer, name: meta.name, color: meta.color } : layer;
      });
      // Prefer durable layer list when editor still on defaults / shorter
      if (doc.meta.layers.length && nextLayers.length === 0) {
        return {
          ...prev,
          layers: doc.meta.layers.map((l) => ({
            id: l.id,
            name: l.name,
            texture: '',
            tiling: 10,
            color: l.color,
            blendWeight: 1,
            minSlope: 0,
            maxSlope: 1,
            minHeight: 0,
            maxHeight: 1,
          })),
        };
      }
      return { ...prev, layers: nextLayers.length ? nextLayers : prev.layers };
    });
  }, []);

  const applyFoliageDoc = useCallback((doc: FoliageDocument) => {
    foliageRef.current = doc;
    setFoliageInstances(doc.instances.map((i) => ({ ...i })));
    setFoliageStrokeCount(doc.meta.strokeCount);
    setConfig((prev) => ({
      ...prev,
      foliage: doc.meta.types.length ? foliageMetaToConfig(doc.meta.types) : prev.foliage,
    }));
    setSelectedFoliageTypeId((prev) => {
      if (doc.meta.types.some((t) => t.id === prev)) return prev;
      return doc.meta.types[0]?.id ?? prev;
    });
  }, []);

  // Load / ensure durable heightfield + splat + foliage substrates
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!projectId?.trim()) {
        setAuthorityError('Open a project to load the durable heightfield.');
        setAuthorityLabel('No project — brush blocked');
        docRef.current = null;
        splatRef.current = null;
        foliageRef.current = null;
        return;
      }
      try {
        setAuthorityLabel('Loading disk heightfield…');
        const doc = await ensureLandscapeHeightfield({
          projectId: projectId.trim(),
          terrainId,
          resolution: 129,
          widthMeters: 256,
          depthMeters: 256,
          maxHeight: 64,
        });
        if (cancelled) return;
        applyDoc(doc);
        const splat = await ensureLandscapeSplatmap({
          projectId: projectId.trim(),
          terrainId,
          resolution: doc.meta.resolution,
          layers: layersToSplatMeta(DEFAULT_LAYERS),
        });
        if (cancelled) return;
        applySplatDoc(splat);
        const foliage = await ensureLandscapeFoliage({
          projectId: projectId.trim(),
          terrainId,
          types: defaultFoliageTypes(),
        });
        if (cancelled) return;
        applyFoliageDoc(foliage);
        setAuthorityLabel(
          `${landscapeAuthorityStatus(doc).label} · ${landscapeSplatAuthorityStatus(splat).label} · ${landscapeFoliageAuthorityStatus(foliage).label}`,
        );
      } catch (err) {
        if (cancelled) return;
        const text = err instanceof Error ? err.message : 'Failed to load heightfield';
        setAuthorityError(text);
        setAuthorityLabel('Heightfield load failed');
        docRef.current = null;
        log.warn('landscape_heightfield_load_failed', { error: text });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyDoc, applyFoliageDoc, applySplatDoc, projectId, terrainId]);

  const handleDurableBrush = useCallback(async (point: THREE.Vector3) => {
    if (brushBusy) return;
    if (!projectId?.trim()) {
      setAuthorityError('Open a project before applying terrain strokes.');
      return;
    }
    if (!docRef.current) {
      setAuthorityError('No durable heightfield substrate — reload or open a project.');
      return;
    }

    const extents = {
      widthMeters: config.width,
      depthMeters: config.height,
      resolution: config.resolution,
    };

    // Letter be — paint → splatmap authority
    if (brushSettings.mode === 'paint') {
      if (!splatRef.current) {
        setAuthorityError('No durable splatmap substrate — reload or open a project.');
        return;
      }
      const mapped = landscapeBrushToSplatStroke(
        { x: point.x, z: point.z },
        { ...brushSettings, selectedLayerId: selectedLayer },
        extents,
        config.layers,
      );
      if ('held' in mapped) {
        setHeldHint(mapped.held);
        return;
      }
      setHeldHint(null);
      setBrushBusy(true);
      try {
        const next = await persistLandscapeSplatStroke({
          projectId: projectId.trim(),
          terrainId,
          stroke: mapped.stroke,
          localDoc: splatRef.current,
        });
        applySplatDoc(next);
        setAuthorityLabel(
          `${landscapeAuthorityStatus(docRef.current).label} · ${landscapeSplatAuthorityStatus(next).label} · ${landscapeFoliageAuthorityStatus(foliageRef.current).label}`,
        );
        onSave?.(docRef.current.heights, docToConfig(docRef.current, config.layers, config.foliage));
      } catch (err) {
        const text = err instanceof Error ? err.message : 'Paint persist failed';
        setAuthorityError(text);
        log.warn('landscape_paint_persist_failed', { error: text });
      } finally {
        setBrushBusy(false);
      }
      return;
    }

    // Letter bf — foliage → foliage authority → InstancedMesh
    if (brushSettings.mode === 'foliage') {
      if (!foliageRef.current) {
        setAuthorityError('No durable foliage substrate — reload or open a project.');
        return;
      }
      const mapped = landscapeBrushToFoliageStroke(
        { x: point.x, z: point.z },
        { ...brushSettings, selectedFoliageTypeId },
        extents,
        config.foliage,
      );
      if ('held' in mapped) {
        setHeldHint(mapped.held);
        return;
      }
      setHeldHint(null);
      setBrushBusy(true);
      try {
        const heightSample = {
          resolution: docRef.current.meta.resolution,
          widthMeters: docRef.current.meta.widthMeters,
          depthMeters: docRef.current.meta.depthMeters,
          maxHeight: docRef.current.meta.maxHeight,
          heights: docRef.current.heights,
        };
        const next = await persistLandscapeFoliageStroke({
          projectId: projectId.trim(),
          terrainId,
          stroke: mapped.stroke,
          localDoc: foliageRef.current,
          heightSample,
        });
        applyFoliageDoc(next);
        setAuthorityLabel(
          `${landscapeAuthorityStatus(docRef.current).label} · ${landscapeSplatAuthorityStatus(splatRef.current).label} · ${landscapeFoliageAuthorityStatus(next).label}`,
        );
        onSave?.(docRef.current.heights, docToConfig(docRef.current, config.layers, config.foliage));
      } catch (err) {
        const text = err instanceof Error ? err.message : 'Foliage persist failed';
        setAuthorityError(text);
        log.warn('landscape_foliage_persist_failed', { error: text });
      } finally {
        setBrushBusy(false);
      }
      return;
    }

    const mapped = landscapeBrushToTerrainStroke(
      { x: point.x, z: point.z },
      brushSettings,
      extents,
    );

    if ('held' in mapped) {
      setHeldHint(mapped.held);
      return;
    }
    setHeldHint(null);
    setBrushBusy(true);
    try {
      const next = await persistLandscapeStroke({
        projectId: projectId.trim(),
        terrainId,
        stroke: mapped.stroke,
        localDoc: docRef.current,
      });
      applyDoc(next);
      onSave?.(next.heights, docToConfig(next, config.layers, config.foliage));
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Stroke persist failed';
      setAuthorityError(text);
      log.warn('landscape_stroke_persist_failed', { error: text });
    } finally {
      setBrushBusy(false);
    }
  }, [applyDoc, applyFoliageDoc, applySplatDoc, brushBusy, brushSettings, config, onSave, projectId, selectedFoliageTypeId, selectedLayer, terrainId]);

  /** Explicit generate — persists full field to disk (not a silent mock ship). */
  const handleGenerateTerrain = useCallback(async (type: string) => {
    const res = config.resolution;
    const newHeightmap = new Float32Array(res * res);

    for (let z = 0; z < res; z++) {
      for (let x = 0; x < res; x++) {
        const nx = x / res - 0.5;
        const nz = z / res - 0.5;
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
          case 'canyon': {
            const canyonDist = Math.abs(nx);
            height = canyonDist < 0.1 ? 0.1 : 0.5 + Math.sin(z * 0.1) * 0.1;
            break;
          }
          default:
            height = 0;
        }

        newHeightmap[z * res + x] = Math.max(0, Math.min(1, height));
      }
    }

    const base = docRef.current ?? createFlatHeightfield({
      resolution: res,
      widthMeters: config.width,
      depthMeters: config.height,
      maxHeight: config.maxHeight,
    });
    const doc: HeightfieldDocument = {
      meta: {
        ...base.meta,
        resolution: res,
        widthMeters: config.width,
        depthMeters: config.height,
        maxHeight: config.maxHeight,
        strokeCount: base.meta.strokeCount + 1,
        updatedAt: new Date().toISOString(),
      },
      heights: newHeightmap,
    };

    if (!projectId?.trim()) {
      setAuthorityError('Open a project to persist generated terrain.');
      setHeightmap(newHeightmap);
      return;
    }

    setBrushBusy(true);
    try {
      const saved = await replaceLandscapeHeightfield({
        projectId: projectId.trim(),
        terrainId,
        document: doc,
      });
      applyDoc(saved);
      setHeldHint(type === 'flat' ? null : `Preset "${type}" persisted to disk authority (explicit generate)`);
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Generate persist failed';
      setAuthorityError(text);
      log.warn('landscape_generate_persist_failed', { error: text });
    } finally {
      setBrushBusy(false);
    }
  }, [applyDoc, config.height, config.maxHeight, config.resolution, config.width, projectId, terrainId]);

  const handleExport = useCallback(() => {
    const data = {
      config,
      heightmap: Array.from(heightmap),
      authority: docRef.current?.meta ?? null,
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'terrain.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [config, heightmap]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as {
          config?: TerrainConfig;
          heightmap?: number[];
        };
        if (!data.config || !data.heightmap) throw new Error('Invalid terrain.json');
        const heights = new Float32Array(data.heightmap);
        const nextConfig = data.config;
        setConfig(nextConfig);
        const doc: HeightfieldDocument = {
          meta: {
            resolution: nextConfig.resolution,
            widthMeters: nextConfig.width,
            depthMeters: nextConfig.height,
            maxHeight: nextConfig.maxHeight,
            version: 1,
            updatedAt: new Date().toISOString(),
            strokeCount: (docRef.current?.meta.strokeCount ?? 0) + 1,
          },
          heights,
        };
        if (!projectId?.trim()) {
          setAuthorityError('Open a project to persist imported terrain.');
          setHeightmap(heights);
          return;
        }
        const saved = await replaceLandscapeHeightfield({
          projectId: projectId.trim(),
          terrainId,
          document: doc,
        });
        applyDoc(saved);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Import failed';
        setAuthorityError(msg);
      }
    };
    input.click();
  }, [applyDoc, projectId, terrainId]);

  const handleAddLayer = useCallback(() => {
    const newLayer: TerrainLayer = {
      id: Date.now().toString(),
      name: `Layer ${config.layers.length + 1}`,
      texture: '',
      tiling: 10,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      blendWeight: 1,
      minSlope: 0,
      maxSlope: 1,
      minHeight: 0,
      maxHeight: 1,
    };
    const nextLayers = [...config.layers, newLayer].slice(0, 8);
    setConfig({ ...config, layers: nextLayers });
    // Persist layer meta into splat substrate when authority is live (weights stay; meta colors update)
    if (projectId?.trim() && splatRef.current) {
      const prev = splatRef.current;
      const res = prev.meta.resolution;
      const nextCount = nextLayers.length;
      const nextWeights = new Float32Array(res * res * nextCount);
      const prevCount = prev.meta.layerCount;
      for (let i = 0; i < res * res; i++) {
        for (let c = 0; c < Math.min(prevCount, nextCount); c++) {
          nextWeights[i * nextCount + c] = prev.weights[i * prevCount + c] ?? 0;
        }
        if (nextCount > prevCount) {
          nextWeights[i * nextCount + (nextCount - 1)] = 0;
        }
      }
      const nextDoc: SplatmapDocument = {
        meta: {
          ...prev.meta,
          layerCount: nextCount,
          layers: layersToSplatMeta(nextLayers),
          updatedAt: new Date().toISOString(),
        },
        weights: nextWeights,
      };
      void replaceLandscapeSplatmap({
        projectId: projectId.trim(),
        terrainId,
        document: nextDoc,
      })
        .then(applySplatDoc)
        .catch((err) => {
          const text = err instanceof Error ? err.message : 'Layer persist failed';
          setAuthorityError(text);
        });
    }
  }, [applySplatDoc, config, projectId, terrainId]);

  const handleUpdateLayer = useCallback((id: string, updates: Partial<TerrainLayer>) => {
    const nextLayers = config.layers.map((l) => (l.id === id ? { ...l, ...updates } : l));
    setConfig({ ...config, layers: nextLayers });
    if (projectId?.trim() && splatRef.current && (updates.color !== undefined || updates.name !== undefined)) {
      const prev = splatRef.current;
      const nextDoc: SplatmapDocument = {
        meta: {
          ...prev.meta,
          layers: layersToSplatMeta(nextLayers),
          updatedAt: new Date().toISOString(),
        },
        weights: prev.weights,
      };
      void replaceLandscapeSplatmap({
        projectId: projectId.trim(),
        terrainId,
        document: nextDoc,
      })
        .then(applySplatDoc)
        .catch((err) => {
          const text = err instanceof Error ? err.message : 'Layer meta persist failed';
          setAuthorityError(text);
        });
    }
  }, [applySplatDoc, config, projectId, terrainId]);

  const handleRemoveLayer = useCallback((id: string) => {
    setConfig({
      ...config,
      layers: config.layers.filter((l) => l.id !== id),
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
      <Toolbar
        brushSettings={brushSettings}
        onBrushSettingsChange={setBrushSettings}
        brushActive={brushActive}
        onBrushActiveChange={setBrushActive}
        onGenerateTerrain={(type) => { void handleGenerateTerrain(type); }}
        onExport={handleExport}
        onImport={handleImport}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            shadows
            camera={{ position: [100, 80, 100], fov: 50 }}
            style={{ background: canvasBackground }}
          >
            <LandscapeScene
              heightmap={heightmap}
              config={config}
              brushSettings={brushSettings}
              brushActive={brushActive && !authorityError}
              onBrushStroke={(p) => { void handleDurableBrush(p); }}
              brushBusy={brushBusy}
              splatWeights={splatWeights}
              splatLayerCount={splatLayerCount}
              foliageInstances={foliageInstances}
            />
          </Canvas>
        </div>

        <div style={{
          width: '280px',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--aethel-border-primary)',
        }}>
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
                {panel === 'brush' ? 'Brush' : 'Layers'}
              </button>
            ))}
          </div>

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

      <div style={{
        padding: '6px 12px',
        background: 'var(--aethel-surface-tertiary)',
        borderTop: '1px solid var(--aethel-border-primary)',
        fontSize: '11px',
        color: 'var(--aethel-text-muted)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
      }}>
        <span>Resolution: {config.resolution}x{config.resolution}</span>
        <span>Size: {config.width}m x {config.height}m</span>
        <span>Max Height: {config.maxHeight}m</span>
        <span>Mode: {brushSettings.mode}</span>
        <span title="Durable heightfield + splat + foliage authority">
          {authorityLabel}
          {strokeCount > 0 ? ` · sculpt ${strokeCount}` : ''}
          {paintStrokeCount > 0 ? ` · paint ${paintStrokeCount}` : ''}
          {foliageStrokeCount > 0 ? ` · foliage ${foliageStrokeCount}` : ''}
          {foliageInstances.length > 0 ? ` · ${foliageInstances.length} plants` : ''}
        </span>
        {brushBusy ? <span>Persisting…</span> : null}
        {heldHint ? (
          <span role="status" style={{ color: 'var(--aethel-warning)' }}>{heldHint}</span>
        ) : null}
        {authorityError ? (
          <span role="alert" style={{ color: 'var(--aethel-danger)' }}>{authorityError}</span>
        ) : null}
        <span style={{
          marginLeft: 'auto',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: authorityError ? 'var(--aethel-danger)' : 'var(--aethel-success)',
        }}>
          {authorityError ? 'HELD / error' : 'Disk authority'}
        </span>
      </div>
    </div>
  );
}
