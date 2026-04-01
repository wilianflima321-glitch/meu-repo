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
            Contexto de codebase
          </div>
          <div className="text-[11px] text-[var(--aethel-text-tertiary)]">
            {preview.loading
              ? 'Analisando o escopo atual...'
              : `Fonte: ${preview.source || 'cache-local-persistente'}${preview.scope ? ` | escopo=${preview.scope}` : ''}`}
          </div>
          {preview.stats && (
            <div className="mt-1 text-[10px] text-[var(--aethel-text-quaternary)]">
              {preview.stats.filesIndexed} arquivos | {preview.stats.chunksIndexed} chunks | reaproveitados {preview.stats.reusedFiles} | alterados {preview.stats.changedFiles} | indexado {new Date(preview.stats.indexedAt).toLocaleTimeString()}
            </div>
          )}
          {preview.incrementalReindex && (
            <div className="mt-1 text-[10px] text-emerald-300">
              reindexacao incremental local ativa
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
            className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preview.loading ? 'Atualizando...' : 'Atualizar contexto'}
          </button>
        </div>
      </div>
      {preview.error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
          {preview.error}
        </div>
      )}
      {!preview.error && preview.results.length === 0 && !preview.loading && (
        <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-tertiary)]">
          Nenhum trecho semantico relevante apareceu para este prompt ainda.
        </div>
      )}
      <div className="space-y-2">
        {preview.results.map((result) => (
          <div key={result.id} className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-mono text-[var(--aethel-text-secondary)]">{result.filePath}:{result.startLine}-{result.endLine}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--aethel-info-light)]">score {result.score}</span>
                <button
                  type="button"
                  onClick={() => onCopy(result.filePath)}
                  className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-white"
                >
                  Copiar caminho
                </button>
                <button
                  type="button"
                  onClick={() => onOpenResult(result.filePath, result.startLine, result.endLine)}
                  className="rounded border border-sky-500/40 px-2 py-0.5 text-[10px] text-sky-200 transition-colors hover:bg-sky-500/10"
                >
                  Abrir
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
                className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-secondary)]"
              >
                Copiar trecho
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
    <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--aethel-accent)_24%,transparent)] bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(16,22,34,0.88))] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--aethel-accent-light)]">
            Contexto de mentions
          </div>
          <div className="text-[11px] text-[var(--aethel-text-tertiary)]">
            {preview.loading ? 'Resolvendo o contexto explicito das mentions...' : 'Previa do contexto nao-codebase que sera enviado junto.'}
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
          <div key={block.tag} className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] p-2.5">
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
                    Abrir
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onCopy(block.content)}
                  className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-accent)_35%,transparent)] hover:text-white"
                >
                  Copiar
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
