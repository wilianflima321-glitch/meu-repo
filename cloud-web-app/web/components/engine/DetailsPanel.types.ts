import type * as THREE from 'three';

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
