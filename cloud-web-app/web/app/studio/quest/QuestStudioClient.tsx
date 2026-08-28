'use client'

import { Suspense, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'

import { CreativeWorkbenchShell } from '@/components/studio/CreativeWorkbenchShell'
import StudioEngineModuleMiniPanel from '@/components/studio/StudioEngineModuleMiniPanel'
import { RenderQueueDashboard } from '@/components/assets/RenderQueueDashboard'
import { AssetBrowserPanel } from '@/components/studio/AssetBrowserPanel'
import {
  getGroupTools,
  resolveActiveTool,
  buildToolEvidence,
  GROUP_CONFIG,
  type StudioTool,
} from '@/lib/studio/studio-registry'
import { CreativeStudioLoading } from '../CreativeStudioShell'

const QuestEditor = dynamic(() => import('@/components/narrative/QuestEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Quest Studio" />,
})

const LOGIC_ENGINE_MODULES = ['dialogue-cutscene-system', 'character-progression-system', 'quest-narrative-graph'] as const

function LogicEnginePanel() {
  return (
    <StudioEngineModuleMiniPanel
      title="Logic systems"
      moduleIds={LOGIC_ENGINE_MODULES}
      className="rounded-xl border border-[var(--aethel-border-subtle)]"
    />
  )
}

function QuestToolPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  const tools = getGroupTools('Logic')
  return (
    <div className="flex flex-col gap-1 p-1">
      {tools.map((tool) => {
        const active = tool.id === selectedId
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelect(tool.id)}
            title={tool.description}
            aria-pressed={active}
            className={[
              'group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]',
              active
                ? 'border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_6%,transparent)]'
                : 'border-transparent hover:border-[var(--aethel-border-subtle)] hover:bg-[var(--aethel-surface-secondary)]',
            ].join(' ')}
          >
            {active && (
              <span
                className="pointer-events-none absolute left-0 inset-y-0 w-0.5 rounded-full bg-[var(--aethel-primary)]"
                aria-hidden
              />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={[
                  'block truncate text-[12px] font-semibold tracking-tight',
                  active ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-primary)]',
                ].join(' ')}
              >
                {tool.label}
              </span>
              {tool.description ? (
                <span className="truncate text-[10px] text-[var(--aethel-text-quaternary)]">
                  {tool.description}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-info-light)]">
              {tool.maturity}
            </span>
          </button>
        )
      })}

      <div className="mt-3">
        <LogicEnginePanel />
      </div>
    </div>
  )
}

function QuestInspector({ tool }: { tool: StudioTool }) {
  return (
    <div className="space-y-3 p-1 text-[11px]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-[var(--aethel-text-primary)]">{tool.label}</p>
        <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-info-light)]">
          {tool.maturity}
        </span>
      </div>
      <p className="leading-relaxed text-[var(--aethel-text-secondary)]">{tool.description}</p>
      <div className="rounded-xl border border-[var(--aethel-glass-border)] bg-[var(--aethel-surface-secondary)]/60 px-3 py-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
          Active Graph
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-[var(--aethel-primary-light)]">{tool.id}</p>
      </div>
    </div>
  )
}

function QuestPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="Quest validation is held until branching, prerequisite, reward, and playtest receipts exist."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-warning)] disabled:cursor-not-allowed"
    >
      Validation held
    </button>
  )
}

export default function QuestStudioClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toolParam = searchParams?.get('tool') ?? null
  const activeTool = resolveActiveTool('Logic', toolParam)
  const { mode, title } = GROUP_CONFIG.Logic

  const onSelectTool = (id: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tool', id)
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }

  const handleSaveQuest = useCallback((nodes: any[], edges: any[]) => {
    window.dispatchEvent(
      new CustomEvent('aethel.quest.saved', {
        detail: { nodes, edges, timestamp: Date.now() },
      }),
    )
  }, [])

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<QuestPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={<QuestToolPicker selectedId={activeTool.id} onSelect={onSelectTool} />}
      inspector={<QuestInspector tool={activeTool} />}
      viewport={
        <Suspense fallback={<CreativeStudioLoading label="Quest Studio" />}>
          <QuestEditor onSave={handleSaveQuest} />
        </Suspense>
      }
      renderQueue={<RenderQueueDashboard />}
      assetBrowser={<AssetBrowserPanel />}
    />
  )
}
