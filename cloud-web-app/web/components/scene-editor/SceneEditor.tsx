'use client';

// @aethel-heavy-async-boundary: loaded only through the /studio/level?tool=scene grouped dynamic import.

import { useState, useCallback, useEffect } from 'react';
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
function HierarchyPanel({
  objects,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onRename,
}: HierarchyPanelProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const renderObject = (obj: SceneObject, depth: number = 0) => (
    <div key={obj.id}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          paddingLeft: `${8 + depth * 16}px`,
          background: obj.id === selectedId ? 'var(--aethel-info)' : 'transparent',
          cursor: 'pointer',
          borderRadius: '4px',
          marginBottom: '2px',
        }}
        onClick={() => onSelect(obj.id)}
      >
        <span style={{ marginRight: '8px' }}>
          {obj.type === 'mesh' && 'Mesh'}
          {obj.type === 'light' && 'Light'}
          {obj.type === 'camera' && 'Camera'}
          {obj.type === 'empty' && 'Empty'}
        </span>
        <span style={{ flex: 1, fontSize: '13px' }}>{obj.name}</span>
        {obj.id === selectedId && (
          <button type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(obj.id);
            }}
            aria-label="Remove object from scene"
            style={{
              background: 'rgba(255,0,0,0.3)',
              border: 'none',
              borderRadius: '3px',
              color: 'var(--aethel-text-primary)',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            x
          </button>
        )}
      </div>
      {obj.children.map(child => renderObject(child, depth + 1))}
    </div>
  );
  return (
    <div style={{
      width: '250px',
      background: 'var(--aethel-surface-primary)',
      borderRight: '1px solid var(--aethel-border-secondary)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid var(--aethel-border-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 'bold', color: 'var(--aethel-text-primary)' }}>Hierarchy</span>
        <div style={{ position: 'relative' }}>
          <button type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              background: 'var(--aethel-info)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--aethel-text-primary)',
              padding: '4px 12px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            + Add
          </button>
          {showAddMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: 'var(--aethel-surface-secondary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '4px',
              padding: '8px 0',
              zIndex: 100,
              minWidth: '150px',
            }}>
              <div style={{ padding: '4px 12px', color: 'var(--aethel-text-tertiary)', fontSize: '11px' }}>
                3D Objects
              </div>
              {PRIMITIVE_GEOMETRY_TYPES.map(geom => (
                <button type="button"
                  key={geom}
                  onClick={() => {
                    onAdd('mesh', geom);
                    setShowAddMenu(false);
                  }}
                  aria-label={`Add ${geom} to scene`}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--aethel-text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {geom.charAt(0).toUpperCase() + geom.slice(1)}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--aethel-border-primary)', margin: '8px 0' }} />
              <div style={{ padding: '4px 12px', color: 'var(--aethel-text-tertiary)', fontSize: '11px' }}>
                Lights
              </div>
              <button type="button"
                onClick={() => { onAdd('light'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--aethel-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Point Light
              </button>
              <div style={{ borderTop: '1px solid var(--aethel-border-primary)', margin: '8px 0' }} />
              <button type="button"
                onClick={() => { onAdd('camera'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--aethel-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Camera
              </button>
              <button type="button"
                onClick={() => { onAdd('empty'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--aethel-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Empty Object
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Objects List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {objects.map(obj => renderObject(obj))}
        {objects.length === 0 && (
          <div style={{
            color: 'var(--aethel-text-quaternary)',
            textAlign: 'center',
            padding: '20px',
            fontSize: '13px'
          }}>
            Empty scene. Click &quot;+ Add&quot; to add objects.
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
  const buttonStyle = (active: boolean) => ({
    padding: '8px 12px',
    background: active ? 'var(--aethel-info)' : 'var(--aethel-surface-tertiary)',
    border: 'none',
    borderRadius: '4px',
    color: 'var(--aethel-text-primary)',
    cursor: 'pointer',
    fontWeight: active ? ('bold' as const) : ('normal' as const),
  });

  return (
    <div style={{
      height: '48px',
      background: 'var(--aethel-surface-primary)',
      borderBottom: '1px solid var(--aethel-border-secondary)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button type="button" onClick={() => onModeChange('translate')} style={buttonStyle(transformMode === 'translate')} title="Move (W)">
          Move
        </button>
        <button type="button" onClick={() => onModeChange('rotate')} style={buttonStyle(transformMode === 'rotate')} title="Rotate (E)">
          Rotate
        </button>
        <button type="button" onClick={() => onModeChange('scale')} style={buttonStyle(transformMode === 'scale')} title="Scale (R)">
          Scale
        </button>
      </div>
      <div style={{ width: '1px', height: '24px', background: 'var(--aethel-border-primary)' }} />
      <button type="button" onClick={onToggleGrid} aria-label={showGrid ? 'Hide scene grid' : 'Show scene grid'} aria-pressed={showGrid} style={buttonStyle(showGrid)}>
        {showGrid ? 'Grid on' : 'Grid off'}
      </button>
      <div style={{ flex: 1 }} />
      <button type="button" onClick={onPlay} style={{ ...buttonStyle(isPlaying), background: isPlaying ? 'var(--aethel-error)' : 'var(--aethel-success)', padding: '8px 24px' }}>
        {isPlaying ? 'Stop' : 'Play'}
      </button>
    </div>
  );
}

export function SceneEditor({ initialScene = [], onChange, onSelect }: SceneEditorProps) {
  const [objects, setObjects] = useState<SceneObject[]>(initialScene);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [showGrid, setShowGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const selectedObject = objects.find(o => o.id === selectedId) || null;
  useEffect(() => {
    onSelect?.(selectedId);
  }, [selectedId, onSelect]);
  useEffect(() => {
    onChange?.(objects);
  }, [objects, onChange]);
  const handleDelete = useCallback((id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w') setTransformMode('translate');
      if (e.key === 'e') setTransformMode('rotate');
      if (e.key === 'r') setTransformMode('scale');
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
    setObjects(prev => [...prev, newObject]);
    setSelectedId(newObject.id);
  }, []);
  const handleTransformChange = useCallback((
    id: string,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => {
    setObjects(prev => prev.map(obj =>
      obj.id === id ? { ...obj, position, rotation, scale } : obj
    ));
  }, []);
  const handlePropertyChange = useCallback((updates: Partial<SceneObject>) => {
    if (!selectedId) return;
    setObjects(prev => prev.map(obj =>
      obj.id === selectedId ? { ...obj, ...updates } : obj
    ));
  }, [selectedId]);
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--aethel-surface-primary)',
      color: 'var(--aethel-text-primary)',
    }}>
      <Toolbar
        transformMode={transformMode}
        onModeChange={setTransformMode}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((current) => !current)}
        onPlay={() => setIsPlaying((current) => !current)}
        isPlaying={isPlaying}
      />
      <div style={{ display: 'flex', flex: 1 }}>
        <HierarchyPanel
          objects={objects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAddObject}
          onDelete={handleDelete}
          onRename={(id, name) => {
            setObjects(prev => prev.map(o => o.id === id ? { ...o, name } : o));
          }}
        />
        <div style={{ flex: 1 }}>
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
        <PropertiesPanel
          object={selectedObject}
          onChange={handlePropertyChange}
        />
      </div>
    </div>
  );
}
export default SceneEditor;
