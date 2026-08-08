// @aethel-heavy-async-boundary IDE/Monaco editor surface; must be lazy-loaded outside the IDE/editor region.
'use client';

import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import Editor, { loader, OnMount, Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import { useInlineEdit, InlineEditModal } from '@/components/editor/InlineEditModal';
import {
  configureMonacoEditor,
  registerMonacoEditorActions,
} from '@/components/editor/MonacoEditorPro.actions';
import { registerAethelMonacoTheme } from '@/components/editor/MonacoEditorPro.theme';
import { MonacoEditorDecorationsStyle } from '@/components/editor/MonacoEditorPro.styles';
import {
  InlineChatPopover,
  InlineEditFeedbackBanner,
  MonacoInlineCommentSurface,
  MonacoEditorLoading,
  type InlineEditFeedbackState,
} from '@/components/editor/MonacoEditorPro.shell';
import {
  useMonacoCommentDecorations,
  useMonacoDiagnosticsPublishing,
  useMonacoDocumentSymbols,
  useMonacoErrorDecorations,
  useMonacoGitDecorations,
  useMonacoRevealLocation,
} from '@/lib/editor/MonacoEditorPro.effects';
import { validateAndPersistInlineEdit } from '@/lib/editor/MonacoEditorPro.inline-apply';
import { createComponentLogger } from '@/lib/observability/logger';
import { useFileComments, type InlineComment, type InlineCommentAuthor } from '@/hooks/useFileComments';


import type { Diagnostic, GitChange, MonacoEditorProps } from '@/components/editor/MonacoEditorPro.types';
export type { Diagnostic, GitChange, MonacoEditorProps } from '@/components/editor/MonacoEditorPro.types';

const log = createComponentLogger('MonacoEditorPro');

loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });


