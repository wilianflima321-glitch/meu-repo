'use client'

import { ChatHistorySidebar, LiveModeIndicator } from '@/components/ide/AIChatPanelChrome'
import type { AIChatPanelProps } from '@/components/ide/AIChatPanelPro.types'

type AIChatHistoryModeRailProps = Pick<
  AIChatPanelProps,
  | 'activeThreadId'
  | 'isLiveMode'
  | 'liveStatus'
  | 'onArchiveThread'
  | 'onCreateThread'
  | 'onDeleteThread'
  | 'onSelectThread'
  | 'onToggleLiveMode'
  | 'threads'
> & {
  showHistorySidebar: boolean
  onCloseHistorySidebar: () => void
}

export function AIChatHistoryModeRail({
  activeThreadId,
  isLiveMode = false,
  liveStatus = 'idle',
  onArchiveThread,
  onCloseHistorySidebar,
  onCreateThread,
  onDeleteThread,
  onSelectThread,
  onToggleLiveMode,
  showHistorySidebar,
  threads = [],
}: AIChatHistoryModeRailProps) {
  const canRenderHistory =
    showHistorySidebar &&
    threads.length > 0 &&
    onSelectThread &&
    onCreateThread &&
    onArchiveThread &&
    onDeleteThread

  return (
    <>
      {canRenderHistory && (
        <ChatHistorySidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={onSelectThread}
          onCreateThread={onCreateThread}
          onArchiveThread={onArchiveThread}
          onDeleteThread={onDeleteThread}
          onClose={onCloseHistorySidebar}
        />
      )}

      {isLiveMode && onToggleLiveMode && (
        <LiveModeIndicator status={liveStatus} onEnd={onToggleLiveMode} />
      )}
    </>
  )
}
