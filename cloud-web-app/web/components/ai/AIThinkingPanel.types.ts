// TYPES
// ============================================================================

export type ThinkingStepType =
  | 'thinking'      // General reasoning
  | 'analyzing'     // Analyze code/context
  | 'searching'     // Search references
  | 'planning'      // Plan solution
  | 'generating'    // Generate code/asset
  | 'validating'    // Validate result
  | 'refining'      // Refine output
  | 'complete'      // Etapa concluída
  | 'error';        // Step error

export interface ThinkingStep {
  id: string;
  type: ThinkingStepType;
  title: string;
  content: string;
  timestamp: number;
  duration?: number;
  status: 'pending' | 'active' | 'complete' | 'error';
  children?: ThinkingStep[];
  metadata?: {
    tokensUsed?: number;
    model?: string;
    confidence?: number;
    codePreview?: string;
  };
}

export interface AISession {
  id: string;
  prompt: string;
  startTime: number;
  endTime?: number;
  steps: ThinkingStep[];
  status: 'thinking' | 'complete' | 'error' | 'cancelled';
  result?: {
    type: 'code' | 'asset' | 'text';
    preview?: string;
    files?: string[];
  };
}

export interface AIThinkingPanelProps {
  session?: AISession | null;
  isStreaming?: boolean;
  position?: 'right' | 'bottom' | 'floating';
  defaultCollapsed?: boolean;
  onClose?: () => void;
  onCopyStep?: (step: ThinkingStep) => void;
  className?: string;
}

// ============================================================================
