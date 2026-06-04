import type { ComponentProps } from 'react';
import InlineAIChat from '@/components/ide/InlineAIChat';
import { MonacoInlineCommentDialog } from './MonacoEditorPro.comments';
import type { InlineComment } from '@/hooks/useFileComments';

export type InlineEditFeedbackState = {
  type: 'error' | 'success';
  message: string;
};

export function InlineEditFeedbackBanner({
  feedback,
  needsFullAccess,
  onRequestFullAccess,
}: {
  feedback: InlineEditFeedbackState | null;
  needsFullAccess: boolean;
  onRequestFullAccess?: () => void;
}) {
  if (!feedback) return null;

  return (
    <div
      className={`absolute right-2 top-2 z-30 max-w-[420px] rounded border px-2 py-1 text-xs ${
        feedback.type === 'error'
          ? 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]'
          : 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
      }`}
      role="status"
      aria-live="polite"
    >
      <div>{feedback.message}</div>
      {needsFullAccess && onRequestFullAccess ? (
        <button
          type="button"
          onClick={onRequestFullAccess}
          className="mt-1 rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2 py-0.5 text-[11px] text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]"
        >
          Enable Full Access
        </button>
      ) : null}
    </div>
  );
}

export function MonacoInlineCommentSurface({
  line,
  selectedLineComments,
  activeComment,
  commentDraft,
  replyDraft,
  onClose,
  onCommentDraftChange,
  onReplyDraftChange,
  onCreateComment,
  onReplyToActiveComment,
  onResolveActiveComment,
}: {
  line: number | null;
  selectedLineComments: InlineComment[];
  activeComment: InlineComment | null;
  commentDraft: string;
  replyDraft: string;
  onClose: () => void;
  onCommentDraftChange: (value: string) => void;
  onReplyDraftChange: (value: string) => void;
  onCreateComment: () => void;
  onReplyToActiveComment: () => void;
  onResolveActiveComment: () => void;
}) {
  if (!line) return null;

  return (
    <MonacoInlineCommentDialog
      line={line}
      selectedLineComments={selectedLineComments}
      activeComment={activeComment}
      commentDraft={commentDraft}
      replyDraft={replyDraft}
      onClose={onClose}
      onCommentDraftChange={onCommentDraftChange}
      onReplyDraftChange={onReplyDraftChange}
      onCreateComment={onCreateComment}
      onReplyToActiveComment={onReplyToActiveComment}
      onResolveActiveComment={onResolveActiveComment}
    />
  );
}

export function MonacoEditorLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-quaternary)]">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--aethel-primary)] border-t-transparent" />
        Loading Editor...
      </div>
    </div>
  );
}

type InlineChatProps = ComponentProps<typeof InlineAIChat>;

export function InlineChatPopover({
  activeFile,
  projectContext,
  onClose,
}: {
  activeFile: InlineChatProps['activeFile'];
  projectContext: InlineChatProps['projectContext'];
  onClose: InlineChatProps['onClose'];
}) {
  return (
    <div
      className="absolute bottom-4 right-4 z-40 h-[min(720px,calc(100%-2rem))] w-[min(560px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] shadow-[0_28px_96px_rgba(0,0,0,0.55)]"
      role="dialog"
      aria-label="Inline AI Chat"
    >
      <InlineAIChat
        activeFile={activeFile}
        projectContext={projectContext}
        onClose={onClose}
      />
    </div>
  );
}
