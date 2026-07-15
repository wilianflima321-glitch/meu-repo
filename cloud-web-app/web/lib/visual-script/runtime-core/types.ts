/**
 * Visual Script Runtime - split execution modules.
 *
 * Node executors, runtime state, and React bindings are separated so visual
 * scripting can be audited and lazy-loaded without one monolithic runtime file.
 */

export type PortType = 'exec' | 'boolean' | 'number' | 'string' | 'vector3' | 'object' | 'array' | 'any';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Port {
  id: string;
  name: string;
  type: PortType;
  direction: 'input' | 'output';
  defaultValue?: unknown;
}

export interface NodeDefinition {
  id: string;
  type: string;
  category: string;
  label: string;
  inputs: Port[];
  outputs: Port[];
  data?: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface VisualScript {
  id: string;
  name: string;
  nodes: NodeDefinition[];
  connections: Connection[];
  variables: ScriptVariable[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
  };
}

export interface ScriptVariable {
  id: string;
  name: string;
  type: PortType;
  defaultValue: unknown;
  isPublic: boolean;
}

export interface ExecutionContext {
  variables: Map<string, unknown>;
  nodeOutputs: Map<string, Map<string, unknown>>;
  currentNodeId: string | null;
  executionStack: string[];
  deltaTime: number;
  time: number;
  frameCount: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface RuntimeEvent {
  type: 'start' | 'update' | 'collision' | 'trigger' | 'input' | 'custom';
  data?: Record<string, unknown>;
}

// ============================================================================
// NODE EXECUTORS
// ============================================================================
