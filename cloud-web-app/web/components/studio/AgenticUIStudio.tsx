'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { type CanonicalRuntimeProps } from '@/components/preview/previewRuntime.types'
import RuntimePreviewSurface from '@/components/preview/RuntimePreviewSurface'
import { PreviewDomTree } from '@/components/preview/PreviewDomTree'
import { PreviewPropsInspector, type ElementInspectData } from '@/components/preview/PreviewPropsInspector'
import { usePreviewDomSync } from '@/components/preview/usePreviewDomSync'
import { Layers } from 'lucide-react'
import { ensureProjectFusionYjsStore } from '@/lib/production/fusion-scope-registry'
import {
  applyMagicWandMutationViaFusionTx,
  isMutatingMagicWandCommand,
  MAGIC_WAND_FUSION_DENIED_EVENT,
} from '@/lib/production/magic-wand-fusion-apply'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('AgenticUIStudio')

interface AgenticUIStudioProps extends CanonicalRuntimeProps {
  onAgentMutationRequest?: (command: string, elementInfo?: ElementInspectData | null) => void
  /** When false, skip FusionTx staging (tests only). Default true. */
  governMutationsViaFusionTx?: boolean
  /**
   * L.9 — when true (default if no projectId), show Forge scaffold entry strip.
   * Deepens AgenticUIStudio without a new AAA panel empire.
   */
  showScaffoldEntry?: boolean
  onOpenForgeScaffold?: () => void
}

