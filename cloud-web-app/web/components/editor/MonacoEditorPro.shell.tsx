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
  position,
}: {
  activeFile: InlineChatProps['activeFile'];
  projectContext: InlineChatProps['projectContext'];
  onClose: InlineChatProps['onClose'];
  position?: { top: number; left: number };
}) {
  return (
    <div
      className="absolute z-50 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[var(--aethel-surface-primary)] shadow-[0_12px_48px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.05)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        top: position ? `${position.top}px` : 'auto',
        bottom: position ? 'auto' : '1rem',
        left: position ? `${Math.max(16, position.left - 280)}px` : 'auto',
        right: position ? 'auto' : '1rem',
        width: '560px',
        maxHeight: '400px',
        transform: position ? 'translateY(16px)' : 'none',
      }}
      role="dialog"
      aria-label="Inline AI Chat"
    >
      <div className="absolute inset-0 pointer-events-none rounded-2xl border border-[var(--aethel-info)] opacity-20 blur-sm" />
      <div className="relative z-10 w-full h-full flex flex-col">
        <InlineAIChat
          activeFile={activeFile}
          projectContext={projectContext}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
