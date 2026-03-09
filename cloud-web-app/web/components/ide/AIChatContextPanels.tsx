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
    <div className="mt-3 rounded-xl border border-sky-500/20 bg-slate-900/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-sky-300">
            Codebase Context
          </div>
          <div className="text-[11px] text-slate-400">
            {preview.loading
              ? 'Analyzing current scope...'
              : `Source: ${preview.source || 'local-persistent-cache'}${preview.scope ? ` | scope=${preview.scope}` : ''}`}
          </div>
          {preview.stats && (
            <div className="mt-1 text-[10px] text-slate-500">
              {preview.stats.filesIndexed} files | {preview.stats.chunksIndexed} chunks | reused {preview.stats.reusedFiles} | changed {preview.stats.changedFiles} | indexed {new Date(preview.stats.indexedAt).toLocaleTimeString()}
            </div>
          )}
          {preview.incrementalReindex && (
            <div className="mt-1 text-[10px] text-emerald-300">
              incremental local reindex active
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {preview.blockers && preview.blockers.length > 0 && (
            <div className="text-[10px] text-amber-300">
              {preview.blockers[0]}
            </div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={preview.loading}
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preview.loading ? 'Refreshing...' : 'Refresh context'}
          </button>
        </div>
      </div>
      {preview.error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
          {preview.error}
        </div>
      )}
      {!preview.error && preview.results.length === 0 && !preview.loading && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-[11px] text-slate-400">
          No semantic matches found yet for this prompt.
        </div>
      )}
      <div className="space-y-2">
        {preview.results.map((result) => (
          <div key={result.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-mono text-slate-200">{result.filePath}:{result.startLine}-{result.endLine}</span>
              <div className="flex items-center gap-2">
                <span className="text-sky-300">score {result.score}</span>
                <button
                  type="button"
                  onClick={() => onCopy(result.filePath)}
                  className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                >
                  Copy path
                </button>
                <button
                  type="button"
                  onClick={() => onOpenResult(result.filePath, result.startLine, result.endLine)}
                  className="rounded border border-sky-500/40 px-2 py-0.5 text-[10px] text-sky-200 transition-colors hover:bg-sky-500/10"
                >
                  Open
                </button>
              </div>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-5 text-slate-400">
              {result.excerpt}
            </pre>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onCopy(result.excerpt)}
                className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
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
    <div className="mt-3 rounded-xl border border-violet-500/20 bg-slate-900/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-violet-300">
            Mention Context
          </div>
          <div className="text-[11px] text-slate-400">
            {preview.loading ? 'Resolving explicit mention context...' : 'Preview of non-codebase context that will be sent.'}
          </div>
        </div>
      </div>
      {preview.error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
          {preview.error}
        </div>
      ) : null}
      <div className="space-y-2">
        {preview.blocks.map((block) => (
          <div key={block.tag} className="rounded-lg border border-slate-700 bg-slate-800/60 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-violet-200">
                {block.tag}
              </span>
              <div className="flex items-center gap-2">
                {block.kind === 'file' ? (
                  <button
                    type="button"
                    onClick={() => onOpenFileBlock(block)}
                    className="rounded border border-violet-500/40 px-2 py-0.5 text-[10px] text-violet-200 transition-colors hover:bg-violet-500/10"
                  >
                    Open
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onCopy(block.content)}
                  className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                >
                  Copy
                </button>
              </div>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-5 text-slate-400">
              {block.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
