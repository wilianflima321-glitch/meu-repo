'use client'

// @aethel-heavy-async-boundary IDE/Monaco diff surface; runtime is lazy-loaded from lib/editor.
import dynamic from 'next/dynamic'

import type { MonacoChatDiffPanelProps } from '@/lib/editor/MonacoChatDiffPanel.runtime'

export type { MonacoChatDiffPanelProps } from '@/lib/editor/MonacoChatDiffPanel.runtime'

const RuntimeMonacoChatDiffPanel = dynamic<MonacoChatDiffPanelProps>(
  () => import('@/lib/editor/MonacoChatDiffPanel.runtime').then((module) => module.MonacoChatDiffPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center text-[11px] text-[var(--aethel-text-tertiary)]">
        Loading diff...
      </div>
    ),
  },
)

export function MonacoChatDiffPanel(props: MonacoChatDiffPanelProps) {
  return <RuntimeMonacoChatDiffPanel {...props} />
}

export default MonacoChatDiffPanel
