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
import { resolveAuthoritativeDocumentSymbols } from '@/components/editor/MonacoEditorPro.symbols';
import { registerAethelMonacoTheme } from '@/components/editor/MonacoEditorPro.theme';
import { MonacoEditorDecorationsStyle } from '@/components/editor/MonacoEditorPro.styles';
import { mapMonacoMarkersToDiagnostics } from '@/components/editor/MonacoEditorPro.diagnostics';
import {
  InlineChatPopover,
  InlineEditFeedbackBanner,
  MonacoInlineCommentSurface,
  MonacoEditorLoading,
  type InlineEditFeedbackState,
} from '@/components/editor/MonacoEditorPro.shell';
import { getAuthHeaders, submitChangeFeedback } from '@/lib/ai/change-feedback-client';
import { createComponentLogger } from '@/lib/observability/logger';
import { useFileComments, type InlineComment, type InlineCommentAuthor } from '@/hooks/useFileComments';


import type {
  ChangeApplyResponse,
  ChangeValidationResponse,
  Diagnostic,
  GitChange,
  MonacoEditorProps,
} from '@/components/editor/MonacoEditorPro.types';
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

    const lspLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
    if (lspLanguages.includes(language)) {
      import('@/lib/monaco-lsp-http').then(({ registerLspProviders }) => {
        lspDisposablesRef.current = registerLspProviders(monaco, language);
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

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !onDiagnosticsChange) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;

    const publishMarkers = () => {
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      onDiagnosticsChange(mapMonacoMarkersToDiagnostics(markers));
    };

    publishMarkers();

    const markerListener = monaco.editor.onDidChangeMarkers((resources: readonly monacoEditor.Uri[]) => {
      if (resources.some((resource) => resource.toString() === model.uri.toString())) {
        publishMarkers();
      }
    });

    return () => {
      markerListener.dispose();
      onDiagnosticsChange([]);
    };
  }, [language, onDiagnosticsChange, path]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !onDocumentSymbolsChange) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;

    const targetPath = path?.trim() || model.uri.path || model.uri.toString();
    const requestVersion = ++symbolRequestVersionRef.current;
    let cancelled = false;

    const timerId = window.setTimeout(async () => {
      try {
        const symbols = await resolveAuthoritativeDocumentSymbols(monaco, model);
        if (cancelled || requestVersion !== symbolRequestVersionRef.current) return;

        onDocumentSymbolsChange({
          path: targetPath,
          symbols: symbols ?? [],
          authoritative: symbols !== null,
        });
      } catch (error) {
        if (cancelled || requestVersion !== symbolRequestVersionRef.current) return;
        log.warn('Failed to resolve document symbols.', error);
        onDocumentSymbolsChange({
          path: targetPath,
          symbols: [],
          authoritative: false,
        });
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [language, onDocumentSymbolsChange, path, value]);

  useEffect(() => {
    const handleRevealLocation = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string; line?: number; column?: number }>).detail;
      const targetPath = detail?.path?.trim();

      if (targetPath && path) {
        const normalize = (value: string) => value.replace(/\\/g, '/');
        if (normalize(targetPath) !== normalize(path)) return;
      }

      const editor = editorRef.current;
      if (!editor) return;

      const lineNumber = Math.max(1, Number(detail?.line || 1));
      const column = Math.max(1, Number(detail?.column || 1));

      editor.setPosition({ lineNumber, column });
      editor.revealPositionInCenter({ lineNumber, column });
      editor.focus();
    };

    window.addEventListener('aethel.editor.revealLocation', handleRevealLocation as EventListener);
    return () => {
      window.removeEventListener('aethel.editor.revealLocation', handleRevealLocation as EventListener);
    };
  }, [path]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !enableErrorDecorations) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const decorations: monacoEditor.editor.IModelDeltaDecoration[] = diagnostics.map(diag => {
      const severity = {
        error: monaco.MarkerSeverity.Error,
        warning: monaco.MarkerSeverity.Warning,
        info: monaco.MarkerSeverity.Info,
        hint: monaco.MarkerSeverity.Hint,
      }[diag.severity];

      const className = {
        error: 'editor-error-decoration',
        warning: 'editor-warning-decoration',
        info: 'editor-info-decoration',
        hint: 'editor-hint-decoration',
      }[diag.severity];

      return {
        range: new monaco.Range(
          diag.line,
          diag.column,
          diag.endLine || diag.line,
          diag.endColumn || diag.column + 1
        ),
        options: {
          inlineClassName: className,
          hoverMessage: { value: `**${diag.severity.toUpperCase()}**: ${diag.message}` },
          overviewRuler: {
            color: diag.severity === 'error' ? 'var(--aethel-error-light)' : 'var(--aethel-warning-light)',
            position: monaco.editor.OverviewRulerLane.Right,
          },
        },
      };
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, [diagnostics, enableErrorDecorations]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !enableGitDecorations) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const gitDecorations: monacoEditor.editor.IModelDeltaDecoration[] = gitChanges.map(change => {
      const glyphClass = {
        added: 'git-glyph-added',
        modified: 'git-glyph-modified',
        deleted: 'git-glyph-deleted',
      }[change.type];

      return {
        range: new monaco.Range(change.startLine, 1, change.endLine, 1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName: glyphClass,
        },
      };
    });

    editor.deltaDecorations([], gitDecorations);
  }, [gitChanges, enableGitDecorations]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const activeComments = sortedComments.filter((comment) => !comment.resolved);

    const commentDecorations: monacoEditor.editor.IModelDeltaDecoration[] = activeComments.map((comment) => ({
      range: new monaco.Range(comment.line, 1, comment.line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'aethel-inline-comment-glyph',
        glyphMarginHoverMessage: {
          value: `**${comment.authorName}**: ${comment.text}`,
        },
        overviewRuler: {
          color: 'var(--aethel-info-light)',
          position: monaco.editor.OverviewRulerLane.Center,
        },
      },
    }));

    commentDecorationsRef.current = editor.deltaDecorations(commentDecorationsRef.current, commentDecorations);

    return () => {
      commentDecorationsRef.current = editor.deltaDecorations(commentDecorationsRef.current, []);
    };
  }, [sortedComments]);

  const handleInlineEditApply = useCallback(async (newCode: string) => {
    if (!editorRef.current || !editorSelection.range) return false;
    setInlineEditFeedback(null);
    setInlineEditNeedsFullAccess(false);

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return false;

    const range = editorSelection.range;
    const originalSnippet = model.getValueInRange(range);

    const startOffset = model.getOffsetAt({
      lineNumber: range.startLineNumber,
      column: range.startColumn,
    });
    const endOffset = model.getOffsetAt({
      lineNumber: range.endLineNumber,
      column: range.endColumn,
    });
    const currentDocument = model.getValue();
    const nextDocument = `${currentDocument.slice(0, startOffset)}${newCode}${currentDocument.slice(endOffset)}`;

    try {
      const validationResponse = await fetch('/api/ai/change/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          original: originalSnippet,
          modified: newCode,
          fullDocument: nextDocument,
          language,
          filePath: path,
        }),
      });

      if (!validationResponse.ok) {
        log.warn('Inline edit validation request failed.', await validationResponse.text());
        setInlineEditFeedback({
          type: 'error',
          message: 'Validation request failed before apply.',
        });
        return false;
      }

      const validation = (await validationResponse.json()) as ChangeValidationResponse;
      if (!validation?.canApply) {
        const firstFailure = Array.isArray(validation?.checks)
          ? validation.checks.find((check) => check?.status === 'fail')
          : null;
        const reason = firstFailure?.message || 'Validation blocked this patch.';
        log.warn('Inline edit blocked.', { reason });
        setInlineEditFeedback({
          type: 'error',
          message: `Patch blocked: ${reason}`,
        });
        return false;
      }

      const normalizedPath = path || '';
      if (!normalizedPath.trim()) {
        setInlineEditFeedback({
          type: 'error',
          message: 'Inline apply requires a file path bound to this editor model.',
        });
        return false;
      }

      const applyResponse = await fetch('/api/ai/change/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          filePath: normalizedPath,
          original: currentDocument,
          modified: nextDocument,
          fullDocument: nextDocument,
          language,
          enforceOriginalMatch: true,
          approvedHighRisk: Boolean(fullAccessActive),
        }),
      });

      const applyPayload = (await applyResponse.json().catch(() => ({}))) as ChangeApplyResponse;
      const applyMetadata =
        applyPayload && typeof applyPayload === 'object' && applyPayload.metadata && typeof applyPayload.metadata === 'object'
          ? (applyPayload.metadata as Record<string, unknown>)
          : null;
      const runId =
        applyMetadata && typeof applyMetadata.runId === 'string'
          ? applyMetadata.runId
          : undefined;

      if (!applyResponse.ok) {
        const baseMessage =
          applyPayload.message || applyPayload.error || `Apply failed with status ${applyResponse.status}.`;
        const message =
          applyPayload.error === 'FULL_ACCESS_GRANT_REQUIRED'
            ? `${baseMessage} Ative Full Access temporario antes de override high-risk.`
            : baseMessage;
        setInlineEditFeedback({
          type: 'error',
          message,
        });
        if (
          applyPayload.error === 'FULL_ACCESS_GRANT_REQUIRED' ||
          applyPayload.error === 'HIGH_RISK_APPROVAL_REQUIRED'
        ) {
          setInlineEditNeedsFullAccess(true);
        }
        log.warn('Inline edit apply rejected.', { message, runId });
        if (runId) {
          void submitChangeFeedback({
            runId,
            feedback: 'needs_work',
            reason: applyPayload.error || 'APPLY_REJECTED',
            notes: message,
            filePath: normalizedPath,
            runSource: 'production',
          });
        }
        return false;
      }

      const rollbackToken =
        applyMetadata && typeof applyMetadata.rollbackToken === 'string'
          ? applyMetadata.rollbackToken
          : undefined;

      onAiApplyResult?.({
        runId,
        rollbackToken,
        message: applyPayload.message || 'Apply succeeded.',
        filePath: normalizedPath,
      });
      if (runId) {
        void submitChangeFeedback({
          runId,
          feedback: 'accepted',
          reason: 'APPLY_CONFIRMED',
          notes: 'Inline edit applied successfully in MonacoEditorPro.',
          filePath: normalizedPath,
          runSource: 'production',
        });
      }
    } catch (error) {
      log.error('Inline edit validation error.', error);
      setInlineEditFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Inline edit request failed.',
      });
      return false;
    }

    editor.executeEdits('aethel.inlineEdit', [
      {
        range,
        text: newCode,
      },
    ]);

    onChange?.(editor.getValue(), {
      changes: [],
      eol: model.getEOL(),
      isEolChange: false,
      isFlush: false,
      isRedoing: false,
      isUndoing: false,
      versionId: model.getVersionId(),
      detailedReasonsChangeLengths: [],
    });
    onSave?.(nextDocument);
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
        />
      )}

      <MonacoEditorDecorationsStyle />
    </div>
  );
}

export { MonacoEditorPro as MonacoEditor };
export default MonacoEditorPro;
