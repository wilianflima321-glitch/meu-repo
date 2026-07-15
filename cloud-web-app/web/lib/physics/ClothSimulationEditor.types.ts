import type { ClothConfig } from '@/lib/cloth-simulation';

export type ClothToolType =
  | 'select'
  | 'pin'
  | 'unpin'
  | 'tear'
  | 'move_collider';

export type ConstraintType = 'structural' | 'shear' | 'bend';

export interface ClothPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<ClothConfig>;
}

export interface ClothEditorState {
  selectedVertices: Set<number>;
  pinnedVertices: Set<number>;
  isSimulating: boolean;
  showConstraints: boolean;
  showWireframe: boolean;
  showColliders: boolean;
  currentPreset: string | null;
}

export interface ClothSimulationEditorProps {
  meshId?: string;
  initialConfig?: Partial<ClothConfig>;
  onSimulationUpdate?: (config: ClothConfig) => void;
  onExport?: (data: { config: ClothConfig; pinnedVertices: number[] }) => void;
}
