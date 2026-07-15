'use client'

/**
 * Block 7A.1 — virtualized console log body (5k+ rows).
 */

import { useCallback, useMemo, useState, type ReactNode, type UIEventHandler } from 'react'
import {
  computeVirtualWindow,
  CONSOLE_LOG_CAPACITY,
} from '../../web/lib/ui/virtual-window'

export const CONSOLE_ROW_HEIGHT = 28

export type VirtualConsoleLog = {
  id: string
  type: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
  stack?: string
}

type VirtualConsoleLogListProps = {
  logs: VirtualConsoleLog[]
  renderIcon: (type: VirtualConsoleLog['type']) => ReactNode
  colorClass: (type: VirtualConsoleLog['type']) => string
  renderMessage: (message: string) => ReactNode
  emptyLabel?: string
  maxHeightClassName?: string
}

export function VirtualConsoleLogList({
  logs,
  renderIcon,
  colorClass,
  renderMessage,
  emptyLabel = 'No logs yet',
  maxHeightClassName = 'max-h-48',
}: VirtualConsoleLogListProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(192)

  const onScroll = useCallback<UIEventHandler<HTMLDivElement>>((event) => {
    setScrollTop(event.currentTarget.scrollTop)
    setViewportHeight(event.currentTarget.clientHeight || 192)
  }, [])

  const windowed = useMemo(
    () =>
      computeVirtualWindow({
        itemCount: logs.length,
        itemHeight: CONSOLE_ROW_HEIGHT,
        scrollTop,
        viewportHeight,
        overscan: 6,
      }),
    [logs.length, scrollTop, viewportHeight],
  )

  const visibleLogs = useMemo(() => {
    if (logs.length === 0 || windowed.visibleCount === 0) return []
    return logs.slice(windowed.startIndex, windowed.endIndex + 1)
  }, [logs, windowed.endIndex, windowed.startIndex, windowed.visibleCount])

  if (logs.length === 0) {
    return (
      <div
        className={`flex flex-1 items-center justify-center overflow-auto p-3 font-mono text-xs text-[var(--aethel-text-tertiary)] ${maxHeightClassName}`}
      >
        {emptyLabel}
      </div>
    )
  }

  return (
    <div
      className={`flex-1 overflow-auto p-0 font-mono text-xs ${maxHeightClassName}`}
      onScroll={onScroll}
      data-console-capacity={CONSOLE_LOG_CAPACITY}
      data-console-count={logs.length}
    >
      <div style={{ height: windowed.totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: windowed.offsetTop, left: 0, right: 0 }}>
          {visibleLogs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-2 px-3 py-1 hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] ${colorClass(log.type)}`}
              style={{ height: CONSOLE_ROW_HEIGHT, minHeight: CONSOLE_ROW_HEIGHT }}
            >
              {renderIcon(log.type)}
              <div className="min-w-0 flex-1 truncate">
                <span className="mr-2 text-[10px] text-[var(--aethel-text-quaternary)]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="mr-2 font-medium">{log.type.toUpperCase()}</span>
                <span className="whitespace-pre-wrap break-all">{renderMessage(log.message)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VirtualConsoleLogList
