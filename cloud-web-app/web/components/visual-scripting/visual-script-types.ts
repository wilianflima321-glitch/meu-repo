/**
 * Visual Scripting shared types
 */

import type { Node } from '@xyflow/react';

export type NodeCategory = 
  | 'event'     // Eventos (OnStart, OnUpdate, etc.)
  | 'action'    // Ações (Move, Jump, Spawn, etc.)
  | 'condition' // Condições (If, Compare, etc.)
  | 'variable'  // Variáveis (Get, Set)
  | 'math'      // Matemática (Add, Multiply, etc.)
  | 'flow'      // Controle de fluxo (Branch, Loop, etc.)
  | 'input'     // Input do jogador
  | 'physics'   // Física (Raycast, Force, etc.)
  | 'audio'     // Áudio (Play Sound, etc.)
  | 'ui';       // Interface do usuário

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  color: string;
  icon?: string;
}

export interface PortDefinition {
  id: string;
  label: string;
  type: 'exec' | 'boolean' | 'number' | 'string' | 'vector3' | 'object' | 'any';
  default?: unknown;
}

export interface VisualNodeData extends Record<string, unknown> {
	definition: NodeDefinition;
	values?: Record<string, unknown>;
	onValueChange?: (portId: string, value: unknown) => void;
}

export type VisualNodeType = Node<VisualNodeData>;