export function AgenticUIStudio(props: AgenticUIStudioProps) {
  const {
    projectId,
    filePath,
    title,
    onAgentMutationRequest,
    governMutationsViaFusionTx,
    autoProvision,
    showScaffoldEntry,
    onOpenForgeScaffold,
  } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const previewFrameRef = useRef<HTMLIFrameElement>(null)
  const govern = governMutationsViaFusionTx !== false
  // L.8: when a project is bound, default to managed provision (fail-closed if unreachable).
  const effectiveAutoProvision = autoProvision ?? Boolean(projectId)
  const scaffoldEntryVisible = showScaffoldEntry ?? !projectId

  const { domTree, selectedElementId, hoveredElementId, selectElement, highlightElement } =
    usePreviewDomSync(previewFrameRef)

  const [activeElementInfo, setActiveElementInfo] = useState<ElementInspectData | null>(null)
  const [fusionGateError, setFusionGateError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.elementInfo) {
        setActiveElementInfo(detail.elementInfo)
        if (detail.elementInfo.id) {
          selectElement(detail.elementInfo.id)
        }
      }
    }
    window.addEventListener('aethel.preview.inspectRequest', handler)
    return () => window.removeEventListener('aethel.preview.inspectRequest', handler)
  }, [selectElement])

  const applyGovernedMutation = useCallback(
    async (command: string, elementInfo: ElementInspectData | null) => {
      if (!govern || !projectId) {
        if (govern && !projectId) {
          setFusionGateError('MagicWand FusionTx denied — projectId required (fail-closed).')
          return { ok: false as const }
        }
        return { ok: true as const, skipped: true as const }
      }
      if (!isMutatingMagicWandCommand(command)) {
        return { ok: true as const, skipped: true as const }
      }

      // Bind real Yjs Fusion store before apply (Trava II).
      ensureProjectFusionYjsStore(projectId)

      const result = await applyMagicWandMutationViaFusionTx({
        projectId,
        command,
        elementInfo,
        mutation: {
          previewDom: JSON.stringify({
            source: 'agentic-ui-studio',
            command,
            element: elementInfo,
            filePath,
            at: new Date().toISOString(),
          }),
        },
      })

      if (!result.ok) {
        setFusionGateError(result.message)
        log.warn('agentic_ui_fusion_denied', { reason: result.reason })
        return { ok: false as const, result }
      }

      setFusionGateError(null)
      log.info('agentic_ui_fusion_applied', {
        fusionTxId: result.fusionTxId,
        uiMutationTxId: result.uiMutationTxId,
      })
      return { ok: true as const, result }
    },
    [govern, projectId, filePath],
  )

  const handleAgentCommand = useCallback(
    (command: string) => {
      void (async () => {
        const gated = await applyGovernedMutation(command, activeElementInfo)
        if (!gated.ok) {
          // Fail-closed: do not dispatch ungoverned mutation writes.
          window.dispatchEvent(
            new CustomEvent(MAGIC_WAND_FUSION_DENIED_EVENT, {
              detail: gated.result,
            }),
          )
          return
        }

        if (onAgentMutationRequest) {
          onAgentMutationRequest(command, activeElementInfo)
        } else {
          window.dispatchEvent(
            new CustomEvent('aethel.preview.inspectRequest', {
              detail: {
                message: command,
                elementInfo: activeElementInfo,
                projectId,
                filePath,
                title,
                source: 'agentic-ui-studio',
                fusionGoverned: !gated.skipped,
              },
            }),
          )
        }
      })()
    },
    [
      applyGovernedMutation,
      activeElementInfo,
      onAgentMutationRequest,
      projectId,
      filePath,
      title,
    ],
  )

  const handleTreeSelect = (id: string | null) => {
    selectElement(id)
    if (id) {
      const findNode = (node: {
        id?: string
        tagName?: string
        attributes?: { class?: string }
        children?: unknown[]
      }): typeof node | null => {
        if (node.id === id) return node
        for (const child of node.children || []) {
          const found = findNode(child as typeof node)
          if (found) return found
        }
        return null
      }

      if (domTree) {
        const node = findNode(domTree as { id?: string; tagName?: string; attributes?: { class?: string }; children?: unknown[] })
        if (node) {
          setActiveElementInfo({
            tag: node.tagName ?? 'div',
            id: node.id,
            className: node.attributes?.class,
          })
        }
      }
    } else {
      setActiveElementInfo(null)
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] font-sans"
      data-aethel-l7="agentic-ui-studio"
    >
      <div className="w-64 flex flex-col border-r border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-10 relative">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)]">
          <Layers className="w-4 h-4 text-[var(--aethel-primary)]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-secondary)]">
            DOM Tree
          </h2>
        </div>
        <PreviewDomTree
          tree={domTree}
          selectedId={selectedElementId}
          hoveredId={hoveredElementId}
          onSelect={handleTreeSelect}
          onHover={highlightElement}
        />
      </div>

      <div className="flex-1 flex flex-col relative z-0">
        {scaffoldEntryVisible && (
          <div
            className="shrink-0 flex items-center justify-between gap-3 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-2"
            data-aethel-l9="scaffold-entry"
          >
            <p className="text-[11px] text-[var(--aethel-text-secondary)]">
              No project bound — scaffold a DevContainer workspace via L.9 FullStackScaffold (fail-closed).
            </p>
            <button
              type="button"
              data-aethel-l9="scaffold-entry-open"
              onClick={() => {
                if (onOpenForgeScaffold) {
                  onOpenForgeScaffold()
                  return
                }
                if (typeof window !== 'undefined') {
                  window.location.assign('/dashboard?onboarding=1')
                }
              }}
              className="shrink-0 rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-text-inverse)]"
            >
              Open Forge scaffold
            </button>
          </div>
        )}
        {fusionGateError && (
          <div
            role="alert"
            className="shrink-0 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-primary)]"
            data-aethel-l7="fusion-gate-error"
          >
            {fusionGateError}
          </div>
        )}
        <RuntimePreviewSurface {...props} autoProvision={effectiveAutoProvision} />
      </div>

      <div className="flex-shrink-0 z-10 relative">
        <PreviewPropsInspector elementInfo={activeElementInfo} onAgentCommand={handleAgentCommand} />
      </div>
    </div>
  )
}
