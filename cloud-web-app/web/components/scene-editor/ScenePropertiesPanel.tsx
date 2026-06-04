'use client';

import { PRIMITIVE_GEOMETRIES } from './scene-editor-models';
import type { SceneObject } from './scene-editor-models';

interface PropertiesPanelProps {
  object: SceneObject | null;
  onChange: (updates: Partial<SceneObject>) => void;
}

type RigidBodySettings = {
  type?: 'dynamic' | 'static' | 'kinematic' | string;
  mass?: number;
};

function asRigidBody(value: unknown): RigidBodySettings {
  return typeof value === 'object' && value !== null ? value as RigidBodySettings : {};
}

export function PropertiesPanel({ object, onChange }: PropertiesPanelProps) {
  if (!object) {
    return (
      <div style={{
        width: '280px',
        background: 'var(--aethel-surface-primary)',
        borderLeft: '1px solid var(--aethel-border-secondary)',
        padding: '16px',
        color: 'var(--aethel-text-quaternary)',
        fontSize: '13px',
      }}>
        Select an object to view its properties.
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
    background: 'var(--aethel-surface-tertiary)',
    border: '1px solid var(--aethel-border-primary)',
    borderRadius: '4px',
    color: 'var(--aethel-text-primary)',
    fontSize: '12px',
  };
  const labelStyle = {
    width: '20px',
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
  };
  const properties = object.properties;
  const rigidbody = asRigidBody(properties.rigidbody);
  return (
    <div style={{
      width: '280px',
      background: 'var(--aethel-surface-primary)',
      borderLeft: '1px solid var(--aethel-border-secondary)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid var(--aethel-border-secondary)',
      }}>
        <input
          type="text"
          value={object.name}
          onChange={(e) => onChange({ name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        />
      </div>
      {/* Transform */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--aethel-border-secondary)' }}>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>
          TRANSFORM
        </h4>
        {/* Position */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
            Position
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...labelStyle, color: 'var(--aethel-error-light)' }}>X</span>
            <input
              type="number"
              step="0.1"
              value={object.position[0].toFixed(2)}
              onChange={(e) => updatePosition(0, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: 'var(--aethel-success-light)' }}>Y</span>
            <input
              type="number"
              step="0.1"
              value={object.position[1].toFixed(2)}
              onChange={(e) => updatePosition(1, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: 'var(--aethel-info)' }}>Z</span>
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
          <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
            Rotation (degrees)
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...labelStyle, color: 'var(--aethel-error-light)' }}>X</span>
            <input
              type="number"
              step="1"
              value={(object.rotation[0] * (180 / Math.PI)).toFixed(0)}
              onChange={(e) => updateRotation(0, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: 'var(--aethel-success-light)' }}>Y</span>
            <input
              type="number"
              step="1"
              value={(object.rotation[1] * (180 / Math.PI)).toFixed(0)}
              onChange={(e) => updateRotation(1, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: 'var(--aethel-info)' }}>Z</span>
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
          <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
            Scale
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...labelStyle, color: 'var(--aethel-error-light)' }}>X</span>
            <input
              type="number"
              step="0.1"
              value={object.scale[0].toFixed(2)}
              onChange={(e) => updateScale(0, parseFloat(e.target.value) || 1)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: 'var(--aethel-success-light)' }}>Y</span>
            <input
              type="number"
              step="0.1"
              value={object.scale[1].toFixed(2)}
              onChange={(e) => updateScale(1, parseFloat(e.target.value) || 1)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: 'var(--aethel-info)' }}>Z</span>
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
          <div style={{ padding: '12px', borderBottom: '1px solid var(--aethel-border-secondary)' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>
              MESH
            </h4>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
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
                  background: 'var(--aethel-surface-tertiary)',
                  border: '1px solid var(--aethel-border-primary)',
                  borderRadius: '4px',
                  color: 'var(--aethel-text-primary)',
                }}
              >
                {Object.keys(PRIMITIVE_GEOMETRIES).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
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
                  border: '1px solid var(--aethel-border-primary)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
          {/* PHYSICS PANEL */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--aethel-border-secondary)' }}>
             <h4 style={{ margin: '0 0 12px 0', color: 'var(--aethel-text-tertiary)', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
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
                   <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>Type</div>
                   <select
                     value={rigidbody.type || 'dynamic'}
                     onChange={(e) => {
                       onChange({ properties: { ...properties, rigidbody: { ...rigidbody, type: e.target.value } } });
                     }}
                     style={{ width: '100%', background: 'var(--aethel-surface-tertiary)', color: 'var(--aethel-text-primary)', border: '1px solid var(--aethel-border-primary)', padding: '4px' }}
                   >
                     <option value="dynamic">Dynamic</option>
                     <option value="static">Static (Floor)</option>
                     <option value="kinematic">Kinematic</option>
                   </select>
                 </div>
                 <div style={{ marginBottom: '8px' }}>
                   <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>Mass</div>
                   <input
                     type="number"
                     step="0.1"
                     value={rigidbody.mass || 1}
                     onChange={(e) => {
                        onChange({ properties: { ...properties, rigidbody: { ...rigidbody, mass: parseFloat(e.target.value) } } });
                     }}
                     style={{ width: '100%', background: 'var(--aethel-surface-tertiary)', color: 'var(--aethel-text-primary)', border: '1px solid var(--aethel-border-primary)', padding: '4px' }}
                   />
                 </div>
               </>
             )}
          </div>
        </>
      )}
      {object.type === 'light' && (
        <div style={{ padding: '12px', borderBottom: '1px solid var(--aethel-border-secondary)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>
            LIGHT
          </h4>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
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
                background: 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '4px',
                color: 'var(--aethel-text-primary)',
              }}
            >
              <option value="point">Point</option>
              <option value="directional">Directional</option>
              <option value="spot">Spot</option>
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
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
            <div style={{ color: 'var(--aethel-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
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
                border: '1px solid var(--aethel-border-primary)',
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
