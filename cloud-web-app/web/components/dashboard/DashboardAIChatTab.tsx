import type { ChatMessage, CopilotWorkflowSummary } from '@/lib/api'
import { CANONICAL_FOCUS, CANONICAL_MOTION, CANONICAL_SPACING, CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

import { AIThinkingPanel } from '../ai/AIThinkingPanel'
import AIProviderSetupGuide from '../ai/AIProviderSetupGuide'
import { EmptyState } from '../ui/EmptyState'
import { DashboardCopilotWorkflowBar } from './DashboardCopilotWorkflowBar'

type ChatMode = 'chat' | 'agent' | 'canvas'

type DashboardAIChatTabProps = {
  chatMode: ChatMode
  onChatModeChange: (mode: ChatMode) => void
  entryMission?: string | null
  chatHistory: ChatMessage[]
  chatMessage: string
  onChatMessageChange: (value: string) => void
  onSendChatMessage: () => void
  onStopStreaming?: () => void
  isStreaming: boolean
  activeWorkflowId: string | null
  copilotWorkflows: CopilotWorkflowSummary[]
  copilotWorkflowsLoading: boolean
  connectBusy: boolean
  connectFromWorkflowId: string
  onCreateWorkflow: () => void
  onSelectWorkflow: (workflowId: string) => void
  onRenameWorkflow: () => void
  onArchiveWorkflow: () => void
  onConnectFromWorkflowChange: (workflowId: string) => void
  onCopyHistory: () => void
  onImportContext: () => void
  onMergeWorkflow: () => void
  providerSetupGate?: {
    message: string
    capabilityStatus?: string
    setupUrl?: string
  } | null
  onOpenProviderSettings?: () => void
  onOpenProjects?: () => void
  onOpenIde?: () => void
}

const SESSION_PROMPTS = [
  {
    id: 'plan',
    label: 'Plan the stack',
    description: 'Turn the idea into scope, milestones and technical risk.',
    prompt:
      'Turn this mission into a technical plan with scope, stack, milestones, risk and definition of done.',
  },
  {
    id: 'research',
    label: 'Research the market',
    description: 'Compare competitors, target experience and product gaps.',
    prompt:
      'Research the strongest benchmark for this product, compare the main competitors and define our advantage.',
  },
  {
    id: 'build',
    label: 'Prepare the handoff',
    description: 'Leave with a briefing ready for Projects, Studio and preview.',
    prompt:
      'Consolidate an executable briefing that is ready for Projects, Studio and preview without losing continuity.',
  },
  {
    id: 'review',
    label: 'Review the current state',
    description: 'Critique what exists and call the next highest-leverage improvement.',
    prompt:
      'Review the current state with rigor, identify real risk and define the next block of work with highest impact.',
  },
] as const

const AGENT_PLAYBOOK = [
  {
    title: 'Research',
    description: 'Compare the market, consolidate evidence and close the strategy.',
    prompt: 'Research, compare and summarize the strongest benchmark for this mission.',
  },
  {
    title: 'Planner',
    description: 'Break the objective into backlog, phases and exit gates.',
    prompt: 'Break this mission into an executable backlog with phases, dependencies and exit criteria.',
  },
  {
    title: 'Builder',
    description: 'Prepare the handoff for Projects, Studio, preview and runtime.',
    prompt: 'Convert this mission into a handoff ready for Projects, Studio and preview.',
  },
  {
    title: 'Operator',
    description: 'Organize automation, runtime, observability and operational flow.',
    prompt: 'Define the operational and runtime steps needed to execute this mission without blind spots.',
  },
  {
    title: 'Reviewer',
    description: 'Critique UX, architecture and regression risk before the next move.',
    prompt: 'Critique this state with rigor, pointing out regression risk, inconsistency and the next improvement.',
  },
  {
    title: 'Asset Maker',
    description: 'Prepare docs, content, images and review surfaces for presentation.',
    prompt: 'Prepare the assets and supporting materials needed to present and validate this delivery.',
  },
] as const

const PAGE_CLASS = `${CANONICAL_SPACING.page.padding} space-y-6`
const PANEL_CLASS =
  'rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.16)]'
const INPUT_CLASS = `h-12 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const PRIMARY_BUTTON_CLASS = `inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_rgba(56,189,248,0.24)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const SECONDARY_BUTTON_CLASS = `inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const GHOST_BUTTON_CLASS = `inline-flex min-h-10 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const EMPTY_CANVAS_CLASS =
  'mx-auto max-w-xl rounded-2xl border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_16%,transparent)] px-4 py-4 text-xs text-[var(--aethel-text-secondary)]'

const MODE_META: Record<
  ChatMode,
  {
    label: string
    description: string
    eyebrow: string
  }
> = {
  chat: {
    label: 'Chat',
    eyebrow: 'Fast lane',
    description: 'Use the default lane when you need fast iteration with mission memory still attached.',
  },
  agent: {
    label: 'Agent',
    eyebrow: 'Delegation lane',
    description: 'Use explicit roles when the work benefits from structured delegation and auditable steps.',
  },
  canvas: {
    label: 'Canvas',
    eyebrow: 'Visual lane',
    description: 'Keep visual exploration light here and hand off to Studio when the artifact becomes primary.',
  },
}

function ModePill({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-4 py-2 text-sm font-medium border',
        CANONICAL_MOTION,
        CANONICAL_FOCUS,
        active
          ? 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[linear-gradient(135deg,rgba(79,70,229,0.35),rgba(14,165,233,0.2))] text-[var(--aethel-text-primary)]'
          : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

export function DashboardAIChatTab({
  chatMode,
  onChatModeChange,
  entryMission,
  chatHistory,
  chatMessage,
  onChatMessageChange,
  onSendChatMessage,
  onStopStreaming,
  isStreaming,
  activeWorkflowId,
  copilotWorkflows,
  copilotWorkflowsLoading,
  connectBusy,
  connectFromWorkflowId,
  onCreateWorkflow,
  onSelectWorkflow,
  onRenameWorkflow,
  onArchiveWorkflow,
  onConnectFromWorkflowChange,
  onCopyHistory,
  onImportContext,
  onMergeWorkflow,
  providerSetupGate,
  onOpenProviderSettings,
  onOpenProjects,
  onOpenIde,
}: DashboardAIChatTabProps) {
  const starterPrompt = entryMission || 'I want to create a SaaS app with dashboard, auth and a clean launch path.'
  const activeModeMeta = MODE_META[chatMode]

  return (
    <div className={PAGE_CLASS}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">AI Console</p>
          <h2 className={CANONICAL_TYPOGRAPHY.h1}>Turn mission context into an executable next move.</h2>
          <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
            Research, planning and orchestration stay here until the artifact needs deeper Studio focus.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ModePill active={chatMode === 'chat'} onClick={() => onChatModeChange('chat')} label="Chat" />
          <ModePill active={chatMode === 'agent'} onClick={() => onChatModeChange('agent')} label="Agent" />
          <ModePill active={chatMode === 'canvas'} onClick={() => onChatModeChange('canvas')} label="Canvas" />
        </div>
      </div>

      <section className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(8,47,73,0.18),rgba(15,23,42,0.7))] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">{activeModeMeta.eyebrow}</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
              Keep the mission moving without turning this into another product.
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {entryMission
                ? entryMission
                : 'Describe the task, align scope and keep the flow clean before handing off to Projects or Studio.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">
                Mode: {activeModeMeta.label}
              </span>
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1 text-xs text-[var(--aethel-info-light)]">
                Workflows: {copilotWorkflows.length}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => onChatMessageChange(starterPrompt)} className={SECONDARY_BUTTON_CLASS}>
              Load briefing
            </button>
            {onOpenProjects ? (
              <button type="button" onClick={onOpenProjects} className={GHOST_BUTTON_CLASS}>
                Open Projects
              </button>
            ) : null}
            {onOpenIde ? (
              <button type="button" onClick={onOpenIde} className={PRIMARY_BUTTON_CLASS}>
                Expand Studio
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Persistent context</p>
            <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">
              Mission, source and next move survive between surfaces.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Operational rail</p>
            <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{activeModeMeta.description}</p>
          </div>
          <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Clean handoff</p>
            <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">
              Projects, Studio and preview stay on one continuous path.
            </p>
          </div>
        </div>
      </section>

      <DashboardCopilotWorkflowBar
        activeWorkflowId={activeWorkflowId}
        copilotWorkflows={copilotWorkflows}
        copilotWorkflowsLoading={copilotWorkflowsLoading}
        connectBusy={connectBusy}
        connectFromWorkflowId={connectFromWorkflowId}
        onCreateWorkflow={onCreateWorkflow}
        onSelectWorkflow={onSelectWorkflow}
        onRenameWorkflow={onRenameWorkflow}
        onArchiveWorkflow={onArchiveWorkflow}
        onConnectFromWorkflowChange={onConnectFromWorkflowChange}
        onCopyHistory={onCopyHistory}
        onImportContext={onImportContext}
        onMergeWorkflow={onMergeWorkflow}
      />

      {providerSetupGate ? (
        <AIProviderSetupGuide
          source="dashboard"
          message={providerSetupGate.message}
          capabilityStatus={providerSetupGate.capabilityStatus}
          settingsHref={providerSetupGate.setupUrl}
          onOpenSettings={onOpenProviderSettings}
        />
      ) : null}

      {chatMode === 'chat' ? (
        <div className={`${PANEL_CLASS} mx-auto max-w-4xl`}>
          <div className="mb-4 text-sm text-[var(--aethel-text-secondary)]">{MODE_META.chat.description}</div>

          <div className="mb-6 grid gap-3 md:grid-cols-2">
            {SESSION_PROMPTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChatMessageChange(entryMission ? `${entryMission}\n\n${item.prompt}` : item.prompt)}
                className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-4 text-left transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)]"
              >
                <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{item.description}</p>
              </button>
            ))}
          </div>

          {chatHistory.length === 0 && !isStreaming ? (
            <div className="mb-6">
              <EmptyState
                title="Start the thread"
                description="Describe what you want to build, fix, research or operate. Aethel will answer with a plan and the next move."
                action={{
                  label: 'Use starter prompt',
                  onClick: () => onChatMessageChange(starterPrompt),
                }}
                secondaryAction={{
                  label: 'Show examples',
                  onClick: () => onChatMessageChange('Show a few strong prompt examples for this product flow.'),
                }}
              />
            </div>
          ) : null}

          <div className="mb-4 max-h-96 space-y-4 overflow-y-auto">
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`rounded-2xl border border-[var(--aethel-border-subtle)] px-4 py-3 ${
                  message.role === 'user'
                    ? 'ml-12 bg-[linear-gradient(135deg,rgba(59,130,246,0.22),rgba(14,165,233,0.12))]'
                    : 'mr-12 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]'
                }`}
              >
                <p className="mb-1 text-sm font-medium text-[var(--aethel-text-primary)]">
                  {message.role === 'user' ? 'You' : 'Aethel'}
                </p>
                <p className="text-sm text-[var(--aethel-text-secondary)]">{message.content}</p>
              </div>
            ))}
            {isStreaming ? <AIThinkingPanel isStreaming={isStreaming} position="floating" /> : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={chatMessage}
              onChange={(event) => onChatMessageChange(event.target.value)}
              disabled={isStreaming}
              aria-label="Message for the AI console"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSendChatMessage()
                }
              }}
              placeholder="Ask Aethel to build, research, fix or operate..."
              className={`${INPUT_CLASS} flex-1`}
            />
            <button
              type="button"
              onClick={onSendChatMessage}
              aria-label="Send message to the AI console"
              className={PRIMARY_BUTTON_CLASS}
              disabled={isStreaming || chatMessage.trim().length === 0}
            >
              {isStreaming ? 'Working...' : 'Send'}
            </button>
            {isStreaming && onStopStreaming ? (
              <button type="button" onClick={onStopStreaming} aria-label="Stop streaming response" className={GHOST_BUTTON_CLASS}>
                Stop
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {chatMode === 'agent' ? (
        <div className={`${PANEL_CLASS} mx-auto max-w-4xl`}>
          <div className="mb-4 text-sm text-[var(--aethel-text-secondary)]">{MODE_META.agent.description}</div>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AGENT_PLAYBOOK.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => onChatMessageChange(entryMission ? `${entryMission}\n\n${item.prompt}` : item.prompt)}
                aria-label={`Prepare ${item.title} agent prompt`}
                className={`${PANEL_CLASS} p-4 text-left hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`}
              >
                <h3 className="mb-2 font-semibold text-[var(--aethel-text-primary)]">{item.title}</h3>
                <p className="text-sm text-[var(--aethel-text-secondary)]">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={chatMessage}
              onChange={(event) => onChatMessageChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSendChatMessage()
                }
              }}
              placeholder="Describe the task for the agent lane..."
              aria-label="Message for agent mode"
              className={`${INPUT_CLASS} flex-1`}
            />
            <button type="button" onClick={onSendChatMessage} aria-label="Run the agent task" className={PRIMARY_BUTTON_CLASS}>
              Run agent
            </button>
          </div>
        </div>
      ) : null}

      {chatMode === 'canvas' ? (
        <div className={`${PANEL_CLASS} mx-auto max-w-6xl`}>
          <div className="mb-4 text-sm text-[var(--aethel-text-secondary)]">{MODE_META.canvas.description}</div>
          <div className="relative min-h-96 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-4">
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <button type="button" disabled className={`${GHOST_BUTTON_CLASS} text-xs opacity-60`} aria-label="Draw tool unavailable">
                Draw
              </button>
              <button type="button" disabled className={`${GHOST_BUTTON_CLASS} text-xs opacity-60`} aria-label="Shapes tool unavailable">
                Shapes
              </button>
              <button type="button" disabled className={`${GHOST_BUTTON_CLASS} text-xs opacity-60`} aria-label="Text tool unavailable">
                Text
              </button>
              <button type="button" disabled className={`${GHOST_BUTTON_CLASS} text-xs opacity-60`} aria-label="AI improve tool unavailable">
                Improve with AI
              </button>
            </div>
            <div className="py-32 text-center text-[var(--aethel-text-tertiary)]">
              <svg className="mx-auto mb-4 h-16 w-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <p className="mb-2 text-lg font-medium text-[var(--aethel-text-primary)]">Canvas stays lightweight here</p>
              <div className={EMPTY_CANVAS_CLASS}>
                <p className={`${CANONICAL_TYPOGRAPHY.label} mb-1 text-[var(--aethel-text-primary)]`}>
                  Capability status: partial
                </p>
                <p>Use Studio when the artifact needs deeper visual editing, review or viewport authority.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
