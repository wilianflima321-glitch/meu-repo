'use client';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Move, ChevronDown, ChevronRight, RotateCcw, Box, Zap, Cpu } from 'lucide-react';
import type { Euler, Vector3 } from 'three';
import { EditorScaleReadinessBadge } from '@/components/editor/EditorScaleReadinessBadge';
import { buildEditorScaleReadiness } from '@/lib/editor/editor-scale-readiness';
import { ComponentSection, PropertyRow, Vector3Editor } from './DetailsPanelEditors';
import type { ComponentDefinition, InspectedObject, PropertyDefinition } from './DetailsPanel.types';

export type { PropertyType, ComponentDefinition, InspectedObject } from './DetailsPanel.types';

type VectorLike = Vector3 & { clone?: () => Vector3; set?: (x: number, y: number, z: number) => Vector3 };
type EulerLike = Euler & { clone?: () => Euler; set?: (x: number, y: number, z: number) => Euler };

function makeVector3(x: number, y: number, z: number): Vector3 {
  return { x, y, z } as Vector3;
}

function makeEuler(x: number, y: number, z: number): Euler {
  return { x, y, z, order: 'XYZ' } as Euler;
}

function updateVector3(vector: Vector3, x: number, y: number, z: number): Vector3 {
  const candidate = vector as VectorLike;
  if (typeof candidate.clone === 'function') {
    const cloned = candidate.clone() as VectorLike;
    if (typeof cloned.set === 'function') {
      return cloned.set(x, y, z);
    }
  }
  return makeVector3(x, y, z);
}

function updateEuler(euler: Euler, x: number, y: number, z: number): Euler {
  const candidate = euler as EulerLike;
  if (typeof candidate.clone === 'function') {
    const cloned = candidate.clone() as EulerLike;
    if (typeof cloned.set === 'function') {
      return cloned.set(x, y, z);
    }
  }
  return makeEuler(x, y, z);
}

