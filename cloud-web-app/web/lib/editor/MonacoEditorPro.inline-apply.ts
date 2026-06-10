import type * as monacoEditor from 'monaco-editor';
import type { ChangeApplyResponse, ChangeValidationResponse } from '@/components/editor/MonacoEditorPro.types';
import type { InlineEditFeedbackState } from '@/components/editor/MonacoEditorPro.shell';
import { getAuthHeaders, submitChangeFeedback } from '@/lib/ai/change-feedback-client';

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
        message: 'Validation request failed before apply.',
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
        message: `Patch blocked: ${reason}`,
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
      setInlineEditFeedback({ type: 'error', message });
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
      return { model, nextDocument, ok: false };
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
    return { model, nextDocument, ok: false };
  }

  return { model, nextDocument, ok: true };
}
