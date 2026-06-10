'use client'

import dynamic from 'next/dynamic'
import { useCallback } from 'react'
import { ApprovalCard } from '@/components/ide/ApprovalCard'
import { MemoryPanel } from '@/components/ide/MemoryPanel'
import { TaskOpsPanel } from '@/components/ide/TaskOpsPanel'
import { AIChatEconomicsPanel } from './AIChatEconomicsPanel'
import { AIChatEvidencePanel } from './AIChatEvidencePanel'
import { AIChatRulesPanel } from './AIChatRulesPanel'
import type { AIChatEvidenceArtifact } from './ai-chat-evidence'
import { OPS_TABS, type AIChatOpsTab } from '@/components/agents/chat/presets'
import { useAIChatOpsArtifacts, type AIChatApprovalChange } from './useAIChatOpsArtifacts'

const MonacoChatDiffPanel = dynamic(
  () => import('@/components/ide/MonacoChatDiffPanel').then((module) => module.MonacoChatDiffPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center text-[11px] text-[var(--aethel-text-tertiary)]">
        Loading Monaco comparator...
      </div>
    ),
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
  onAcceptDiff: (finalModified: string) => void
  onRejectDiff: () => void
  projectId?: string
  defaultGoal: string
  latestEvidence?: AIChatEvidenceArtifact | null
  currentRunEstimate?: number
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

        {opsTab === 'evidence' && <AIChatEvidencePanel latestArtifact={latestEvidence} />}

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
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 p-4 text-center text-[11px] text-[var(--aethel-text-tertiary)]">
              <p>No pending diff.</p>
              <p className="max-w-[240px] text-[var(--aethel-text-quaternary)]">
                Use &quot;Open diff&quot; on an assistant code block.
              </p>
            </div>
          ))}

        {opsTab === 'execution' && <TaskOpsPanel projectId={projectId} defaultGoal={defaultGoal} />}
      </div>
    </aside>
  )
}
