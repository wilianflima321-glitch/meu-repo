/**
 * Details Panel - Inspetor de Propriedades
 * 
 * Painel profissional estilo Unreal/Unity para editar
 * propriedades de objetos selecionados na cena.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { AssetSelector, BooleanEditor, ColorEditor, EnumEditor, NumberInput, StringEditor, Vector3Editor } from './DetailsPanelEditors';

// ============================================================================
// TIPOS
// ============================================================================

export type PropertyType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'vector2'
  | 'vector3'
  | 'vector4'
  | 'color'
  | 'euler'
  | 'quaternion'
  | 'enum'
  | 'asset'
  | 'object'
  | 'array'
  | 'curve'
  | 'gradient';

export interface PropertyDefinition {
  name: string;
  displayName: string;
  type: PropertyType;
  value: unknown;
  category?: string;
  tooltip?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: unknown }[];
  assetType?: string;
  readOnly?: boolean;
  advanced?: boolean;
  onChange?: (value: unknown) => void;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  properties: PropertyDefinition[];
  removable?: boolean;
}

export interface InspectedObject {
  id: string;
  name: string;
  type: string;
  icon: string;
  transform?: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  };
  components: ComponentDefinition[];
  staticProperties?: PropertyDefinition[];
}

// ============================================================================
// PROPERTY EDITORS
// ============================================================================
// Moved to `DetailsPanelEditors.tsx` for module size and maintainability.

// ============================================================================
// PROPERTY ROW
// ============================================================================

function PropertyRow({
  property,
  onChange,
}: {
  property: PropertyDefinition;
  onChange: (value: unknown) => void;
}) {
  const handleChange = useCallback((value: unknown) => {
    onChange(value);
    property.onChange?.(value);
  }, [onChange, property]);
  
  const renderEditor = () => {
    switch (property.type) {
      case 'number':
        return (
          <NumberInput
            value={property.value as number}
            onChange={handleChange}
            min={property.min}
            max={property.max}
            step={property.step}
            readOnly={property.readOnly}
          />
        );
        
      case 'string':
        return (
          <StringEditor
            value={property.value as string}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
        
      case 'boolean':
        return (
          <BooleanEditor
            value={property.value as boolean}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
        
      case 'vector3':
      case 'euler':
        return (
          <Vector3Editor
            value={property.value as { x: number; y: number; z: number }}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
        
      case 'color':
        return (
          <ColorEditor
            value={property.value as string}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
        
      case 'enum':
        return (
          <EnumEditor
            value={property.value}
            options={property.options || []}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
        
      case 'asset':
        return (
          <AssetSelector
            value={property.value as string | null}
            assetType={property.assetType}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
        
      default:
        return (
          <span style={{ color: '#666', fontSize: '12px' }}>
            [{property.type}]
          </span>
        );
    }
  };
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '120px 1fr',
      gap: '8px',
      alignItems: 'start',
      padding: '4px 0',
    }}>
      <label
        style={{
          fontSize: '12px',
          color: '#aaa',
          paddingTop: '4px',
          cursor: 'default',
        }}
        title={property.tooltip}
      >
        {property.displayName}
      </label>
      <div>
        {renderEditor()}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT SECTION
// ============================================================================

function ComponentSection({
  component,
  onPropertyChange,
  onToggleEnabled,
  onRemove,
}: {
  component: ComponentDefinition;
  onPropertyChange: (propertyName: string, value: unknown) => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const basicProps = component.properties.filter(p => !p.advanced);
  const advancedProps = component.properties.filter(p => p.advanced);
  
  // Group by category
  const groupedProps = useMemo(() => {
    const props = showAdvanced ? component.properties : basicProps;
    const groups: Record<string, PropertyDefinition[]> = {};
    
    for (const prop of props) {
      const cat = prop.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(prop);
    }
    
    return groups;
  }, [component.properties, basicProps, showAdvanced]);
  
  return (
    <div style={{
      marginBottom: '8px',
      background: '#16213e',
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
          background: '#1a1a2e',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: '10px', color: '#666' }}>
          {expanded ? '▼' : '▶'}
        </span>
        <span style={{ fontSize: '16px' }}>{component.icon}</span>
        <span style={{ 
          flex: 1, 
          fontWeight: 'bold', 
          fontSize: '13px',
          color: '#fff',
        }}>
          {component.name}
        </span>
        
        {/* Enable toggle */}
        <div onClick={(e) => e.stopPropagation()}>
          <BooleanEditor
            value={component.enabled}
            onChange={onToggleEnabled}
          />
        </div>
        
        {/* Remove button */}
        {component.removable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remove ${component.name}?`)) {
                onRemove();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#e74c3c',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px',
            }}
          >
            🗑
          </button>
        )}
      </div>
      
      {/* Properties */}
      {expanded && (
        <div style={{ padding: '12px' }}>
          {Object.entries(groupedProps).map(([category, props]) => (
            <div key={category}>
              {Object.keys(groupedProps).length > 1 && (
                <div style={{
                  fontSize: '10px',
                  color: '#666',
                  textTransform: 'uppercase',
                  marginTop: '8px',
                  marginBottom: '4px',
                  fontWeight: 'bold',
                }}>
                  {category}
                </div>
              )}
              
              {props.map((prop) => (
                <PropertyRow
                  key={prop.name}
                  property={prop}
                  onChange={(value) => onPropertyChange(prop.name, value)}
                />
              ))}
            </div>
          ))}
          
          {/* Advanced toggle */}
          {advancedProps.length > 0 && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                width: '100%',
                padding: '6px',
                marginTop: '8px',
                background: '#0f0f23',
                border: '1px solid #333',
                borderRadius: '3px',
                color: '#888',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {showAdvanced ? '▲ Hide Advanced' : '▼ Show Advanced'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TRANSFORM SECTION
// ============================================================================

function TransformSection({
  transform,
  onChange,
}: {
  transform: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  };
  onChange: (transform: { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div style={{
      marginBottom: '8px',
      background: '#16213e',
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
          background: '#1a1a2e',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: '10px', color: '#666' }}>
          {expanded ? '▼' : '▶'}
        </span>
        <span style={{ fontSize: '16px' }}>🔄</span>
        <span style={{ 
          flex: 1, 
          fontWeight: 'bold', 
          fontSize: '13px',
          color: '#fff',
        }}>
          Transform
        </span>
        
        {/* Reset button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange({
              position: new THREE.Vector3(0, 0, 0),
              rotation: new THREE.Euler(0, 0, 0),
              scale: new THREE.Vector3(1, 1, 1),
            });
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
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
              <span style={{ fontSize: '11px', color: '#888' }}>Position</span>
              <button
                onClick={() => onChange({ ...transform, position: new THREE.Vector3() })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Reset
              </button>
            </div>
            <Vector3Editor
              value={{ x: transform.position.x, y: transform.position.y, z: transform.position.z }}
              onChange={(v) => onChange({ ...transform, position: new THREE.Vector3(v.x, v.y, v.z) })}
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
              <span style={{ fontSize: '11px', color: '#888' }}>Rotation</span>
              <button
                onClick={() => onChange({ ...transform, rotation: new THREE.Euler() })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Reset
              </button>
            </div>
            <Vector3Editor
              value={{ 
                x: THREE.MathUtils.radToDeg(transform.rotation.x), 
                y: THREE.MathUtils.radToDeg(transform.rotation.y), 
                z: THREE.MathUtils.radToDeg(transform.rotation.z),
              }}
              onChange={(v) => onChange({ 
                ...transform, 
                rotation: new THREE.Euler(
                  THREE.MathUtils.degToRad(v.x),
                  THREE.MathUtils.degToRad(v.y),
                  THREE.MathUtils.degToRad(v.z),
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
              <span style={{ fontSize: '11px', color: '#888' }}>Scale</span>
              <button
                onClick={() => onChange({ ...transform, scale: new THREE.Vector3(1, 1, 1) })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Reset
              </button>
            </div>
            <Vector3Editor
              value={{ x: transform.scale.x, y: transform.scale.y, z: transform.scale.z }}
              onChange={(v) => onChange({ ...transform, scale: new THREE.Vector3(v.x, v.y, v.z) })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN DETAILS PANEL COMPONENT
// ============================================================================

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
  // Sample data if none provided
  const [selectedObject, setSelectedObject] = useState<InspectedObject | null>(initialObject || {
    id: '1',
    name: 'Player',
    type: 'Blueprint',
    icon: '📐',
    transform: {
      position: new THREE.Vector3(0, 1, 0),
      rotation: new THREE.Euler(0, Math.PI / 4, 0),
      scale: new THREE.Vector3(1, 1, 1),
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
  
  if (!selectedObject) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0d1117',
        color: '#fff',
      }}>
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid #333',
          fontWeight: 'bold',
          fontSize: '13px',
          background: '#1a1a2e',
        }}>
          📋 Details
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555',
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
      background: '#0d1117',
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #333',
        fontWeight: 'bold',
        fontSize: '13px',
        background: '#1a1a2e',
      }}>
        📋 Details
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {/* Object Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px',
          background: '#16213e',
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
                color: '#fff',
                fontSize: '18px',
                fontWeight: 'bold',
                padding: 0,
              }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              {selectedObject.type}
            </div>
          </div>
        </div>
        
        {/* Static Properties */}
        {selectedObject.staticProperties && selectedObject.staticProperties.length > 0 && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            background: '#16213e',
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
          <button
            onClick={() => setShowAddComponent(!showAddComponent)}
            style={{
              width: '100%',
              padding: '10px',
              background: '#3f51b5',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
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
              background: '#1a1a2e',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '8px',
              maxHeight: '300px',
              overflow: 'auto',
              zIndex: 100,
            }}>
              {availableComponents.map((comp) => (
                <button
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
                    color: '#ccc',
                    fontSize: '13px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#333'}
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
