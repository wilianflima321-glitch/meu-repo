'use client'

/**
 * Holographic ghost previews for staged AI diffs.
 *
 * While a staged AI change (`pendingDiff`) targets the file open in the editor,
 * this hook paints a Cursor-style preview directly on the Monaco surface:
 *   - lines that will be removed get a red decoration in the current model;
 *   - lines that will be added are rendered as translucent green ghost text via
 *     Monaco view zones (they do not mutate the model until the user applies).
 *
 * The preview is purely visual and self-cleaning: it disappears when the diff
 * clears, the active file changes, or the user starts editing the buffer.
 */

import { useEffect, type MutableRefObject } from 'react'
import type * as monacoEditor from 'monaco-editor'
import type { ChatDiffFile } from '../../web/lib/ai/ai-apply-bridge'
import { computeGhostDiffHunks } from '../../web/lib/ai/diff-line-ops'

const REMOVED_LINE_CLASS = 'aethel-apply-ghost-removed'
const REMOVED_GLYPH_CLASS = 'aethel-apply-ghost-removed-glyph'

function normalizeEol(text: string): string {
  return text.replace(/\r\n/g, '\n')
}

function buildAdditionDomNode(lines: string[]): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'aethel-apply-ghost-added'
  container.style.boxSizing = 'border-box'
  container.style.width = '100%'
  container.style.borderLeft = '2px solid color-mix(in srgb, var(--aethel-success) 70%, transparent)'
  container.style.background = 'color-mix(in srgb, var(--aethel-success) 12%, transparent)'
  container.style.fontFamily = 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)'
  container.style.fontSize = '12px'
  container.style.lineHeight = '18px'
  container.style.color = 'color-mix(in srgb, var(--aethel-success-light) 92%, white)'
  container.style.paddingLeft = '8px'
  container.style.pointerEvents = 'none'
  container.style.whiteSpace = 'pre'
  container.style.overflow = 'hidden'

  for (const line of lines) {
    const row = document.createElement('div')
    row.textContent = `+ ${line}`
    container.appendChild(row)
  }
  return container
}

export function useApplyGhostPreview(
  editorRef: MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>,
  pendingDiff: ChatDiffFile | null,
  activeFilePath: string | null,
): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !pendingDiff || pendingDiff.path !== activeFilePath) return
    const model = editor.getModel()
    if (!model) return

    // Only preview while the buffer still holds the pre-change content.
    if (normalizeEol(model.getValue()) !== normalizeEol(pendingDiff.oldContent)) return

    const hunks = computeGhostDiffHunks(pendingDiff.oldContent, pendingDiff.newContent)
    if (!hunks.changed) return

    const lineCount = model.getLineCount()
    const decorations: monacoEditor.editor.IModelDeltaDecoration[] = hunks.removedRanges
      .filter((range) => range.startLine <= lineCount)
      .map((range) => ({
        range: {
          startLineNumber: range.startLine,
          startColumn: 1,
          endLineNumber: Math.min(range.endLine, lineCount),
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: REMOVED_LINE_CLASS,
          glyphMarginClassName: REMOVED_GLYPH_CLASS,
          glyphMarginHoverMessage: { value: 'Pending removal — review before applying.' },
        },
      }))

    const decorationCollection = editor.createDecorationsCollection(decorations)

    const zoneIds: string[] = []
    editor.changeViewZones((accessor) => {
      for (const addition of hunks.additions) {
        const afterLineNumber = Math.max(0, Math.min(addition.afterLine, lineCount))
        zoneIds.push(
          accessor.addZone({
            afterLineNumber,
            heightInLines: addition.lines.length,
            domNode: buildAdditionDomNode(addition.lines),
          }),
        )
      }
    })

    // Invalidate the ghost as soon as the user edits the buffer.
    const changeDisposable = model.onDidChangeContent(() => {
      decorationCollection.clear()
      editor.changeViewZones((accessor) => {
        for (const id of zoneIds) accessor.removeZone(id)
      })
      changeDisposable.dispose()
    })

    return () => {
      changeDisposable.dispose()
      decorationCollection.clear()
      // `editor` is the instance captured when this effect ran and owns the
      // view zones created above, so removing them here is safe even if the ref
      // has since pointed at a different editor.
      editor.changeViewZones((accessor) => {
        for (const id of zoneIds) accessor.removeZone(id)
      })
    }
  }, [editorRef, pendingDiff, activeFilePath])
}
