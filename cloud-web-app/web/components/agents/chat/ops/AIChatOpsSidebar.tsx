'use client'

import dynamic from 'next/dynamic'
import { useCallback } from 'react'
import { ApprovalCard } from '@aethel/ide-ui/ApprovalCard'
import { MemoryPanel } from '@aethel/ide-ui/MemoryPanel'
import { TaskOpsPanel } from '@aethel/ide-ui/TaskOpsPanel'
import { AIChatEconomicsPanel } from '@/components/agents/chat/economics'
import { AgentEvidencePanel } from '@/components/agents/AgentEvidencePanel'
import { AIChatRulesPanel } from '@/components/agents/chat/rules/AIChatRulesPanel'
import type { AIChatEvidenceArtifact } from '@/components/agents/evidence'
import { OPS_TABS, type AIChatOpsTab } from '@/components/agents/chat/presets'
import { useAIChatOpsArtifacts, type AIChatApprovalChange } from './useAIChatOpsArtifacts'
import { MergeReceiptGraphStrip } from '@/components/agents/chat/ledger/MergeReceiptGraphStrip'
import type { GovernedApplyReceipt } from '@/lib/production/agents-merge-governance'
import type { NexusCellUi } from '@/lib/production/nexus-mission-phases'
import {
  WorkbenchEmptyState,
  WorkbenchErrorState,
  WorkbenchLoadingState,
} from '@/components/ui/WorkbenchSurfaceStates'

const MonacoChatDiffPanel = dynamic(
  () => import('@aethel/ide-ui/MonacoChatDiffPanel').then((module) => module.MonacoChatDiffPanel),
  {
    ssr: false,
    loading: () => <WorkbenchLoadingState label="Loading Monaco comparator…" rows={3} />,
  }
)

interface PendingDiff {
  path: string
  oldContent: string
  newContent: string
}

interface AIChatOpsSidebarProps {
  showAdvancedControls: boolean
  opsTab: AIChatOpsTab
  onOpsTabChange: (tab: AIChatOpsTab) => void
  pendingDiff?: PendingDiff | null
  onAcceptDiff: (finalModified: string) => void | Promise<void>
  onRejectDiff: () => void
  projectId?: string
  defaultGoal: string
  latestEvidence?: AIChatEvidenceArtifact | null
  currentRunEstimate?: number
  /** CW6 — visible apply-deny honesty when governed apply fails closed */
  lastApplyDeny?: string | null
  /** CW6 — session apply receipts from real governed apply path */
  applyReceipts?: readonly GovernedApplyReceipt[]
  /** CW6 — Nexus cells for dependency edges on merge graph */
  nexusCells?: readonly NexusCellUi[]
}

export function AIChatOpsSidebar({
  showAdvancedControls,
  opsTab,
  onOpsTabChange,
  pendingDiff,
  onAcceptDiff,
  onRejectDiff,
  projectId,
  defaultGoal,
  latestEvidence,
  currentRunEstimate,
  lastApplyDeny = null,
  applyReceipts = [],
  nexusCells = [],
}: AIChatOpsSidebarProps) {
  const { approvalChanges, memories, addMemory, deleteMemory, updateMemory } = useAIChatOpsArtifacts({
    pendingDiff,
    projectId,
  })

  const handleApproveChanges = useCallback(
    (changes: AIChatApprovalChange[]) => {
      const change = changes[0]
      if (!change) return
      onAcceptDiff(change.newContent)
    },
    [onAcceptDiff]
  )

  const handleRejectChanges = useCallback(
    (changes: AIChatApprovalChange[]) => {
      if (changes.length === 0) return
      onRejectDiff()
    },
    [onRejectDiff]
  )

  const handleApproveSingleChange = useCallback(
    (change: AIChatApprovalChange) => {
      onAcceptDiff(change.newContent)
    },
    [onAcceptDiff]
  )

  const handleRejectSingleChange = useCallback(() => {
    onRejectDiff()
  }, [onRejectDiff])

  if (!showAdvancedControls) {
    return null
  }

  return (
    <aside className="flex w-80 flex-col border-l border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]">
      {lastApplyDeny ? (
        <div data-aethel-cw6="apply-deny-honesty" className="border-b border-[var(--aethel-border-secondary)]">
          <WorkbenchErrorState
            title="Apply blocked"
            description={`${lastApplyDeny} Nothing was written — fix the issue or reject the pending edit.`}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--aethel-border-secondary)] px-2 py-2">
        {OPS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onOpsTabChange(tab.id)}
            className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              opsTab === tab.id
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {opsTab === 'memory' && (
          <MemoryPanel
            memories={memories}
            onAdd={addMemory}
            onDelete={deleteMemory}
            onUpdate={updateMemory}
          />
        )}

        {opsTab === 'rules' && <AIChatRulesPanel projectId={projectId} />}

        {opsTab === 'evidence' && (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-[var(--aethel-border-secondary)] p-2">
              <MergeReceiptGraphStrip
                cells={nexusCells}
                applyReceipts={applyReceipts}
                className="mx-0"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <AgentEvidencePanel latestArtifact={latestEvidence} />
            </div>
          </div>
        )}

        {opsTab === 'economics' && (
          <AIChatEconomicsPanel
            projectId={projectId}
            currentRunEstimate={currentRunEstimate}
          />
        )}

        {opsTab === 'approval' && (
          <ApprovalCard
            changes={approvalChanges}
            onApprove={handleApproveChanges}
            onReject={handleRejectChanges}
            onApprovePartial={handleApproveSingleChange}
            onRejectPartial={handleRejectSingleChange}
          />
        )}

        {opsTab === 'diff' &&
          (pendingDiff ? (
            <MonacoChatDiffPanel
              filePath={pendingDiff.path}
              original={pendingDiff.oldContent}
              modified={pendingDiff.newContent}
              onAcceptAll={onAcceptDiff}
              onReject={onRejectDiff}
            />
          ) : (
            <WorkbenchEmptyState
              icon="diff"
              title="No pending diff"
              description='Use "Open diff" on an assistant code block to review a governed apply candidate.'
            />
          ))}

        {opsTab === 'execution' && <TaskOpsPanel projectId={projectId} defaultGoal={defaultGoal} />}
      </div>
    </aside>
  )
}