function radToDeg(value: number): number {
  return (value * 180) / Math.PI;
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function TransformSection({
  transform,
  onChange,
}: {
  transform: {
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
  };
  onChange: (transform: { position: Vector3; rotation: Euler; scale: Vector3 }) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{
      marginBottom: '8px',
      background: 'var(--aethel-surface-tertiary)',
      borderRadius: '6px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--aethel-surface-tertiary)',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: '10px', color: 'var(--aethel-text-muted)', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <Move className="w-4 h-4 text-indigo-400" />
        <span style={{
          flex: 1,
          fontWeight: 'bold',
          fontSize: '13px',
          color: 'var(--aethel-text-primary)',
        }}>
          Transform
        </span>
        {/* Reset button */}
        <button type="button" aria-label="Reset transform"
          onClick={(e) => {
            e.stopPropagation();
            onChange({
              position: makeVector3(0, 0, 0),
              rotation: makeEuler(0, 0, 0),
              scale: makeVector3(1, 1, 1),
            });
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--aethel-text-quaternary)',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '4px',
          }}
          title="Reset Transform"
        >
          ↺
        </button>
      </div>
      {expanded && (
        <div style={{ padding: '12px' }}>
          {/* Position */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--aethel-text-quaternary)' }}>Position</span>
              <button type="button" aria-label="Reset position"
                onClick={() => onChange({ ...transform, position: updateVector3(transform.position, 0, 0, 0) })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--aethel-text-muted)',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Reset
              </button>
            </div>
            <Vector3Editor
              value={{ x: transform.position.x, y: transform.position.y, z: transform.position.z }}
              onChange={(v) => onChange({ ...transform, position: updateVector3(transform.position, v.x, v.y, v.z) })}
            />
          </div>
          {/* Rotation */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--aethel-text-quaternary)' }}>Rotation</span>
              <button type="button" aria-label="Reset rotation"
                onClick={() => onChange({ ...transform, rotation: updateEuler(transform.rotation, 0, 0, 0) })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--aethel-text-muted)',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Reset
              </button>
            </div>
            <Vector3Editor
              value={{
                x: radToDeg(transform.rotation.x),
                y: radToDeg(transform.rotation.y),
                z: radToDeg(transform.rotation.z),
              }}
              onChange={(v) => onChange({
                ...transform,
                rotation: updateEuler(
                  transform.rotation,
                  degToRad(v.x),
                  degToRad(v.y),
                  degToRad(v.z),
                ),
              })}
            />
          </div>
          {/* Scale */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--aethel-text-quaternary)' }}>Scale</span>
              <button type="button" aria-label="Reset scale"
                onClick={() => onChange({ ...transform, scale: updateVector3(transform.scale, 1, 1, 1) })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--aethel-text-muted)',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Reset
              </button>
            </div>
            <Vector3Editor
              value={{ x: transform.scale.x, y: transform.scale.y, z: transform.scale.z }}
              onChange={(v) => onChange({ ...transform, scale: updateVector3(transform.scale, v.x, v.y, v.z) })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
export interface DetailsPanelProps {
  selectedObject?: InspectedObject | null;
  onObjectChange?: (object: InspectedObject) => void;
  onAddComponent?: (componentType: string) => void;
  onRemoveComponent?: (componentId: string) => void;
}
export default function DetailsPanel({
  selectedObject: initialObject,
  onObjectChange,
  onAddComponent,
  onRemoveComponent,
}: DetailsPanelProps) {
  const [selectedObject, setSelectedObject] = useState<InspectedObject | null>(initialObject || {
    id: '1',
    name: 'Player',
    type: 'Blueprint',
    icon: '📐',
    transform: {
      position: makeVector3(0, 1, 0),
      rotation: makeEuler(0, Math.PI / 4, 0),
      scale: makeVector3(1, 1, 1),
    },
    components: [
      {
        id: 'mesh',
        name: 'Static Mesh',
        icon: '🔷',
        enabled: true,
        properties: [
          { name: 'mesh', displayName: 'Mesh', type: 'asset', value: '/Meshes/Character.fbx', assetType: 'mesh' },
          { name: 'castShadow', displayName: 'Cast Shadow', type: 'boolean', value: true },
          { name: 'receiveShadow', displayName: 'Receive Shadow', type: 'boolean', value: true },
          { name: 'material', displayName: 'Material', type: 'asset', value: '/Materials/M_Character.mat', assetType: 'material' },
        ],
        removable: true,
      },
      {
        id: 'collider',
        name: 'Capsule Collider',
        icon: '⬭',
        enabled: true,
        properties: [
          { name: 'radius', displayName: 'Radius', type: 'number', value: 0.5, min: 0.01, step: 0.01 },
          { name: 'height', displayName: 'Height', type: 'number', value: 2, min: 0.1, step: 0.1 },
          { name: 'isTrigger', displayName: 'Is Trigger', type: 'boolean', value: false },
          { name: 'physicsMaterial', displayName: 'Physics Material', type: 'asset', value: null, assetType: 'physics', advanced: true },
        ],
        removable: true,
      },
      {
        id: 'rigidbody',
        name: 'Rigidbody',
        icon: '⚡',
        enabled: true,
        properties: [
          { name: 'mass', displayName: 'Mass', type: 'number', value: 80, min: 0.001, step: 1 },
          { name: 'drag', displayName: 'Drag', type: 'number', value: 0, min: 0, step: 0.01 },
          { name: 'angularDrag', displayName: 'Angular Drag', type: 'number', value: 0.05, min: 0, step: 0.01 },
          { name: 'useGravity', displayName: 'Use Gravity', type: 'boolean', value: true },
          { name: 'isKinematic', displayName: 'Is Kinematic', type: 'boolean', value: false },
          { name: 'interpolation', displayName: 'Interpolation', type: 'enum', value: 'interpolate', options: [
            { label: 'None', value: 'none' },
            { label: 'Interpolate', value: 'interpolate' },
            { label: 'Extrapolate', value: 'extrapolate' },
          ]},
          { name: 'collisionDetection', displayName: 'Collision Detection', type: 'enum', value: 'discrete', options: [
            { label: 'Discrete', value: 'discrete' },
            { label: 'Continuous', value: 'continuous' },
            { label: 'Continuous Dynamic', value: 'continuous_dynamic' },
          ], advanced: true },
        ],
        removable: true,
      },
      {
        id: 'character',
        name: 'Character Movement',
        icon: '🏃',
        enabled: true,
        properties: [
          { name: 'maxWalkSpeed', displayName: 'Max Walk Speed', type: 'number', value: 600, min: 0, step: 10 },
          { name: 'maxSprintSpeed', displayName: 'Max Sprint Speed', type: 'number', value: 1000, min: 0, step: 10 },
          { name: 'acceleration', displayName: 'Acceleration', type: 'number', value: 2000, min: 0, step: 100 },
          { name: 'jumpHeight', displayName: 'Jump Height', type: 'number', value: 420, min: 0, step: 10 },
          { name: 'airControl', displayName: 'Air Control', type: 'number', value: 0.2, min: 0, max: 1, step: 0.05 },
          { name: 'groundFriction', displayName: 'Ground Friction', type: 'number', value: 8, min: 0, step: 0.5, advanced: true },
          { name: 'brakingDeceleration', displayName: 'Braking Deceleration', type: 'number', value: 2000, min: 0, step: 100, advanced: true },
        ],
        removable: true,
      },
    ],
    staticProperties: [
      { name: 'tag', displayName: 'Tag', type: 'enum', value: 'Player', options: [
        { label: 'Untagged', value: 'Untagged' },
        { label: 'Player', value: 'Player' },
        { label: 'Enemy', value: 'Enemy' },
        { label: 'Pickup', value: 'Pickup' },
      ]},
      { name: 'layer', displayName: 'Layer', type: 'enum', value: 'Default', options: [
        { label: 'Default', value: 'Default' },
        { label: 'TransparentFX', value: 'TransparentFX' },
        { label: 'Ignore Raycast', value: 'IgnoreRaycast' },
        { label: 'Water', value: 'Water' },
        { label: 'UI', value: 'UI' },
      ]},
      { name: 'static', displayName: 'Static', type: 'boolean', value: false },
    ],
  });
  const [showAddComponent, setShowAddComponent] = useState(false);
  const availableComponents = [
    { type: 'mesh', name: 'Static Mesh', icon: '🔷' },
    { type: 'skeletal_mesh', name: 'Skeletal Mesh', icon: '🦴' },
    { type: 'collider_box', name: 'Box Collider', icon: '📦' },
    { type: 'collider_sphere', name: 'Sphere Collider', icon: '🔵' },
    { type: 'collider_capsule', name: 'Capsule Collider', icon: '⬭' },
    { type: 'rigidbody', name: 'Rigidbody', icon: '⚡' },
    { type: 'light', name: 'Light', icon: '💡' },
    { type: 'camera', name: 'Camera', icon: '📷' },
    { type: 'audio', name: 'Audio Source', icon: '🔊' },
    { type: 'particle', name: 'Particle System', icon: '✨' },
    { type: 'script', name: 'Script', icon: '📜' },
    { type: 'animator', name: 'Animator', icon: '🎬' },
    { type: 'nav_agent', name: 'Nav Mesh Agent', icon: '🧭' },
  ];
  const handleTransformChange = useCallback((transform: NonNullable<InspectedObject['transform']>) => {
    if (!selectedObject) return;
    const updated = { ...selectedObject, transform };
    setSelectedObject(updated);
    onObjectChange?.(updated);
  }, [selectedObject, onObjectChange]);
  const handlePropertyChange = useCallback((componentId: string, propertyName: string, value: unknown) => {
    if (!selectedObject) return;
    const updated = {
      ...selectedObject,
      components: selectedObject.components.map(comp => {
        if (comp.id === componentId) {
          return {
            ...comp,
            properties: comp.properties.map(prop =>
              prop.name === propertyName ? { ...prop, value } : prop
            ),
          };
        }
        return comp;
      }),
    };
    setSelectedObject(updated);
    onObjectChange?.(updated);
  }, [selectedObject, onObjectChange]);
  const handleComponentToggle = useCallback((componentId: string) => {
    if (!selectedObject) return;
    const updated = {
      ...selectedObject,
      components: selectedObject.components.map(comp =>
        comp.id === componentId ? { ...comp, enabled: !comp.enabled } : comp
      ),
    };
    setSelectedObject(updated);
    onObjectChange?.(updated);
  }, [selectedObject, onObjectChange]);
  const handleComponentRemove = useCallback((componentId: string) => {
    if (!selectedObject) return;
    const updated = {
      ...selectedObject,
      components: selectedObject.components.filter(comp => comp.id !== componentId),
    };
    setSelectedObject(updated);
    onObjectChange?.(updated);
    onRemoveComponent?.(componentId);
  }, [selectedObject, onObjectChange, onRemoveComponent]);
  const handleStaticPropertyChange = useCallback((propertyName: string, value: unknown) => {
    if (!selectedObject || !selectedObject.staticProperties) return;
    const updated = {
      ...selectedObject,
      staticProperties: selectedObject.staticProperties.map(prop =>
        prop.name === propertyName ? { ...prop, value } : prop
      ),
    };
    setSelectedObject(updated);
    onObjectChange?.(updated);
  }, [selectedObject, onObjectChange]);

  const detailsPropertyCount = useMemo(() => {
    if (!selectedObject) return 0;

    const staticCount = selectedObject.staticProperties?.length ?? 0;
    const componentCount = selectedObject.components.reduce(
      (total, component) => total + component.properties.length,
      0,
    );
    const transformCount = selectedObject.transform ? 9 : 0;

    return staticCount + componentCount + transformCount;
  }, [selectedObject]);

  const detailsScaleReadiness = useMemo(
    () => buildEditorScaleReadiness({
      lane: 'details-panel',
      totalCount: detailsPropertyCount,
      visibleCount: detailsPropertyCount,
      virtualization: false,
    }),
    [detailsPropertyCount],
  );

  if (!selectedObject) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--aethel-surface-primary)',
        color: 'var(--aethel-text-primary)',
      }}>
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--aethel-border-primary)',
          fontWeight: 'bold',
          fontSize: '13px',
          background: 'var(--aethel-surface-tertiary)',
        }}>
          📋 Details
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--aethel-text-muted)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
            <div>Select an object to view details</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--aethel-surface-primary)',
      color: 'var(--aethel-text-primary)',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--aethel-border-primary)',
        fontWeight: 'bold',
        fontSize: '13px',
        background: 'var(--aethel-surface-tertiary)',
      }}>
        📋 Details
      </div>
      <EditorScaleReadinessBadge readiness={detailsScaleReadiness} />
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {/* Object Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px',
          background: 'var(--aethel-surface-tertiary)',
          borderRadius: '6px',
        }}>
          <span style={{ fontSize: '32px' }}>{selectedObject.icon}</span>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={selectedObject.name}
              onChange={(e) => {
                const updated = { ...selectedObject, name: e.target.value };
                setSelectedObject(updated);
                onObjectChange?.(updated);
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--aethel-text-primary)',
                fontSize: '18px',
                fontWeight: 'bold',
                padding: 0,
              }}
            />
            <div style={{ fontSize: '12px', color: 'var(--aethel-text-muted)', marginTop: '2px' }}>
              {selectedObject.type}
            </div>
          </div>
        </div>
        {/* Static Properties */}
        {selectedObject.staticProperties && selectedObject.staticProperties.length > 0 && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            background: 'var(--aethel-surface-tertiary)',
            borderRadius: '6px',
          }}>
            {selectedObject.staticProperties.map((prop) => (
              <PropertyRow
                key={prop.name}
                property={prop}
                onChange={(value) => handleStaticPropertyChange(prop.name, value)}
              />
            ))}
          </div>
        )}
        {/* Transform */}
        {selectedObject.transform && (
          <TransformSection
            transform={selectedObject.transform}
            onChange={handleTransformChange}
          />
        )}
        {/* Components */}
        {selectedObject.components.map((component) => (
          <ComponentSection
            key={component.id}
            component={component}
            onPropertyChange={(name, value) => handlePropertyChange(component.id, name, value)}
            onToggleEnabled={() => handleComponentToggle(component.id)}
            onRemove={() => handleComponentRemove(component.id)}
          />
        ))}
        {/* Add Component Button */}
        <div style={{ position: 'relative' }}>
          <button type="button" aria-label={showAddComponent ? 'Close add component menu' : 'Open add component menu'}
            onClick={() => setShowAddComponent(!showAddComponent)}
            style={{
              width: '100%',
              padding: '10px',
              background: 'var(--aethel-primary)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--aethel-text-primary)',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            ➕ Add Component
          </button>
          {showAddComponent && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: '4px',
              background: 'var(--aethel-surface-tertiary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '6px',
              padding: '8px',
              maxHeight: '300px',
              overflow: 'auto',
              zIndex: 100,
            }}>
              {availableComponents.map((comp) => (
                <button type="button" aria-label={`Add ${comp.name} component`}
                  key={comp.type}
                  onClick={() => {
                    onAddComponent?.(comp.type);
                    setShowAddComponent(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--aethel-text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--aethel-surface-quaternary)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                >
                  <span>{comp.icon}</span>
                  <span>{comp.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
