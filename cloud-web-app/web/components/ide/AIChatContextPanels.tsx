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
              : `Origem: ${preview.source || 'cache-local-persistente'}${preview.scope ? ` | escopo=${preview.scope}` : ''}`}
          </div>
          {preview.stats && (
            <div className="mt-1 text-[10px] text-[var(--aethel-text-quaternary)]">
              {preview.stats.filesIndexed} arquivos | {preview.stats.chunksIndexed} blocos | reutilizados {preview.stats.reusedFiles} | alterados {preview.stats.changedFiles} | indexado as {new Date(preview.stats.indexedAt).toLocaleTimeString()}
            </div>
          )}
          {preview.incrementalReindex && (
            <div className="mt-1 text-[10px] text-[var(--aethel-success)]">
              reindexacao local incremental ativa
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
            aria-label="Atualizar o contexto do codebase"
            className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preview.loading ? 'Atualizando...' : 'Atualizar contexto'}
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
          Nenhuma correspondencia semantica encontrada para este prompt ate agora.
        </div>
      )}
      <div className="space-y-2">
        {preview.results.map((result) => (
          <div key={result.id} className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-mono text-[var(--aethel-text-secondary)]">{result.filePath}:{result.startLine}-{result.endLine}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--aethel-info-light)]">relevancia {result.score}</span>
                <button
                  type="button"
                  onClick={() => onCopy(result.filePath)}
                  aria-label={`Copiar caminho do arquivo ${result.filePath}`}
                  className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                >
                  Copiar caminho
                </button>
                <button
                  type="button"
                  onClick={() => onOpenResult(result.filePath, result.startLine, result.endLine)}
                  aria-label={`Abrir o arquivo ${result.filePath} no trecho sugerido`}
                  className="rounded border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
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
                aria-label="Copiar trecho de contexto retornado"
                className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
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
    <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(16,22,34,0.88))] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
            Contexto por mencoes
          </div>
          <div className="text-[11px] text-[var(--aethel-text-tertiary)]">
            {preview.loading ? 'Resolvendo o contexto explicito das mencoes...' : 'Previa do contexto fora do codebase que sera enviado.'}
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
                    aria-label={`Abrir contexto citado ${block.tag}`}
                    className="rounded border border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-primary-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                  >
                    Abrir
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onCopy(block.content)}
                  aria-label={`Copiar conteudo do bloco ${block.tag}`}
                  className="rounded border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
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
