'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import type { Diagnostic as MonacoDiagnostic } from '../../../web/components/editor/MonacoEditorPro';
import type { EditorGroup, SplitDirection } from '../../../web/components/editor/SplitEditor';
import type { RemotePeer } from '../../../web/hooks/useCollaborationAwareness';
import type { CollaborationSession } from '../../../web/lib/yjs-collaboration';

import type {
  ActiveFileState,
  EditorDocumentSymbolState,
  EditorCursorStatus,
  EditorPane,
  EditorSelectionStatus,
  InlineApplyResult,
} from './types';

export type EditorInstanceRef = MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;

export type CursorPresenceChangeArgs = {
  filePath: string;
  pane: EditorPane;
  position: { line: number; column: number };
  editor: monacoEditor.editor.IStandaloneCodeEditor | null;
};

export type SelectionPresenceChangeArgs = {
  filePath: string;
  pane: EditorPane;
  range: monacoEditor.IRange | null;
  editor: monacoEditor.editor.IStandaloneCodeEditor | null;
};

export type WorkbenchEditorCanvasSharedProps = {
  projectId?: string;
  fullAccessActive: boolean;
  collaborationPeers: RemotePeer[];
  collaborationSession: CollaborationSession | null;
  collaborationNativeBindingEnabled: boolean;
  primaryEditorRef: EditorInstanceRef;
  secondaryEditorRef: EditorInstanceRef;
  editorRef: EditorInstanceRef;
  setActiveFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setSecondaryFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
  setSecondaryEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
  setEditorDocumentSymbols: Dispatch<SetStateAction<EditorDocumentSymbolState | null>>;
  setSecondaryEditorDocumentSymbols: Dispatch<SetStateAction<EditorDocumentSymbolState | null>>;
  setSplitActivePane: Dispatch<SetStateAction<EditorPane>>;
  onInlineApplyResult: (result: InlineApplyResult) => void;
  onRequestFullAccess: () => void;
  onSaveFile: (path: string, content: string) => Promise<void> | void;
  onCursorPresenceChange: (args: CursorPresenceChangeArgs) => void;
  onSelectionPresenceChange: (args: SelectionPresenceChangeArgs) => void;
  onCursorStatusChange?: (status: EditorCursorStatus) => void;
  onSelectionStatusChange?: (status: EditorSelectionStatus) => void;
};

export type WorkbenchEditorSurfaceProps = WorkbenchEditorCanvasSharedProps & {
  activeFile: ActiveFileState | null;
  secondaryFile: ActiveFileState | null;
  splitEditorGroups: EditorGroup[];
  splitEditorOpen: boolean;
  splitActivePane: EditorPane;
  splitDirection: SplitDirection;
  isReadingFile: boolean;
  fileError: string | null;
  setNextOpenTarget: Dispatch<SetStateAction<EditorPane>>;
  setSplitEditorOpen: Dispatch<SetStateAction<boolean>>;
};
