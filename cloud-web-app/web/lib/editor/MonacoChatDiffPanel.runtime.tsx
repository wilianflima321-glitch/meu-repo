// @aethel-heavy-async-boundary IDE/Monaco editor surface; must be lazy-loaded outside the IDE/editor region.
'use client'

import { useCallback, useMemo, useRef } from 'react'
import { DiffEditor, loader } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor'

loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
  },
})

function languageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'ts' || ext === 'tsx') return 'typescript'
  if (ext === 'js' || ext === 'jsx') return 'javascript'
  if (ext === 'json') return 'json'
  if (ext === 'css' || ext === 'scss') return 'css'
  if (ext === 'md') return 'markdown'
  if (ext === 'html' || ext === 'htm') return 'html'
  if (ext === 'py') return 'python'
  return 'plaintext'
}

export type MonacoChatDiffPanelProps = {
  filePath: string
  original: string
  modified: string
  /** Recebe o texto final do lado modified. */
  onAcceptAll: (finalModified: string) => void
  onReject: () => void
}

export function MonacoChatDiffPanel({
  filePath,
  original,
  modified,
  onAcceptAll,
  onReject,
}: MonacoChatDiffPanelProps) {
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)
  const language = useMemo(() => languageFromPath(filePath), [filePath])

  const originalUri = useMemo(
    () => `aethel-diff:${filePath.replace(/^\//, '')}/original`,
    [filePath]
  )
  const modifiedUri = useMemo(
    () => `aethel-diff:${filePath.replace(/^\//, '')}/modified`,
    [filePath]
  )

  const handleAccept = useCallback(() => {
    const latest = diffEditorRef.current?.getModifiedEditor()?.getValue() ?? modified
    onAcceptAll(latest)
  }, [modified, onAcceptAll])

  const handleMount = useCallback((editor: monaco.editor.IStandaloneDiffEditor) => {
    diffEditorRef.current = editor
  }, [])

  return (
    <div className="flex h-full min-h-[min(420px,50vh)] flex-col bg-[var(--aethel-surface-primary)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
        <div
          className="min-w-0 truncate text-[11px] font-medium text-[var(--aethel-text-secondary)]"
          title={filePath}
        >
          {filePath}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onReject}
            className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] hover:text-[var(--aethel-error-light)]"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-text-primary)] transition-colors hover:brightness-110"
          >
            Apply all
          </button>
        </div>
      </div>
      <p className="shrink-0 border-b border-[var(--aethel-border-secondary)] px-3 py-1.5 text-[10px] text-[var(--aethel-text-quaternary)]">
        Monaco comparison with an editable right side before applying.
      </p>
      <div className="min-h-[280px] w-full flex-1 overflow-hidden">
        <DiffEditor
          height={380}
          width="100%"
          theme="vs-dark"
          language={language}
          original={original}
          modified={modified}
          originalModelPath={originalUri}
          modifiedModelPath={modifiedUri}
          onMount={handleMount}
          loading={
            <div className="flex h-full min-h-[200px] items-center justify-center text-[11px] text-[var(--aethel-text-tertiary)]">
              Loading Monaco diff...
            </div>
          }
          options={{
            renderSideBySide: true,
            readOnly: false,
            originalEditable: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: 'on',
            renderOverviewRuler: true,
            ignoreTrimWhitespace: false,
          }}
        />
      </div>
    </div>
  )
}
