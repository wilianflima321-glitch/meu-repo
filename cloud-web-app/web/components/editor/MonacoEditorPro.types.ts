import type * as monacoEditor from 'monaco-editor';
import type { DocumentSymbol } from '@/components/outline/OutlinePanel';
import type { InlineCommentAuthor } from '@/hooks/useFileComments';
import type { CollaborationSession } from '@/lib/yjs-collaboration';

// ============================================================================
// TYPES
// ============================================================================

export interface MonacoEditorProps {
  // Content
  value?: string;
  defaultValue?: string;
  language?: string;
  path?: string;
  projectId?: string;

  // Callbacks
  onChange?: (value: string | undefined, event: monacoEditor.editor.IModelContentChangedEvent) => void;
  onSave?: (value: string) => void;
  onAiApplyResult?: (result: { runId?: string; rollbackToken?: string; message?: string; filePath?: string }) => void;
  onRequestFullAccess?: () => void;
  onCursorChange?: (position: { line: number; column: number }) => void;
  onSelectionChange?: (selection: { text: string; range: monacoEditor.IRange | null }) => void;
  onDiagnosticsChange?: (diagnostics: Diagnostic[]) => void;
  onDocumentSymbolsChange?: (payload: {
    path: string;
    symbols: DocumentSymbol[];
    authoritative: boolean;
  }) => void;
  onMount?: (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => void;
  collaborationSession?: CollaborationSession | null;
  commentAuthor?: InlineCommentAuthor;

  // Options
  readOnly?: boolean;
  minimap?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  fontSize?: number;
  tabSize?: number;
  theme?: string;
  height?: string | number;

  // Features
  enableInlineEdit?: boolean;
  enableAISuggestions?: boolean;
  enableGitDecorations?: boolean;
  enableErrorDecorations?: boolean;

  // Data
  diagnostics?: Diagnostic[];
  gitChanges?: GitChange[];
  fullAccessActive?: boolean;
}

export interface Diagnostic {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  source?: string;
  code?: string | number;
}

export interface GitChange {
  startLine: number;
  endLine: number;
  type: 'added' | 'modified' | 'deleted';
}

export type ChangeValidationCheck = {
  status?: 'pass' | 'fail';
  message?: string;
};

export type ChangeValidationResponse = {
  canApply?: boolean;
  checks?: ChangeValidationCheck[];
};

export type ChangeApplyResponse = {
  error?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};
