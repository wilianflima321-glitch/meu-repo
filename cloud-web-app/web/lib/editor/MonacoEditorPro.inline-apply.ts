import type * as monacoEditor from 'monaco-editor';
import type { ChangeValidationResponse } from '@/components/editor/MonacoEditorPro.types';
import type { InlineEditFeedbackState } from '@/components/editor/MonacoEditorPro.shell';
import { getAuthHeaders } from '@/lib/ai/change-feedback-client';
import { formatApplyPreflightBanner, mapApplyPreflightDeny } from '@/lib/ai/apply-preflight-user-copy';
import { runGovernedChangeApply } from '@/lib/ai/governed-change-apply-client';

interface InlineApplyLogger {
  error(message: string, payload?: unknown): void;
  warn(message: string, payload?: unknown): void;
}

export interface ValidateAndPersistInlineEditParams {
  editor: monacoEditor.editor.IStandaloneCodeEditor;
  fullAccessActive: boolean;
  language: string;
  log: InlineApplyLogger;
  newCode: string;
  onAiApplyResult?: (result: {
    runId?: string;
    rollbackToken?: string;
    message: string;
    filePath: string;
  }) => void;
  path?: string;
  range: monacoEditor.IRange;
  setInlineEditFeedback: (feedback: InlineEditFeedbackState | null) => void;
  setInlineEditNeedsFullAccess: (needsFullAccess: boolean) => void;
}

export interface ValidateAndPersistInlineEditResult {
  model: monacoEditor.editor.ITextModel;
  nextDocument: string;
  ok: boolean;
}

export async function validateAndPersistInlineEdit({
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
}: ValidateAndPersistInlineEditParams): Promise<ValidateAndPersistInlineEditResult> {
  const model = editor.getModel();
  if (!model) return { model: null as never, nextDocument: '', ok: false };

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
        message: 'Validation request failed before apply. Nothing was written.',
      });
      return { model, nextDocument, ok: false };
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
        message: `Patch blocked: ${reason} Nothing was written.`,
      });
      return { model, nextDocument, ok: false };
    }

    const normalizedPath = path || '';
    if (!normalizedPath.trim()) {
      setInlineEditFeedback({
        type: 'error',
        message: 'Inline apply requires a file path bound to this editor model.',
      });
      return { model, nextDocument, ok: false };
    }

    const applyResult = await runGovernedChangeApply({
      filePath: normalizedPath,
      original: currentDocument,
      modified: nextDocument,
      language,
      approvedHighRisk: Boolean(fullAccessActive),
    });

    if (!applyResult.ok) {
      setInlineEditFeedback({ type: 'error', message: applyResult.banner });
      if (applyResult.copy.needsFullAccess) {
        setInlineEditNeedsFullAccess(true);
      }
      log.warn('Inline edit apply rejected.', {
        code: applyResult.error,
        runId: applyResult.runId,
      });
      return { model, nextDocument, ok: false };
    }

    onAiApplyResult?.({
      runId: applyResult.runId,
      rollbackToken: applyResult.rollbackToken,
      message: applyResult.message,
      filePath: normalizedPath,
    });
  } catch (error) {
    log.error('Inline edit validation error.', error);
    const copy = mapApplyPreflightDeny({
      error: 'APPLY_REJECTED',
      message: error instanceof Error ? error.message : 'Inline edit request failed.',
    });
    setInlineEditFeedback({
      type: 'error',
      message: formatApplyPreflightBanner(copy),
    });
    return { model, nextDocument, ok: false };
  }

  return { model, nextDocument, ok: true };
}
