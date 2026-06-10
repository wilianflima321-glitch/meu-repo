import { useEffect, type MutableRefObject } from 'react';
import type { Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import { mapMonacoMarkersToDiagnostics } from '@/components/editor/MonacoEditorPro.diagnostics';
import { resolveAuthoritativeDocumentSymbols } from '@/components/editor/MonacoEditorPro.symbols';
import type { Diagnostic, GitChange, MonacoEditorProps } from '@/components/editor/MonacoEditorPro.types';
import type { InlineComment } from '@/hooks/useFileComments';

interface EditorEffectLogger {
  warn(message: string, payload?: unknown): void;
}

interface MonacoRefs {
  editorRef: MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;
  monacoRef: MutableRefObject<Monaco | null>;
}

export function useMonacoDiagnosticsPublishing({
  editorRef,
  language,
  monacoRef,
  onDiagnosticsChange,
  path,
}: MonacoRefs & {
  language: string;
  onDiagnosticsChange?: (diagnostics: Diagnostic[]) => void;
  path?: string;
}) {
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
  }, [editorRef, language, monacoRef, onDiagnosticsChange, path]);
}

export function useMonacoDocumentSymbols({
  editorRef,
  language,
  log,
  monacoRef,
  onDocumentSymbolsChange,
  path,
  symbolRequestVersionRef,
  value,
}: MonacoRefs & {
  language: string;
  log: EditorEffectLogger;
  onDocumentSymbolsChange?: MonacoEditorProps['onDocumentSymbolsChange'];
  path?: string;
  symbolRequestVersionRef: MutableRefObject<number>;
  value?: string;
}) {
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
  }, [editorRef, language, log, monacoRef, onDocumentSymbolsChange, path, symbolRequestVersionRef, value]);
}

export function useMonacoRevealLocation({
  editorRef,
  path,
}: {
  editorRef: MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;
  path?: string;
}) {
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
  }, [editorRef, path]);
}

export function useMonacoErrorDecorations({
  decorationsRef,
  diagnostics,
  editorRef,
  enableErrorDecorations,
  monacoRef,
}: MonacoRefs & {
  decorationsRef: MutableRefObject<string[]>;
  diagnostics: Diagnostic[];
  enableErrorDecorations: boolean;
}) {
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !enableErrorDecorations) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const decorations: monacoEditor.editor.IModelDeltaDecoration[] = diagnostics.map((diag) => {
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
          diag.endColumn || diag.column + 1,
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
  }, [decorationsRef, diagnostics, editorRef, enableErrorDecorations, monacoRef]);
}

export function useMonacoGitDecorations({
  editorRef,
  enableGitDecorations,
  gitChanges,
  monacoRef,
}: MonacoRefs & {
  enableGitDecorations: boolean;
  gitChanges: GitChange[];
}) {
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !enableGitDecorations) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const gitDecorations: monacoEditor.editor.IModelDeltaDecoration[] = gitChanges.map((change) => {
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
  }, [editorRef, enableGitDecorations, gitChanges, monacoRef]);
}

export function useMonacoCommentDecorations({
  commentDecorationsRef,
  editorRef,
  monacoRef,
  sortedComments,
}: MonacoRefs & {
  commentDecorationsRef: MutableRefObject<string[]>;
  sortedComments: InlineComment[];
}) {
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
  }, [commentDecorationsRef, editorRef, monacoRef, sortedComments]);
}
