'use client';

// @aethel-heavy-async-boundary: loaded only through the /studio/level?tool=scene grouped dynamic import.

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Camera,
  CircleDot,
  Grid,
  Lightbulb,
  Move3D,
  Play,
  Plus,
  RotateCw,
  Scale3D,
  Square,
  Trash2,
} from 'lucide-react';
import StudioEngineModuleMiniPanel from '@/components/studio/StudioEngineModuleMiniPanel';
import { SceneViewportCanvas } from '@/lib/scene-editor/SceneEditor.canvas-runtime';
import { PropertiesPanel } from './ScenePropertiesPanel';
import { PRIMITIVE_GEOMETRY_TYPES } from './scene-editor-models';
import type { SceneEditorProps, SceneObject, TransformMode } from './scene-editor-models';

export type { SceneEditorProps, SceneObject, SnapSettings, TransformMode } from './scene-editor-models';

const SCENE_ENGINE_MODULES = ['behavior-tree-system'] as const;

interface HierarchyPanelProps {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: SceneObject['type'], geometry?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function getObjectIcon(type: SceneObject['type']) {
  switch (type) {
    case 'mesh':
      return <Box className="h-3.5 w-3.5 text-[var(--aethel-primary-light)] shrink-0" />;
    case 'light':
      return <Lightbulb className="h-3.5 w-3.5 text-[var(--aethel-warning-light)] shrink-0" />;
    case 'camera':
      return <Camera className="h-3.5 w-3.5 text-[var(--aethel-neon-cyan)] shrink-0" />;
    default:
      return <CircleDot className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)] shrink-0" />;
  }
}

