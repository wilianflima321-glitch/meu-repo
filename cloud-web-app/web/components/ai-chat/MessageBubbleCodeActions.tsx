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
    case 'Aplicar no editor':
      return {
        title: 'Snippet aplicado',
        description: 'O trecho foi enviado para o editor ativo.',
      }
    case 'Abrir diff':
      return {
        title: 'Diff preparado',
        description: 'A previa antes/depois ja esta no painel lateral.',
      }
    case 'Criar arquivo':
      return {
        title: 'Arquivo criado',
        description: 'O snippet foi salvo e aberto no workbench.',
      }
    case 'Inserir selecao':
      return {
        title: 'Snippet inserido',
        description: 'O trecho foi inserido no cursor atual.',
      }
    default:
      return {
        title: 'Acao concluida',
        description: 'A alteracao foi aplicada com sucesso.',
      }
  }
}

function describeBridgeFailure(actionLabel: string, result: Extract<ApplyBridgeResult, { ok: false }>) {
  return {
    title: `${actionLabel} indisponivel`,
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
      `${actionLabel} indisponivel`,
      bridge ? 'Abra um arquivo no editor para continuar.' : 'Essa acao aparece dentro do workbench (/ide).'
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
          toast.success('Codigo copiado', 'O bloco foi enviado para a area de transferencia.')
        }}
        className="flex items-center gap-1 rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_55%,transparent)]"
        title="Copiar codigo"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? 'Copiado' : 'Copiar'}
      </button>

      <button
        type="button"
        disabled={!hasActiveFile}
        className={actionButtonClass(hasActiveFile)}
        title={
          editorBridge
            ? hasActiveFile
              ? 'Substitui a selecao ou insere no cursor'
              : 'Abra um arquivo no editor'
            : 'Disponivel no workbench (/ide)'
        }
        onClick={() =>
          void runBridgeAction(
            editorBridge,
            hasActiveFile,
            'Aplicar no editor',
            () => editorBridge!.applySnippetToEditor(code),
            toast
          )
        }
      >
        Aplicar no editor
      </button>

      <button
        type="button"
        disabled={!hasActiveFile}
        className={actionButtonClass(hasActiveFile)}
        title={
          editorBridge
            ? hasActiveFile
              ? 'Abre o painel lateral com previa antes/depois'
              : 'Abra um arquivo no editor'
            : 'Disponivel no workbench (/ide)'
        }
        onClick={() =>
          void runBridgeAction(
            editorBridge,
            hasActiveFile,
            'Abrir diff',
            () => editorBridge!.stageDiffForActiveFile(code),
            toast
          )
        }
      >
        Abrir diff
      </button>

      <button
        type="button"
        disabled={!hasBridge}
        className={actionButtonClass(hasBridge)}
        title={editorBridge ? 'Cria arquivo via API e abre no editor' : 'Disponivel no workbench (/ide)'}
        onClick={() =>
          void runBridgeAction(
            editorBridge,
            hasBridge,
            'Criar arquivo',
            () => editorBridge!.createFileFromSnippet(code),
            toast
          )
        }
      >
        Criar arquivo
      </button>

      <button
        type="button"
        disabled={!hasActiveFile}
        className={actionButtonClass(hasActiveFile)}
        title={
          editorBridge
            ? hasActiveFile
              ? 'Insere no cursor sem substituir selecao'
              : 'Abra um arquivo no editor'
            : 'Disponivel no workbench (/ide)'
        }
        onClick={() =>
          void runBridgeAction(
            editorBridge,
            hasActiveFile,
            'Inserir selecao',
            () => editorBridge!.insertSnippetAtCursor(code),
            toast
          )
        }
      >
        Inserir selecao
      </button>

      <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
        {editorBridge ? 'Ponte editor ativa' : 'Workbench: /ide'}
      </span>
    </div>
  )
}
