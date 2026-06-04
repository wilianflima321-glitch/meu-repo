// TYPES
// ============================================================================

export type SuggestionType =
  | 'code'        // Sugestão de code
  | 'design'      // Sugestão de design/visual
  | 'performance' // Sugestão de performance
  | 'ux'          // Sugestão de UX
  | 'error'       // Correção de error
  | 'tip';        // Dica geral

export type SuggestionPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface AISuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  code?: string;
  autoApplyable: boolean;
  actionLabel?: string;
  actionCommand?: string;
  priority: 'low' | 'medium' | 'high';
  context?: {
    file?: string;
    line?: number;
    element?: string;
  };
  createdAt: number;
  expiresAt?: number;
}

export type AISuggestionApiRecord = {
  id: string;
  type: string;
  title: string;
  description: string;
  action?: {
    label?: string;
    command?: string;
  } | null;
  priority: AISuggestion['priority'];
  expiresAt?: number;
};

export interface AISuggestionBubbleProps {
  suggestion: AISuggestion;
  position?: SuggestionPosition;
  anchor?: { x: number; y: number } | React.RefObject<HTMLElement>;
  onApply?: (suggestion: AISuggestion) => Promise<void>;
  onDismiss?: (suggestion: AISuggestion) => void;
  onFeedback?: (suggestion: AISuggestion, helpful: boolean) => void;
  onLearnMore?: (suggestion: AISuggestion) => void;
  autoHideDelay?: number; // ms, 0 = no auto hide
  className?: string;
}

// ============================================================================

export interface SuggestionManagerProps {
  suggestions: AISuggestion[];
  onApply?: (suggestion: AISuggestion) => Promise<void>;
  onDismiss?: (suggestion: AISuggestion) => void;
  onFeedback?: (suggestion: AISuggestion, helpful: boolean) => void;
  maxVisible?: number;
}