function HierarchyPanel({
  objects,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onRename: _onRename,
}: HierarchyPanelProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const renderObject = (obj: SceneObject, depth: number = 0) => {
    const isSelected = obj.id === selectedId;
    return (
      <div key={obj.id}>
        <div
          onClick={() => onSelect(obj.id)}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 mb-0.5 ${
            isSelected
              ? 'border border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-text-primary)] shadow-sm'
              : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]'
          }`}
        >
          {getObjectIcon(obj.type)}
          <span className="flex-1 truncate">{obj.name}</span>
          {isSelected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(obj.id);
              }}
              aria-label="Remove object from scene"
              className="rounded p-1 text-[var(--aethel-text-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] hover:text-[var(--aethel-error-light)] transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        {obj.children.map((child) => renderObject(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex w-64 flex-col border-r border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] px-3 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          Scene Graph
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="inline-flex items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] px-2.5 py-1 text-xs font-semibold text-[var(--aethel-primary-light)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)] transition-all active:scale-95 shadow-sm"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
          {showAddMenu && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-1.5 shadow-[var(--aethel-shadow-lg)] backdrop-blur-md">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
                3D Primitives
              </div>
              {PRIMITIVE_GEOMETRY_TYPES.map((geom) => (
                <button
                  type="button"
                  key={geom}
                  onClick={() => {
                    onAdd('mesh', geom);
                    setShowAddMenu(false);
                  }}
                  aria-label={`Add ${geom} to scene`}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
                >
                  <Box className="h-3.5 w-3.5 text-[var(--aethel-primary-light)]" />
                  {geom.charAt(0).toUpperCase() + geom.slice(1)}
                </button>
              ))}
              <div className="my-1 border-t border-[var(--aethel-border-subtle)]" />
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
                Actors & Lights
              </div>
              <button
                type="button"
                onClick={() => {
                  onAdd('light');
                  setShowAddMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
              >
                <Lightbulb className="h-3.5 w-3.5 text-[var(--aethel-warning-light)]" />
                Point Light
              </button>
              <button
                type="button"
                onClick={() => {
                  onAdd('camera');
                  setShowAddMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
              >
                <Camera className="h-3.5 w-3.5 text-[var(--aethel-neon-cyan)]" />
                Camera
              </button>
              <button
                type="button"
                onClick={() => {
                  onAdd('empty');
                  setShowAddMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
              >
                <CircleDot className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
                Empty Transform
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Objects List */}
      <div className="flex-1 overflow-y-auto p-2">
        {objects.map((obj) => renderObject(obj))}
        {objects.length === 0 && (
          <div className="p-6 text-center text-xs text-[var(--aethel-text-quaternary)]">
            Empty scene. Click &quot;+ Add&quot; to spawn objects.
          </div>
        )}
      </div>
      <StudioEngineModuleMiniPanel title="Scene AI" moduleIds={SCENE_ENGINE_MODULES} />
    </div>
  );
}

interface ToolbarProps {
  transformMode: TransformMode;
  onModeChange: (mode: TransformMode) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onPlay: () => void;
  isPlaying: boolean;
}

function Toolbar({
  transformMode,
  onModeChange,
  showGrid,
  onToggleGrid,
  onPlay,
  isPlaying,
}: ToolbarProps) {
  const toolButton = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
      active
        ? 'border border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)] shadow-sm'
        : 'border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
    }`;

  return (
    <div className="flex h-12 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onModeChange('translate')}
            className={toolButton(transformMode === 'translate')}
            title="Move (W)"
          >
            <Move3D className="h-3.5 w-3.5" />
            <span>Move</span>
            <span className="font-mono text-[10px] opacity-50">W</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('rotate')}
            className={toolButton(transformMode === 'rotate')}
            title="Rotate (E)"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Rotate</span>
            <span className="font-mono text-[10px] opacity-50">E</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('scale')}
            className={toolButton(transformMode === 'scale')}
            title="Scale (R)"
          >
            <Scale3D className="h-3.5 w-3.5" />
            <span>Scale</span>
            <span className="font-mono text-[10px] opacity-50">R</span>
          </button>
        </div>

        <div className="h-5 w-px bg-[var(--aethel-border-subtle)] mx-1" />

        <button
          type="button"
          onClick={onToggleGrid}
          aria-label={showGrid ? 'Hide scene grid' : 'Show scene grid'}
          aria-pressed={showGrid}
          className={toolButton(showGrid)}
        >
          <Grid className="h-3.5 w-3.5" />
          <span>Grid</span>
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={onPlay}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 shadow-md ${
            isPlaying
              ? 'border border-[color-mix(in_srgb,var(--aethel-error)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_25%,transparent)] text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)]'
              : 'border border-[color-mix(in_srgb,var(--aethel-success)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_25%,transparent)] text-[var(--aethel-success-light)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)]'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current" /> Stop
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" /> Play Simulation
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function SceneEditor({ initialScene = [], onChange, onSelect }: SceneEditorProps) {
  const [objects, setObjects] = useState<SceneObject[]>(initialScene);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [showGrid, setShowGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedObject = objects.find((o) => o.id === selectedId) || null;

  useEffect(() => {
    onSelect?.(selectedId);
  }, [selectedId, onSelect]);

  useEffect(() => {
    onChange?.(objects);
  }, [objects, onChange]);

  const handleDelete = useCallback(
    (id: string) => {
      setObjects((prev) => prev.filter((o) => o.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
      if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
      if (e.key === 'Delete' && selectedId) {
        handleDelete(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, selectedId]);

  const handleAddObject = useCallback((type: SceneObject['type'], geometry?: string) => {
    const newObject: SceneObject = {
      id: `obj_${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      position: [0, type === 'light' ? 3 : 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      children: [],
      properties: {
        geometry: geometry || 'box',
        color: type === 'light' ? 0xffffff : 0x4a90d9,
        intensity: 1,
        lightType: 'point',
      },
    };
    setObjects((prev) => [...prev, newObject]);
    setSelectedId(newObject.id);
  }, []);

  const handleTransformChange = useCallback(
    (
      id: string,
      position: [number, number, number],
      rotation: [number, number, number],
      scale: [number, number, number],
    ) => {
      setObjects((prev) =>
        prev.map((obj) =>
          obj.id === id ? { ...obj, position, rotation, scale } : obj,
        ),
      );
    },
    [],
  );

  const handlePropertyChange = useCallback(
    (updates: Partial<SceneObject>) => {
      if (!selectedId) return;
      setObjects((prev) =>
        prev.map((obj) =>
          obj.id === selectedId ? { ...obj, ...updates } : obj,
        ),
      );
    },
    [selectedId],
  );

  return (
    <div className="flex h-full w-full flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <Toolbar
        transformMode={transformMode}
        onModeChange={setTransformMode}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((current) => !current)}
        onPlay={() => setIsPlaying((current) => !current)}
        isPlaying={isPlaying}
      />
      <div className="flex flex-1 overflow-hidden">
        <HierarchyPanel
          objects={objects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAddObject}
          onDelete={handleDelete}
          onRename={(id, name) => {
            setObjects((prev) => (prev.map((o) => (o.id === id ? { ...o, name } : o))));
          }}
        />
        <div className="flex-1 relative overflow-hidden bg-black/40">
          <SceneViewportCanvas
            objects={objects}
            selectedId={selectedId}
            transformMode={transformMode}
            onSelect={setSelectedId}
            onTransformChange={handleTransformChange}
            showGrid={showGrid}
            isPlaying={isPlaying}
          />
        </div>
        <PropertiesPanel object={selectedObject} onChange={handlePropertyChange} />
      </div>
    </div>
  );
}

export default SceneEditor;
