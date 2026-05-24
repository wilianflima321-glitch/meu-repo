import {
  type CodebaseContextPreview,
  type MentionContextPreviewBlock,
} from './AIChatPanelPro.types'

export function CodebaseContextPanel({
  input,
  preview,
  onRefresh,
  onCopy,
  onOpenResult,
}: {
  input: string
  preview: CodebaseContextPreview
  onRefresh: () => void
  onCopy: (content: string) => void
  onOpenResult: (filePath: string, startLine?: number, endLine?: number) => void
}) {
  if (!input.toLowerCase().includes('@codebase')) return null

  return (
    <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(16,22,34,0.88))] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
            Codebase context
          </div>
          <div className="text-[11px] text-[var(--aethel-text-tertiary)]">
            {preview.loading
              ? 'Analyzing the current scope...'
              : `Source: ${preview.source || 'persistent-local-cache'}${preview.scope ? ` | scope=${preview.scope}` : ''}`}
          </div>
          {preview.stats && (
            <div className="mt-1 text-[10px] text-[var(--aethel-text-quaternary)]">
              {preview.stats.filesIndexed} files | {preview.stats.chunksIndexed} chunks | reused {preview.stats.reusedFiles} | changed {preview.stats.changedFiles} | indexed at {new Date(preview.stats.indexedAt).toLocaleTimeString()}
            </div>
          )}
          {preview.incrementalReindex && (
            <div className="mt-1 text-[10px] text-[var(--aethel-success)]">
              Incremental local reindexing active
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {preview.blockers && preview.blockers.length > 0 && (
            <div className="text-[10px] text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)]">
              {preview.blockers[0]}
            </div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={preview.loading}
            aria-label="Refresh codebase context"
            className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preview.loading ? 'Refreshing...' : 'Refresh context'}
          </button>
        </div>
      </div>
      {preview.error && (
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-error)]">
          {preview.error}
        </div>
      )}
      {!preview.error && preview.results.length === 0 && !preview.loading && (
        <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-tertiary)]">
          No semantic match found for this prompt yet.
        </div>
      )}
      <div className="space-y-2">
        {preview.results.map((result) => (
          <div key={result.id} className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-mono text-[var(--aethel-text-secondary)]">{result.filePath}:{result.startLine}-{result.endLine}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--aethel-info-light)]">relevance {result.score}</span>
                <button
                  type="button"
                  onClick={() => onCopy(result.filePath)}
                  aria-label={`Copy file path ${result.filePath}`}
                  className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                >
                  Copy path
                </button>
                <button
                  type="button"
                  onClick={() => onOpenResult(result.filePath, result.startLine, result.endLine)}
                  aria-label={`Open file ${result.filePath} at the suggested excerpt`}
                  className="rounded border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                >
                  Open
                </button>
              </div>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
              {result.excerpt}
            </pre>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onCopy(result.excerpt)}
                aria-label="Copy returned context excerpt"
                className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              >
                Copy excerpt
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MentionContextPanel({
  preview,
  onCopy,
  onOpenFileBlock,
}: {
  preview: {
    loading: boolean
    error?: string | null
    blocks: MentionContextPreviewBlock[]
  }
  onCopy: (content: string) => void
  onOpenFileBlock: (block: MentionContextPreviewBlock) => void
}) {
  if (!(preview.blocks.length > 0 || preview.loading || preview.error)) return null

  return (
    <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(16,22,34,0.88))] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
            Mention context
          </div>
          <div className="text-[11px] text-[var(--aethel-text-tertiary)]">
            {preview.loading ? 'Resolving explicit mention context...' : 'Preview of off-codebase context that will be sent.'}
          </div>
        </div>
      </div>
      {preview.error ? (
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-error)]">
          {preview.error}
        </div>
      ) : null}
      <div className="space-y-2">
        {preview.blocks.map((block) => (
          <div key={block.tag} className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">
                {block.tag}
              </span>
              <div className="flex items-center gap-2">
                {block.kind === 'file' ? (
                  <button
                    type="button"
                    onClick={() => onOpenFileBlock(block)}
                    aria-label={`Open cited context ${block.tag}`}
                    className="rounded border border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-primary-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                  >
                    Open
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onCopy(block.content)}
                  aria-label={`Copy content from block ${block.tag}`}
                  className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                >
                  Copy
                </button>
              </div>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
              {block.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
