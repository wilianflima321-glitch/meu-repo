'use client'

import { AgentsWorkspaceContainer, type AgentsWorkspaceContainerProps } from '@/components/agents'

export default function AIChatPanelContainer(props: AgentsWorkspaceContainerProps) {
  return (
    <section data-ai-cockpit-rail="compact" className="min-h-0">
      <p className="sr-only">
        Copilot Agents rail with scope locks, cost metered execution, and replay ready receipts.
      </p>
      <AgentsWorkspaceContainer {...props} />
    </section>
  )
}
