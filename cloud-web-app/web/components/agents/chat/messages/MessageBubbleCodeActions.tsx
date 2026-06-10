'use client'

import { Copy } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import {
  useEditorApplyBridge,
  type EditorApplyBridgeContextValue,
} from '@/components/ide/EditorApplyBridgeContext'
import type { ApplyBridgeResult } from '@/lib/ai/ai-apply-bridge'

interface MessageBubbleCodeActionsProps {
  code: string
  copied: boolean
  onCopy: (content: string) => void | Promise<void>
}

function actionButtonClass(enabled: boolean) {
  return `rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ${
    enabled
      ? 'cursor-pointer text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_55%,transparent)]'
      : 'cursor-not-allowed opacity-50'
  }`
}

function describeBridgeSuccess(actionLabel: string) {
  switch (actionLabel) {
    case 'Apply in editor':
      return {
        title: 'Snippet applied',
        description: 'The snippet was sent to the active editor.',
      }
    case 'Open diff':
      return {
        title: 'Diff prepared',
        description: 'The before/after preview is ready in the side panel.',
      }
    case 'Create file':
      return {
        title: 'File created',
        description: 'The snippet was saved and opened in the IDE.',
      }
    case 'Insert selection':
      return {
        title: 'Snippet inserted',
        description: 'The snippet was inserted at the current cursor.',
      }
    default:
      return {
        title: 'Action completed',
        description: 'The change was applied successfully.',
      }
  }
}

function describeBridgeFailure(actionLabel: string, result: Extract<ApplyBridgeResult, { ok: false }>) {
  return {
    title: `${actionLabel} unavailable`,
    description: result.message,
  }
}

async function runBridgeAction(
  bridge: EditorApplyBridgeContextValue | null,
  enabled: boolean,
  actionLabel: string,
  action: () => ApplyBridgeResult | Promise<ApplyBridgeResult>,
  notify: ReturnType<typeof useToast>
) {
  if (!enabled) {
    notify.warning(
      `${actionLabel} unavailable`,
      bridge ? 'Open a file in the editor to continue.' : 'This action is available inside the IDE.'
    )
    return
  }

  const result = await action()
  if (result.ok) {
    const message = describeBridgeSuccess(actionLabel)
    notify.success(message.title, message.description)
    return
  }

  const failure = describeBridgeFailure(actionLabel, result)
  notify.warning(failure.title, failure.description)
}

export function MessageBubbleCodeActions({
  code,
  copied,
  onCopy,
}: MessageBubbleCodeActionsProps) {
  const editorBridge = useEditorApplyBridge()
  const toast = useToast()
  const hasActiveFile = Boolean(editorBridge?.activeFilePath)
  const hasBridge = Boolean(editorBridge)

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-tertiary)] opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100">
      <button
        type="button"
        onClick={() => {
          onCopy(code)
          toast.success('Code copied', 'The block was sent to the clipboard.')
        }}
        className="flex items-center gap-1 rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_55%,transparent)]"
        title="Copy code"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? 'Copied' : 'Copy'}
      </button>

      <button
        type="button"
        disabled={!hasActiveFile}
        className={actionButtonClass(hasActiveFile)}
        title={
          editorBridge
            ? hasActiveFile
              ? 'Replaces the selection or inserts at the cursor'
              : 'Open a file in the editor'
            : 'Available in the IDE'
        }
        onClick={() =>
          void runBridgeAction(
            editorBridge,
            hasActiveFile,
            'Apply in editor',
            () => editorBridge!.applySnippetToEditor(code),
            toast
          )
        }
      >
        Apply in editor
      </button>

      <button
        type="button"
        disabled={!hasActiveFile}
        className={actionButtonClass(hasActiveFile)}
        title={
          editorBridge
            ? hasActiveFile
              ? 'Opens the side panel with before/after preview'
              : 'Open a file in the editor'
            : 'Available in the IDE'
        }
        onClick={() =>
          void runBridgeAction(
            editorBridge,
            hasActiveFile,
            'Open diff',
            () => editorBridge!.stageDiffForActiveFile(code),
            toast
          )
        }
      >
        Open diff
      </button>

      <button
        type="button"
        disabled={!hasBridge}
        className={actionButtonClass(hasBridge)}
        title={editorBridge ? 'Creates a file through the API and opens it in the editor' : 'Available in the IDE'}
        onClick={() =>
          void runBridgeAction(
            editorBridge,
            hasBridge,
            'Create file',
            () => editorBridge!.createFileFromSnippet(code),
            toast
          )
        }
      >
        Create file
      </button>

      <button
        type="button"
        disabled={!hasActiveFile}
        className={actionButtonClass(hasActiveFile)}
        title={
          editorBridge
            ? hasActiveFile
              ? 'Inserts at the cursor without replacing selection'
              : 'Open a file in the editor'
            : 'Available in the IDE'
        }
        onClick={() =>
          void runBridgeAction(
            editorBridge,
            hasActiveFile,
            'Insert selection',
            () => editorBridge!.insertSnippetAtCursor(code),
            toast
          )
        }
      >
        Insert selection
      </button>

      <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
        {editorBridge ? 'Editor bridge active' : 'Open in IDE'}
      </span>
    </div>
  )
}
