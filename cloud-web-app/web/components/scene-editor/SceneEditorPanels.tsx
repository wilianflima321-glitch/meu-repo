/**
 * Scene Editor side panels and toolbar
 */

'use client';

import React, { useState } from 'react';
import type { SceneObject, TransformMode } from './SceneEditor';

export interface HierarchyPanelProps {
  objects: SceneObject[];
  primitiveGeometries: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: SceneObject['type'], geometry?: string) => void;
  onDelete: (id: string) => void;
}

export function HierarchyPanel({ 
  objects, 
  primitiveGeometries,
  selectedId, 
  onSelect, 
  onAdd, 
  onDelete,
}: HierarchyPanelProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const typeLabel: Record<SceneObject['type'], string> = {
    mesh: 'Mesh',
    light: 'Light',
    camera: 'Camera',
    empty: 'Empty',
    prefab: 'Prefab',
  };

  const renderObject = (obj: SceneObject, depth: number = 0) => (
    <div key={obj.id}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          paddingLeft: `${8 + depth * 16}px`,
          background: obj.id === selectedId ? '#4a90d9' : 'transparent',
          cursor: 'pointer',
          borderRadius: '4px',
          marginBottom: '2px',
        }}
        onClick={() => onSelect(obj.id)}
      >
        <span style={{ marginRight: '8px', color: '#9ca3af', fontSize: '11px' }}>
          {typeLabel[obj.type]}
        </span>
        <span style={{ flex: 1, fontSize: '13px' }}>{obj.name}</span>
        {obj.id === selectedId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(obj.id);
            }}
            style={{
              background: 'rgba(255,0,0,0.3)',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Delete
          </button>
        )}
      </div>
      {obj.children.map(child => renderObject(child, depth + 1))}
    </div>
  );

  return (
    <div style={{
      width: '250px',
      background: '#1e1e1e',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 'bold', color: '#fff' }}>Hierarquia</span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              background: '#4a90d9',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
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
              background: '#2d2d2d',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '8px 0',
              zIndex: 100,
              minWidth: '150px',
            }}>
              <div style={{ padding: '4px 12px', color: '#888', fontSize: '11px' }}>
                3D Objects
              </div>
              {primitiveGeometries.map(geom => (
                <button
                  key={geom}
                  onClick={() => {
                    onAdd('mesh', geom);
                    setShowAddMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  🧊 {geom.charAt(0).toUpperCase() + geom.slice(1)}
                </button>
              ))}
              
              <div style={{ borderTop: '1px solid #444', margin: '8px 0' }} />
              <div style={{ padding: '4px 12px', color: '#888', fontSize: '11px' }}>
                Lights
              </div>
              <button
                onClick={() => { onAdd('light'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                💡 Point Light
              </button>
              
              <div style={{ borderTop: '1px solid #444', margin: '8px 0' }} />
              <button
                onClick={() => { onAdd('camera'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                📷 Camera
              </button>
              <button
                onClick={() => { onAdd('empty'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                📁 Empty Object
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
            color: '#666', 
            textAlign: 'center', 
            padding: '20px',
            fontSize: '13px'
          }}>
            Cena vazia. Clique em &quot;+ Add&quot; para adicionar objetos.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PROPERTIES PANEL
// ============================================================================

export interface PropertiesPanelProps {
  object: SceneObject | null;
  onChange: (updates: Partial<SceneObject>) => void;
}

export function PropertiesPanel({ object, onChange }: PropertiesPanelProps) {
  if (!object) {
    return (
      <div style={{
        width: '280px',
        background: '#1e1e1e',
        borderLeft: '1px solid #333',
        padding: '16px',
        color: '#666',
        fontSize: '13px',
      }}>
        Selecione um objeto para ver suas propriedades.
      </div>
    );
  }

  const updatePosition = (axis: number, value: number) => {
    const newPos: [number, number, number] = [...object.position];
    newPos[axis] = value;
    onChange({ position: newPos });
  };

  const updateRotation = (axis: number, value: number) => {
    const newRot: [number, number, number] = [...object.rotation];
    newRot[axis] = value * (Math.PI / 180); // Degrees to radians
    onChange({ rotation: newRot });
  };

  const updateScale = (axis: number, value: number) => {
    const newScale: [number, number, number] = [...object.scale];
    newScale[axis] = value;
    onChange({ scale: newScale });
  };

  const inputStyle = {
    width: '60px',
    padding: '4px 8px',
    background: '#333',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
  };

  const labelStyle = {
    width: '20px',
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
  };

  const properties = object.properties as Record<string, any>;

  return (
    <div style={{
      width: '280px',
      background: '#1e1e1e',
      borderLeft: '1px solid #333',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #333',
      }}>
        <input
          type="text"
          value={object.name}
          onChange={(e) => onChange({ name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            background: '#333',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        />
      </div>

      {/* Transform */}
      <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '12px' }}>
          TRANSFORM
        </h4>

        {/* Position */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
            Position
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...labelStyle, color: '#ff6b6b' }}>X</span>
            <input
              type="number"
              step="0.1"
              value={object.position[0].toFixed(2)}
              onChange={(e) => updatePosition(0, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#51cf66' }}>Y</span>
            <input
              type="number"
              step="0.1"
              value={object.position[1].toFixed(2)}
              onChange={(e) => updatePosition(1, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#339af0' }}>Z</span>
            <input
              type="number"
              step="0.1"
              value={object.position[2].toFixed(2)}
              onChange={(e) => updatePosition(2, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Rotation */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
            Rotation (degrees)
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...labelStyle, color: '#ff6b6b' }}>X</span>
            <input
              type="number"
              step="1"
              value={(object.rotation[0] * (180 / Math.PI)).toFixed(0)}
              onChange={(e) => updateRotation(0, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#51cf66' }}>Y</span>
            <input
              type="number"
              step="1"
              value={(object.rotation[1] * (180 / Math.PI)).toFixed(0)}
              onChange={(e) => updateRotation(1, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#339af0' }}>Z</span>
            <input
              type="number"
              step="1"
              value={(object.rotation[2] * (180 / Math.PI)).toFixed(0)}
              onChange={(e) => updateRotation(2, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Scale */}
        <div>
          <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
            Scale
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...labelStyle, color: '#ff6b6b' }}>X</span>
            <input
              type="number"
              step="0.1"
              value={object.scale[0].toFixed(2)}
              onChange={(e) => updateScale(0, parseFloat(e.target.value) || 1)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#51cf66' }}>Y</span>
            <input
              type="number"
              step="0.1"
              value={object.scale[1].toFixed(2)}
              onChange={(e) => updateScale(1, parseFloat(e.target.value) || 1)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#339af0' }}>Z</span>
            <input
              type="number"
              step="0.1"
              value={object.scale[2].toFixed(2)}
              onChange={(e) => updateScale(2, parseFloat(e.target.value) || 1)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Type-specific properties */}
      {object.type === 'mesh' && (
        <>
          <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '12px' }}>
              MESH
            </h4>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
                Geometry
              </div>
              <select
                value={(object.properties.geometry as string) || 'box'}
                onChange={(e) => onChange({ 
                  properties: { ...object.properties, geometry: e.target.value } 
                })}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#333',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              >
                {Object.keys(PRIMITIVE_GEOMETRIES).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
                Color
              </div>
              <input
                type="color"
                value={`#${((object.properties.color as number) || 0x4a90d9).toString(16).padStart(6, '0')}`}
                onChange={(e) => onChange({
                  properties: { ...object.properties, color: parseInt(e.target.value.slice(1), 16) }
                })}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          {/* PHYSICS PANEL */}
          <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
             <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
               PHYSICS
               <input 
                 type="checkbox" 
                 checked={Boolean(properties.rigidbody)}
                 onChange={(e) => {
                   if (e.target.checked) {
                     onChange({ properties: { ...properties, rigidbody: { mass: 1, type: 'dynamic' } } });
                   } else {
                     const { rigidbody, ...rest } = properties;
                     onChange({ properties: rest });
                   }
                 }}
               />
             </h4>
             
             {Boolean(properties.rigidbody) && (
               <>
                 <div style={{ marginBottom: '8px' }}>
                   <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>Type</div>
                   <select
                     value={(properties.rigidbody as any).type || 'dynamic'}
                     onChange={(e) => {
                       const rb = properties.rigidbody as any;
                       onChange({ properties: { ...properties, rigidbody: { ...rb, type: e.target.value } } });
                     }}
                     style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #444', padding: '4px' }}
                   >
                     <option value="dynamic">Dynamic</option>
                     <option value="static">Static (Floor)</option>
                     <option value="kinematic">Kinematic</option>
                   </select>
                 </div>

                 <div style={{ marginBottom: '8px' }}>
                   <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>Mass</div>
                   <input
                     type="number"
                     step="0.1"
                     value={(properties.rigidbody as any).mass || 1}
                     onChange={(e) => {
                        const rb = properties.rigidbody as any;
                        onChange({ properties: { ...properties, rigidbody: { ...rb, mass: parseFloat(e.target.value) } } });
                     }}
                     style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #444', padding: '4px' }}
                   />
                 </div>
               </>
             )}
          </div>
        </>
      )}

      {object.type === 'light' && (
        <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '12px' }}>
            LIGHT
          </h4>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
              Type
            </div>
            <select
              value={(object.properties.lightType as string) || 'point'}
              onChange={(e) => onChange({
                properties: { ...object.properties, lightType: e.target.value }
              })}
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
              }}
            >
              <option value="point">Point</option>
              <option value="directional">Directional</option>
              <option value="spot">Spot</option>
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
              Intensity
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={(object.properties.intensity as number) || 1}
              onChange={(e) => onChange({
                properties: { ...object.properties, intensity: parseFloat(e.target.value) }
              })}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
              Color
            </div>
            <input
              type="color"
              value={`#${((object.properties.color as number) || 0xffffff).toString(16).padStart(6, '0')}`}
              onChange={(e) => onChange({
                properties: { ...object.properties, color: parseInt(e.target.value.slice(1), 16) }
              })}
              style={{
                width: '100%',
                height: '32px',
                padding: '0',
                border: '1px solid #444',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TOOLBAR
// ============================================================================

export interface ToolbarProps {
  transformMode: TransformMode;
  onModeChange: (mode: TransformMode) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onPlay: () => void;
  isPlaying: boolean;
}

export function Toolbar({ 
  transformMode, 
  onModeChange, 
  showGrid, 
  onToggleGrid, 
  onPlay, 
  isPlaying 
}: ToolbarProps) {
  const buttonStyle = (active: boolean) => ({
    padding: '8px 12px',
    background: active ? '#4a90d9' : '#333',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal' as 'bold' | 'normal',
  });

  return (
    <div style={{
      height: '48px',
      background: '#1e1e1e',
      borderBottom: '1px solid #333',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '8px',
    }}>
      {/* Transform tools */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onModeChange('translate')}
          style={buttonStyle(transformMode === 'translate')}
          title="Move (W)"
        >
          Move
        </button>
        <button
          onClick={() => onModeChange('rotate')}
          style={buttonStyle(transformMode === 'rotate')}
          title="Rotate (E)"
        >
          Rotate
        </button>
        <button
          onClick={() => onModeChange('scale')}
          style={buttonStyle(transformMode === 'scale')}
          title="Scale (R)"
        >
          Scale
        </button>
      </div>

      <div style={{ width: '1px', height: '24px', background: '#444' }} />

      {/* View options */}
      <button
        onClick={onToggleGrid}
        style={buttonStyle(showGrid)}
      >
        {showGrid ? 'Grid On' : 'Grid Off'}
      </button>

      <div style={{ flex: 1 }} />

      {/* Play button */}
      <button
        onClick={onPlay}
        style={{
          ...buttonStyle(isPlaying),
          background: isPlaying ? '#e74c3c' : '#27ae60',
          padding: '8px 24px',
        }}
      >
        {isPlaying ? 'Stop' : 'Play'}
      </button>
    </div>
  );
}
