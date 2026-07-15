// TYPES
// ============================================================================

export type NoteCategory =
  | 'composition'   // Visual composition
  | 'lighting'      // Lighting
  | 'color'         // Color palette
  | 'pacing'        // Pacing/timing
  | 'audio'         // Sound and music
  | 'gameplay'      // Gameplay mechanics
  | 'narrative'     // Narrative
  | 'performance'   // Technical performance
  | 'accessibility' // Accessibility
  | 'ux';           // User experience

export type NoteSeverity = 'suggestion' | 'recommendation' | 'critical';

export interface DirectorNote {
  id: string;
  category: NoteCategory;
  severity: NoteSeverity;
  title: string;
  description: string;
  suggestion?: string;
  autoFixAvailable: boolean;
  reference?: {
    type: 'scene' | 'asset' | 'blueprint' | 'timeline';
    id: string;
    name: string;
    thumbnail?: string;
  };
  examples?: {
    label: string;
    image?: string;
    description: string;
  }[];
  createdAt: number;
  status: 'new' | 'acknowledged' | 'applied' | 'dismissed';
  feedback?: 'helpful' | 'not_helpful';
}

export interface DirectorSession {
  id: string;
  projectType: 'game' | 'film' | 'archviz' | 'general';
  notes: DirectorNote[];
  overallScore: number; // 0-100
  strengths: string[];
  improvements: string[];
  lastAnalysis: number;
  isAnalyzing: boolean;
}

export interface DirectorNotePanelProps {
  projectId?: string;
  projectType?: 'game' | 'film' | 'archviz' | 'general';
  position?: 'right' | 'bottom' | 'floating';
  defaultCollapsed?: boolean;
  onApplyFix?: (note: DirectorNote) => Promise<void>;
  onJumpTo?: (reference: DirectorNote['reference']) => void;
  className?: string;
}

// ============================================================================