export function MonacoEditorPro({
  value,
  defaultValue,
  language = 'typescript',
  path,
  projectId,
  onChange,
  onSave,
  onAiApplyResult,
  onRequestFullAccess,
  onCursorChange,
  onSelectionChange,
  onDiagnosticsChange,
  onDocumentSymbolsChange,
  onMount: onMountProp,
  collaborationSession,
  commentAuthor,
  readOnly = false,
  minimap = true,
  lineNumbers = 'on',
  wordWrap = 'off',
  fontSize = 12,
  tabSize = 2,
  theme = 'dark',
  height = '100%',
  enableInlineEdit = true,
  enableAISuggestions = true,
  enableGitDecorations = true,
  enableErrorDecorations = true,
  diagnostics = [],
  gitChanges = [],
  fullAccessActive = false,
}: MonacoEditorProps) {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const commentDecorationsRef = useRef<string[]>([]);
  const lspDisposablesRef = useRef<monacoEditor.IDisposable[]>([]);
  const editorInteractionDisposablesRef = useRef<monacoEditor.IDisposable[]>([]);
  const inlineCompletionDisposableRef = useRef<monacoEditor.IDisposable | null>(null);
  const symbolRequestVersionRef = useRef(0);
  const commentsByLineRef = useRef<Map<number, InlineComment[]>>(new Map());

  const { isOpen, selection, openInlineEdit, closeInlineEdit } = useInlineEdit();
  const [editorSelection, setEditorSelection] = useState({
    code: '',
    range: null as monacoEditor.IRange | null,
  });
  const [inlineEditFeedback, setInlineEditFeedback] = useState<InlineEditFeedbackState | null>(null);
  const [inlineEditNeedsFullAccess, setInlineEditNeedsFullAccess] = useState(false);
  const [inlineChatOpen, setInlineChatOpen] = useState(false);
  const [inlineChatPosition, setInlineChatPosition] = useState<{ top: number; left: number } | undefined>(undefined);
  const [inlineCommentLine, setInlineCommentLine] = useState<number | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');

  const resolvedCommentAuthor = useMemo<InlineCommentAuthor>(() => {
    if (commentAuthor) return commentAuthor;
    const localUser = collaborationSession?.getLocalUser();
    return localUser ?? { id: 'local-reviewer', name: 'Local reviewer' };
  }, [collaborationSession, commentAuthor]);

  const {
    comments,
    commentsByLine,
    addComment,
    resolveComment,
    replyToComment,
  } = useFileComments({
    filePath: path,
    provider: collaborationSession,
  });

  const sortedComments = useMemo(
    () => Array.from(comments.values()).sort((left, right) => {
      if (left.line !== right.line) return left.line - right.line;
      return left.ts - right.ts;
    }),
    [comments],
  );

  const activeComment = activeCommentId ? comments.get(activeCommentId) ?? null : null;
  const selectedLineComments = inlineCommentLine ? commentsByLine.get(inlineCommentLine) ?? [] : [];

  const inlineChatActiveFile = useMemo(() => ({
    path: path || 'untitled',
    language,
    content: editorRef.current?.getValue() ?? value ?? defaultValue ?? '',
  }), [defaultValue, language, path, value]);

  const inlineChatProjectContext = useMemo(() => ({
    name: projectId ? `Project ${projectId}` : 'Aethel workspace',
    files: path ? [path] : [],
  }), [path, projectId]);

  useEffect(() => {
    commentsByLineRef.current = commentsByLine;
  }, [commentsByLine]);

  const openInlineCommentComposer = useCallback((lineNumber?: number) => {
    const editor = editorRef.current;
    const targetLine = lineNumber ?? editor?.getPosition()?.lineNumber ?? 1;
    const line = Math.max(1, targetLine);
    const existing = commentsByLineRef.current.get(line)?.find((comment) => !comment.resolved);
    setInlineCommentLine(line);
    setActiveCommentId(existing?.id ?? null);
    setCommentDraft('');
    setReplyDraft('');
  }, []);

  const closeInlineCommentComposer = useCallback(() => {
    setInlineCommentLine(null);
    setActiveCommentId(null);
    setCommentDraft('');
    setReplyDraft('');
  }, []);

  const handleCreateInlineComment = useCallback(() => {
    if (!inlineCommentLine) return;
    const created = addComment(inlineCommentLine, commentDraft, resolvedCommentAuthor);
    if (!created) return;
    setActiveCommentId(created.id);
    setCommentDraft('');
  }, [addComment, commentDraft, inlineCommentLine, resolvedCommentAuthor]);

  const handleReplyToActiveComment = useCallback(() => {
    if (!activeComment) return;
    const reply = replyToComment(activeComment.id, replyDraft, resolvedCommentAuthor);
    if (!reply) return;
    setReplyDraft('');
  }, [activeComment, replyDraft, replyToComment, resolvedCommentAuthor]);

  const handleResolveActiveComment = useCallback(() => {
    if (!activeComment) return;
    if (resolveComment(activeComment.id)) {
      closeInlineCommentComposer();
    }
  }, [activeComment, closeInlineCommentComposer, resolveComment]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    registerAethelMonacoTheme(monaco);

    const lspLanguages = [
      'typescript',
      'javascript',
      'typescriptreact',
      'javascriptreact',
      'rust',
    ];
    if (lspLanguages.includes(language)) {
      import('@/lib/monaco-lsp-http').then(({ registerLspProviders }) => {
        lspDisposablesRef.current = registerLspProviders(monaco, language, {
          model: editor.getModel(),
        });
      }).catch(err => {
        log.warn('Failed to register LSP providers.', err);
      });
    }

    if (enableAISuggestions) {
      import('@/lib/ai/inline-completion').then(({ registerInlineCompletionProvider }) => {
        inlineCompletionDisposableRef.current?.dispose();
        inlineCompletionDisposableRef.current = registerInlineCompletionProvider(monaco, [
          'typescript',
          'javascript',
          'typescriptreact',
          'javascriptreact',
          'json',
          'markdown',
          'css',
          'html',
          'python',
        ]);
      }).catch(err => {
        log.warn('Failed to register inline completions.', err);
      });
    }

    configureMonacoEditor(editor, monaco, {
      fontSize,
      lineNumbers,
      minimap,
      tabSize,
      wordWrap,
      readOnly,
      enableAISuggestions,
    });

    registerMonacoEditorActions(editor, monaco, {
      enableAISuggestions,
      enableInlineEdit,
      language,
      onOpenInlineChat: () => setInlineChatOpen(true),
      onSave,
      openInlineEdit,
      path,
      readOnly,
    });

    editorInteractionDisposablesRef.current.forEach((disposable) => disposable.dispose());
    editorInteractionDisposablesRef.current = [
      editor.addAction({
        id: 'aethel.addInlineComment',
        label: 'Add Inline Comment',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run: () => openInlineCommentComposer(),
      }),
      editor.addAction({
        id: 'aethel.inlineComposer',
        label: 'Aethel AI: Inline Composer',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
        run: () => {
          const position = editor.getPosition();
          if (position) {
            const top = editor.getTopForLineNumber(position.lineNumber) - editor.getScrollTop();
            const left = editor.getOffsetForColumn(position.lineNumber, position.column) - editor.getScrollLeft();
            setInlineChatPosition({ top, left });
          }
          setInlineChatOpen(true);
        },
      }),
      editor.onMouseDown((event) => {
        if (event.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return;
        const lineNumber = event.target.position?.lineNumber;
        if (!lineNumber) return;
        const lineComments = commentsByLineRef.current.get(lineNumber) ?? [];
        const firstOpenComment = lineComments.find((comment) => !comment.resolved);
        if (!firstOpenComment) return;
        setInlineCommentLine(lineNumber);
        setActiveCommentId(firstOpenComment.id);
        setCommentDraft('');
        setReplyDraft('');
      }),
    ];

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      const hasSelection = model && !e.selection.isEmpty();
      const text = hasSelection && model ? model.getValueInRange(e.selection) : '';
      const range = hasSelection ? e.selection : null;
      setEditorSelection({
        code: text,
        range,
      });
      onSelectionChange?.({
        text,
        range,
      });
    });

    const initialPosition = editor.getPosition();
    if (initialPosition) {
      onCursorChange?.({
        line: initialPosition.lineNumber,
        column: initialPosition.column,
      });
    }

    onMountProp?.(editor, monaco);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontSize, tabSize, minimap, lineNumbers, wordWrap, readOnly, enableAISuggestions, language, onCursorChange, onSelectionChange, onMountProp, openInlineCommentComposer]);

  useEffect(() => {
    return () => {
      lspDisposablesRef.current.forEach((d) => d.dispose());
      lspDisposablesRef.current = [];
      inlineCompletionDisposableRef.current?.dispose();
      inlineCompletionDisposableRef.current = null;
      editorInteractionDisposablesRef.current.forEach((d) => d.dispose());
      editorInteractionDisposablesRef.current = [];
    };
  }, []);

  useMonacoDiagnosticsPublishing({
    editorRef,
    language,
    monacoRef,
    onDiagnosticsChange,
    path,
  });
  useMonacoDocumentSymbols({
    editorRef,
    language,
    log,
    monacoRef,
    onDocumentSymbolsChange,
    path,
    symbolRequestVersionRef,
    value,
  });
  useMonacoRevealLocation({ editorRef, path });
  useMonacoErrorDecorations({
    decorationsRef,
    diagnostics,
    editorRef,
    enableErrorDecorations,
    monacoRef,
  });
  useMonacoGitDecorations({
    editorRef,
    enableGitDecorations,
    gitChanges,
    monacoRef,
  });
  useMonacoCommentDecorations({
    commentDecorationsRef,
    editorRef,
    monacoRef,
    sortedComments,
  });

  const handleInlineEditApply = useCallback(async (newCode: string) => {
    if (!editorRef.current || !editorSelection.range) return false;
    setInlineEditFeedback(null);
    setInlineEditNeedsFullAccess(false);

    const editor = editorRef.current;
    const range = editorSelection.range;
    const result = await validateAndPersistInlineEdit({
      editor,
      fullAccessActive,
      language,
      log,
      newCode,
      onAiApplyResult,
      path,
      range,
      setInlineEditFeedback,
      setInlineEditNeedsFullAccess,
    });
    if (!result.ok) return false;

    editor.executeEdits('aethel.inlineEdit', [
      {
        range,
        text: newCode,
      },
    ]);

    onChange?.(editor.getValue(), {
      changes: [],
      eol: result.model.getEOL(),
      isEolChange: false,
      isFlush: false,
      isRedoing: false,
      isUndoing: false,
      versionId: result.model.getVersionId(),
      detailedReasonsChangeLengths: [],
    });
    onSave?.(result.nextDocument);
    setInlineEditFeedback({
      type: 'success',
      message: 'Patch aplicado e persistido.',
    });
    setInlineEditNeedsFullAccess(false);
    return true;
  }, [editorSelection.range, fullAccessActive, onAiApplyResult, onChange, onSave, language, path]);

  return (
    <div className="relative w-full h-full">
      <InlineEditFeedbackBanner
        feedback={inlineEditFeedback}
        needsFullAccess={inlineEditNeedsFullAccess}
        onRequestFullAccess={onRequestFullAccess}
      />
      <MonacoInlineCommentSurface
        line={inlineCommentLine}
        selectedLineComments={selectedLineComments}
        activeComment={activeComment}
        commentDraft={commentDraft}
        replyDraft={replyDraft}
        onClose={closeInlineCommentComposer}
        onCommentDraftChange={setCommentDraft}
        onReplyDraftChange={setReplyDraft}
        onCreateComment={handleCreateInlineComment}
        onReplyToActiveComment={handleReplyToActiveComment}
        onResolveActiveComment={handleResolveActiveComment}
      />
      <Editor
        height={height}
        language={language}
        value={value}
        defaultValue={defaultValue}
        path={path}
        theme={theme}
        onMount={handleMount}
        onChange={onChange}
        options={{
          automaticLayout: true,
        }}
        loading={<MonacoEditorLoading />}
      />

      {enableInlineEdit && (
        <InlineEditModal
          isOpen={isOpen}
          onClose={closeInlineEdit}
          selectedCode={selection.code || editorSelection.code}
          onApply={handleInlineEditApply}
          language={language}
          filePath={path}
          projectId={projectId}
          cursorPosition={selection.position}
        />
      )}

      {inlineChatOpen && (
        <InlineChatPopover
          activeFile={inlineChatActiveFile}
          projectContext={inlineChatProjectContext}
          onClose={() => setInlineChatOpen(false)}
          position={inlineChatPosition}
        />
      )}

      <MonacoEditorDecorationsStyle />
    </div>
  );
}

export { MonacoEditorPro as MonacoEditor };
export default MonacoEditorPro;
