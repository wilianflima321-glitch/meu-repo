import type { Edge, Node } from '@xyflow/react';

export interface MaterialProperty {
  name: string;
  type: 'color' | 'float' | 'vector2' | 'vector3' | 'texture' | 'boolean';
  value: unknown;
  min?: number;
  max?: number;
}

export interface MaterialNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  properties: MaterialProperty[];
  outputs: { name: string; type: string }[];
  inputs: { name: string; type: string }[];
}

export type MaterialPort = { name: string; type: string };

export type MaterialNodeDefinition = {
	label: string;
	type: string;
	inputs: MaterialPort[];
	outputs: MaterialPort[];
	defaultProperties: MaterialProperty[];
};

export interface MaterialGraph {
  nodes: Node<MaterialNodeData>[];
  edges: Edge[];
  name: string;
  description: string;
}
