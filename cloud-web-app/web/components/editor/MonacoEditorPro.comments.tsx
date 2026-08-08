'use client';

import type { InlineComment } from '@/hooks/useFileComments';

interface MonacoInlineCommentDialogProps {
  line: number;
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
}

export function MonacoInlineCommentDialog({
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
}: MonacoInlineCommentDialogProps) {
  return (
    <div
      className="absolute right-4 top-14 z-40 w-[min(360px,calc(100%-2rem))] rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-3 shadow-[0_24px_80px_rgba(var(--aethel-brand-pure-black-rgb),0.45)]"
      role="dialog"
      aria-label="Inline code comment"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-[var(--aethel-text-primary)]">Line {line} review</div>
          <div className="text-[11px] text-[var(--aethel-text-tertiary)]">
            {selectedLineComments.length} thread{selectedLineComments.length === 1 ? '' : 's'} on this line
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)]"
        >
          Close
        </button>
      </div>

      {activeComment ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--aethel-text-primary)]">{activeComment.authorName}</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Open</span>
            </div>
            <p className="whitespace-pre-wrap text-xs leading-5 text-[var(--aethel-text-secondary)]">{activeComment.text}</p>
            {activeComment.replies.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-[var(--aethel-border-primary)] pt-2">
                {activeComment.replies.map((reply) => (
                  <div key={reply.id} className="text-xs text-[var(--aethel-text-secondary)]">
                    <span className="font-medium text-[var(--aethel-text-primary)]">{reply.authorName}: </span>
                    {reply.text}
                  </div>
                ))}
              </div>
            )}
          </div>
          <textarea
            value={replyDraft}
            onChange={(event) => onReplyDraftChange(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)]"
            placeholder="Reply with evidence, context, or a fix note..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onResolveActiveComment}
              className="rounded-lg border border-[var(--aethel-border-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)]"
            >
              Resolve
            </button>
            <button
              type="button"
              onClick={onReplyToActiveComment}
              disabled={!replyDraft.trim()}
              className="rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)]"
            placeholder="Leave a precise review note for this line..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--aethel-border-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreateComment}
              disabled={!commentDraft.trim()}
              className="rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
